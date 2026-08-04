import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface SignUpParams {
  email: string;
  password: string;
  pseudo: string;
}

export function useAuthData() {
  const requestPasswordReset = useCallback(async (email: string, redirectTo: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error };
  }, []);

  const updateUserPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithPassword = useCallback(async ({ email, password, pseudo }: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          pseudo,
          role: "player",
        },
      },
    });

    return { data, error };
  }, []);

  const upsertUserProfile = useCallback(async (id: string, pseudo: string) => {
    const { error } = await supabase.from("utilisateurs").upsert({
      id,
      pseudo,
      role: "joueur",
    });

    return { error };
  }, []);

  return useMemo(
    () => ({
      requestPasswordReset,
      updateUserPassword,
      signInWithPassword,
      signUpWithPassword,
      upsertUserProfile,
    }),
    [requestPasswordReset, updateUserPassword, signInWithPassword, signUpWithPassword, upsertUserProfile]
  );
}
