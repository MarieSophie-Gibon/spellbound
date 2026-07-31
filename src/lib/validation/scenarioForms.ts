import { z } from "zod";

const scenarioSchema = z.object({
  title: z
    .string({ error: "Le titre est obligatoire" })
    .trim()
    .min(1, "Le titre est obligatoire")
    .max(120, "Le titre ne peut pas depasser 120 caracteres"),
  description: z
    .string()
    .trim()
    .max(1200, "Le synopsis ne peut pas depasser 1200 caracteres")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

const chapitreSchema = z.object({
  title: z
    .string({ error: "Le titre est obligatoire" })
    .trim()
    .min(1, "Le titre est obligatoire")
    .max(120, "Le titre ne peut pas depasser 120 caracteres"),
});

type ScenarioInput = {
  title: string;
  description?: string;
};

type ChapitreInput = {
  title: string;
};

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

export function validateScenarioForm(input: ScenarioInput): ValidationSuccess<{ title: string; description: string | null }> | ValidationFailure {
  const parsed = scenarioSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  return {
    success: true,
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    },
  };
}

export function validateChapitreForm(input: ChapitreInput): ValidationSuccess<{ title: string }> | ValidationFailure {
  const parsed = chapitreSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: firstIssueMessage(parsed.error) };
  }

  return {
    success: true,
    data: {
      title: parsed.data.title,
    },
  };
}
