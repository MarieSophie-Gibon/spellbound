alter table public.campagnes
add column if not exists active_combat_chapitre_id uuid;

alter table public.campagnes
drop constraint if exists campagnes_active_combat_chapitre_id_fkey;

alter table public.campagnes
add constraint campagnes_active_combat_chapitre_id_fkey
foreign key (active_combat_chapitre_id)
references public.chapitres(id)
on delete set null;
