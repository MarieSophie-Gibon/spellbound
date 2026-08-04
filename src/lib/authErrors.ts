type MaybeError = { message?: string | null } | null | undefined;

export function isRateLimitError(error: MaybeError): boolean {
  const message = String(error?.message ?? "");
  return /rate\s*limit|too\s*many\s*requests/i.test(message);
}

export function mapAuthErrorMessage(error: MaybeError, fallback: string): string {
  const message = String(error?.message ?? "").trim();
  return message || fallback;
}

export function mapRecoveryHashErrorMessage(errorCode: string | null, errorDescription: string | null): string {
  if (errorCode === "otp_expired") {
    return "Ce lien de réinitialisation est expiré ou déjà utilisé. Demandez-en un nouveau.";
  }

  const decodedDescription = (errorDescription ?? "").replace(/\+/g, " ").trim();
  return decodedDescription || "Le lien de réinitialisation est invalide.";
}
