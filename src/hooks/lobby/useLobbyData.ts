import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface SaveLobbyProfileParams {
  userId: string;
  pseudo: string;
  email: string;
  currentEmail?: string | null;
  password?: string;
}

interface SaveLobbyProfileResult {
  emailChanged: boolean;
}

export function useLobbyData() {
  const uploadCampaignImage = useCallback(async (imageFile: File): Promise<string> => {
    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `campagnes/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("compendium")
      .upload(path, imageFile, { upsert: true });

    if (uploadError) {
      throw new Error("Erreur lors de l'upload de l'image");
    }

    const { data } = supabase.storage.from("compendium").getPublicUrl(path);
    return data.publicUrl;
  }, []);

  const saveLobbyProfile = useCallback(async ({
    userId,
    pseudo,
    email,
    currentEmail,
    password,
  }: SaveLobbyProfileParams): Promise<SaveLobbyProfileResult> => {
    const { error: profileError } = await supabase
      .from("utilisateurs")
      .upsert(
        { id: userId, pseudo },
        { onConflict: "id" }
      );

    if (profileError) {
      throw profileError;
    }

    const normalizedCurrentEmail = (currentEmail ?? "").toLowerCase();
    const emailChanged = email !== normalizedCurrentEmail;
    const authPatch: { email?: string; password?: string } = {};
    if (emailChanged) authPatch.email = email;
    if (password) authPatch.password = password;

    if (Object.keys(authPatch).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authPatch);
      if (authError) {
        throw authError;
      }
    }

    window.dispatchEvent(new CustomEvent("spellbound:profile-updated"));
    return { emailChanged };
  }, []);

  return {
    uploadCampaignImage,
    saveLobbyProfile,
  };
}
