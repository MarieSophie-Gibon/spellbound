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

const campaignSchema = z.object({
  nom: z
    .string({ error: "Le nom de la campagne est obligatoire" })
    .trim()
    .min(1, "Le nom de la campagne est obligatoire")
    .max(120, "Le nom ne peut pas depasser 120 caracteres"),
  description: z
    .string()
    .trim()
    .max(2000, "La description ne peut pas depasser 2000 caracteres")
    .optional()
    .transform((value) => value ?? ""),
});

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateCampaignForm(input: { nom: string; description?: string }): ValidationSuccess<{ nom: string; description: string }> | ValidationFailure {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }
  return { success: true, data: parsed.data };
}

export function validateCampaignImage(file: { type?: string; size?: number; name?: string } | null): ValidationSuccess<null> | ValidationFailure {
  if (!file) {
    return { success: true, data: null };
  }

  const type = file.type || "";
  const size = typeof file.size === "number" ? file.size : 0;

  if (!type.startsWith("image/")) {
    return { success: false, error: "Le fichier doit etre une image" };
  }

  if (size > MAX_UPLOAD_BYTES) {
    return { success: false, error: "L'image depasse la limite de 5 Mo" };
  }

  return { success: true, data: null };
}
