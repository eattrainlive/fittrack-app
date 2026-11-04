-- Let a member resolve their OWN membership via the member-link, not just by
-- email — so the credits card (and anything else) shows the right plan even when
-- the Quoox membership email differs from the app login email.
--   1) a member can read their own member_links row (user_id = auth.uid())
--   2) a member can read the gym_members roster row they're linked to
-- Staff policies are unchanged. Run once in the Supabase SQL editor.

drop policy if exists member_links_read_own on public.member_links;
create policy member_links_read_own on public.member_links
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists gym_members_read_linked on public.gym_members;
create policy gym_members_read_linked on public.gym_members
  for select to authenticated
  using (
    id in (select member_id from public.member_links where user_id = auth.uid())
  );

notify pgrst, 'reload schema';
