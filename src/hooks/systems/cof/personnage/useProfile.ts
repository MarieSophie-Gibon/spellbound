import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/useAuthStore";

function normalizeProfileRole(value: unknown): "super_admin" | null {
  const raw = String(value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return raw === "super_admin" ? "super_admin" : null;
}

export function useProfile() {
  const { session } = useAuthStore();
  const [refreshTick, setRefreshTick] = useState(0);
  const [profile, setProfile] = useState<{
    pseudo: string;
    role: "super_admin" | null;
  } | null>(null);

  useEffect(() => {
    const onProfileUpdated = () => setRefreshTick((v) => v + 1);
    window.addEventListener("spellbound:profile-updated", onProfileUpdated);
    return () => window.removeEventListener("spellbound:profile-updated", onProfileUpdated);
  }, []);

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
          role: useAuthStore.getState().isSuperAdmin ? "super_admin" : null,
        });
        return;
      }

      setProfile({
        ...data,
        role: normalizeProfileRole(data.role),
      });
    }

    getProfile();
  }, [session, refreshTick]);

  return profile;
}
