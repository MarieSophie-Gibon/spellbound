import { describe, expect, it } from "vitest";
import { validateForgotForm, validateLoginForm, validateResetForm, validateSignupForm } from "@/lib/validation/authForms";

describe("authForms validation", () => {
  it("rejects invalid email for login", () => {
    const result = validateLoginForm({ email: "bad", password: "abcdef" });
    expect(result.success).toBe(false);
  });

  it("accepts valid login form and normalizes email", () => {
    const result = validateLoginForm({ email: "  TEST@MAIL.COM ", password: "abcdef" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@mail.com");
    }
  });

  it("rejects signup password mismatch", () => {
    const result = validateSignupForm({
      pseudo: "Mage",
      email: "mage@mail.com",
      password: "abcdef",
      confirmPassword: "abcdeg",
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak reset password", () => {
    const result = validateResetForm({ password: "abc", confirmPassword: "abc" });
    expect(result.success).toBe(false);
  });

  it("accepts forgot email", () => {
    const result = validateForgotForm({ email: "hello@mail.com" });
    expect(result.success).toBe(true);
  });
});
