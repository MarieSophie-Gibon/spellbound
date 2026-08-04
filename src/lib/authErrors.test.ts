import { describe, expect, it } from "vitest";
import { isRateLimitError, mapAuthErrorMessage, mapRecoveryHashErrorMessage } from "@/lib/authErrors";

describe("authErrors", () => {
  it("detecte les messages rate limit", () => {
    expect(isRateLimitError({ message: "Rate limit exceeded" })).toBe(true);
    expect(isRateLimitError({ message: "too many requests" })).toBe(true);
    expect(isRateLimitError({ message: "invalid login" })).toBe(false);
  });

  it("retourne un fallback quand le message est vide", () => {
    expect(mapAuthErrorMessage({ message: "" }, "Erreur inconnue")).toBe("Erreur inconnue");
    expect(mapAuthErrorMessage(null, "Erreur inconnue")).toBe("Erreur inconnue");
  });

  it("mappe les erreurs hash recovery", () => {
    expect(mapRecoveryHashErrorMessage("otp_expired", null)).toContain("expiré");
    expect(mapRecoveryHashErrorMessage(null, "Invalid+token")).toBe("Invalid token");
  });
});
