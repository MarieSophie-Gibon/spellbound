import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

export function useProfile() {
  const { session } = useAuthStore();
  const [profile, setProfile] = useState<{
    pseudo: string;
    role: "joueur" | "mj";
  } | null>(null);

  useEffect(() => {
    // Si l'utilisateur n'est pas connecté, on ne fait rien
    if (!session?.user?.id) return;

    async function getProfile() {
      // On interroge notre nouvelle table "utilisateurs"
      const { data } = await supabase
        .from("utilisateurs")
        .select("pseudo, role")
        .eq("id", session?.user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    }

    getProfile();
  }, [session]);

  return profile;
}
