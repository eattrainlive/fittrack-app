-- Defence in depth: user_settings must be owner-scoped so one user can never read/write another's
-- rows (active_program etc.). The real fix is client-side (load per-user, clear on logout), but this
-- guarantees it server-side too. Safe to re-run.

alter table public.user_settings enable row level security;

drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
