import { describe, expect, it } from "vitest";
import { validateChapitreForm, validateScenarioForm } from "@/lib/validation/scenarioForms";

describe("scenarioForms validation", () => {
  it("rejects empty scenario title", () => {
    const result = validateScenarioForm({ title: "   ", description: "ok" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/titre/i);
    }
  });

  it("trims and accepts valid scenario form", () => {
    const result = validateScenarioForm({ title: "  Scenario 1  ", description: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Scenario 1");
      expect(result.data.description).toBeNull();
    }
  });

  it("rejects too long scenario title", () => {
    const result = validateScenarioForm({ title: "x".repeat(121), description: "desc" });
    expect(result.success).toBe(false);
  });

  it("rejects empty chapitre title", () => {
    const result = validateChapitreForm({ title: "" });
    expect(result.success).toBe(false);
  });

  it("trims and accepts valid chapitre title", () => {
    const result = validateChapitreForm({ title: "  Prologue  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Prologue");
    }
  });
});
