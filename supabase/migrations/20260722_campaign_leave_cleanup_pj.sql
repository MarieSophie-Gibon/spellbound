-- Ensure leaving a campaign also removes the player's linked PJ row.
-- Covers both schemas: pj.user_id and legacy pj.player_id.

create or replace function public.cleanup_pj_on_campaign_member_delete()
returns trigger
language plpgsql
as $$
begin
  delete from public.pj
  where campaign_id = old.campaign_id
    and (user_id = old.user_id or player_id = old.user_id);

  return old;
end;
$$;

drop trigger if exists trg_cleanup_pj_on_campaign_member_delete on public.campaign_members;

create trigger trg_cleanup_pj_on_campaign_member_delete
after delete on public.campaign_members
for each row
execute function public.cleanup_pj_on_campaign_member_delete();
