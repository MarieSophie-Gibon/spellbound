import { z } from "zod";

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  error: string;
};

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message || "Donnees invalides";
}

const emailSchema = z
  .string({ error: "L'email est obligatoire" })
  .trim()
  .toLowerCase()
  .email("L'email est invalide")
  .max(254, "L'email est trop long");

const passwordSchema = z
  .string({ error: "Le mot de passe est obligatoire" })
  .min(6, "Le mot de passe doit contenir au moins 6 caracteres")
  .max(72, "Le mot de passe est trop long");

const pseudoSchema = z
  .string({ error: "Le pseudo est obligatoire" })
  .trim()
  .min(2, "Le pseudo doit contenir au moins 2 caracteres")
  .max(40, "Le pseudo ne peut pas depasser 40 caracteres");

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Le mot de passe est obligatoire"),
});

const forgotSchema = z.object({
  email: emailSchema,
});

const resetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string({ error: "Confirmez le mot de passe" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "La confirmation du mot de passe ne correspond pas.",
    path: ["confirmPassword"],
  });

const signupSchema = z
  .object({
    pseudo: pseudoSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: "Confirmez le mot de passe" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "La confirmation du mot de passe ne correspond pas.",
    path: ["confirmPassword"],
  });

export function validateLoginForm(input: { email: string; password: string }): ValidationSuccess<{ email: string; password: string }> | ValidationFailure {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export function validateForgotForm(input: { email: string }): ValidationSuccess<{ email: string }> | ValidationFailure {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export function validateResetForm(input: { password: string; confirmPassword: string }): ValidationSuccess<{ password: string }> | ValidationFailure {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  return { success: true, data: { password: parsed.data.password } };
}

export function validateSignupForm(input: {
  pseudo: string;
  email: string;
  password: string;
  confirmPassword: string;
}): ValidationSuccess<{ pseudo: string; email: string; password: string }> | ValidationFailure {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  return {
    success: true,
    data: {
      pseudo: parsed.data.pseudo,
      email: parsed.data.email,
      password: parsed.data.password,
    },
  };
}
