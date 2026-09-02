-- ============================================================
-- Migration: Fix handle_new_user() after role constraint change
--
-- Context:
--   Migration 20260820000002 restricted utilisateurs.role to
--   NULL or 'super_admin', but handle_new_user() (trigger on
--   auth.users AFTER INSERT) still inserted role = 'joueur'.
--   This violates utilisateurs_role_check and makes every new
--   signup fail with "Database error saving new user".
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  INSERT INTO public.utilisateurs (id, pseudo, role)
  VALUES (new.id, split_part(new.email, '@', 1), NULL);
  RETURN new;
END;
$function$;
