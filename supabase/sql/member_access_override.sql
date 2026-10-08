-- Manual access override flag on the app member row.
-- When TRUE, the GymOS webhook will NOT recompute this member's allowed_access from their
-- membership — a coach has set it by hand and it should stick. When FALSE (default), access
-- follows membership type automatically (upgrades add streams, downgrades remove them).
alter table public.members add column if not exists access_override boolean not null default false;

notify pgrst, 'reload schema';
