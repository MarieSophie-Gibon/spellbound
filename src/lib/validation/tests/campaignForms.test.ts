import { describe, expect, it } from "vitest";
import { validateCampaignForm, validateCampaignImage } from "@/lib/validation/campaignForms";

describe("campaignForms validation", () => {
  it("rejects empty campaign name", () => {
    const result = validateCampaignForm({ nom: "   ", description: "desc" });
    expect(result.success).toBe(false);
  });

  it("accepts valid campaign data", () => {
    const result = validateCampaignForm({ nom: "  Heritiers  ", description: "  intro  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nom).toBe("Heritiers");
      expect(result.data.description).toBe("intro");
    }
  });

  it("rejects non-image upload", () => {
    const result = validateCampaignImage({ type: "text/plain", size: 10 });
    expect(result.success).toBe(false);
  });

  it("rejects too large image", () => {
    const result = validateCampaignImage({ type: "image/png", size: 6 * 1024 * 1024 });
    expect(result.success).toBe(false);
  });

  it("accepts valid image upload", () => {
    const result = validateCampaignImage({ type: "image/png", size: 1024 });
    expect(result.success).toBe(true);
  });
});
