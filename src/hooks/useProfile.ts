import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

function normalizeProfileRole(value: unknown): "joueur" | "mj" {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");

  if (raw === "mj" || raw === "gm" || raw === "dm" || raw === "admin" || raw === "maitredujeu") {
    return "mj";
  }

  return "joueur";
}

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
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("pseudo, role")
        .eq("id", session?.user.id)
        .maybeSingle();

      // Profil absent/inaccessible (RLS): on garde un fallback local sans bruit console.
      if (error || !data) {
        setProfile({
          pseudo: session?.user?.user_metadata?.pseudo ?? session?.user?.email?.split("@")[0] ?? "Voyageur",
          role: useAuthStore.getState().role === "mj" ? "mj" : "joueur",
        });
        return;
      }

      setProfile({
        ...data,
        role: normalizeProfileRole(data.role),
      });
    }

    getProfile();
  }, [session]);

  return profile;
}
