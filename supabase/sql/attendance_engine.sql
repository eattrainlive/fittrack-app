-- FitTrack — Attendance engine: scan capture tables, member QR tokens, and the
-- baseline-relative at-risk flagging function + weekly schedule.
-- Assumes gym_members already exists (from gymos_webhook_phase2.sql). Run in Supabase SQL editor.

create extension if not exists pgcrypto;   -- gen_random_uuid
create extension if not exists pg_cron;

-- ── Member scan identity ─────────────────────────────────────────────────────
-- Primary = the member's existing GYMOS BARCODE (learned on first scan, no upload needed).
-- Also keep an optional FitTrack QR token as a fallback for members without a barcode/app.
alter table public.gym_members add column if not exists barcode text;      -- the GymOS barcode value
alter table public.gym_members add column if not exists scan_token text;   -- optional FitTrack QR fallback
alter table public.gym_members add column if not exists auth_uid uuid;
update public.gym_members set scan_token = gen_random_uuid()::text where scan_token is null;
create unique index if not exists gym_members_barcode_uq on public.gym_members(barcode) where barcode is not null;
create unique index if not exists gym_members_scan_token_uq on public.gym_members(scan_token);

-- ── Scan events (RAW — one row per scan; server stamps the authoritative ts) ─
create table if not exists public.scan_events (
  id         text primary key,                     -- device-generated (idempotent)
  member_ref text references public.gym_members(id) on delete set null,
  ts         timestamptz not null default now(),   -- AUTHORITATIVE time
  device_ts  timestamptz,                          -- what the device thought (drift check)
  site       text not null,                        -- 'main' | 'unit_1b'
  result     text not null default 'granted'
               check (result in ('granted','denied_lapsed','unknown_code')),
  raw_code   text,
  device_id  text,
  excluded   boolean default false,                -- staff can void a bad/test scan
  created_at timestamptz default now()
);
create index if not exists scan_member_ts_idx on public.scan_events(member_ref, ts desc);
create index if not exists scan_ts_idx on public.scan_events(ts desc);

-- ── Configurable flag rules (edit in-app, no developer) ──────────────────────
create table if not exists public.flag_rules (
  id                  bigserial primary key,
  name                text not null,
  product             text default 'all',          -- 'all' or a specific membershipPlan
  baseline_weeks      int  default 10,
  recent_weeks        int  default 3,
  drop_pct            numeric default 0.5,          -- flag if recent freq drops >= this vs baseline
  min_baseline_visits int  default 6,
  tenure_grace_days   int  default 90,
  enabled             boolean default true,
  updated_at          timestamptz default now()
);
-- seed a sensible default (add per-plan rules later using your real plan names)
insert into public.flag_rules (name, product, baseline_weeks, recent_weeks, drop_pct, min_baseline_visits, tenure_grace_days)
select 'Default — attendance drop', 'all', 10, 3, 0.5, 6, 90
where not exists (select 1 from public.flag_rules);

-- ── Member flags (weekly output + manual overrides that persist) ─────────────
create table if not exists public.member_flags (
  id            bigserial primary key,
  member_ref    text not null references public.gym_members(id) on delete cascade,
  week_of       date not null,
  flag_type     text,                              -- 'attendance_drop' | 'new_joiner_noshow'
  severity      text default 'watch',              -- watch | at_risk | urgent
  baseline_per_wk numeric, recent_per_wk numeric,
  reason        text,
  status        text default 'open' check (status in ('open','overridden','resolved')),
  override_note text, overridden_by uuid, overridden_at timestamptz,
  created_at    timestamptz default now(),
  unique (member_ref, week_of, flag_type)
);
create index if not exists member_flags_week_idx on public.member_flags(week_of desc, severity);

-- ── RLS: staff module (signed-in). Scan tablet writes scan_events as a staff session. ──
do $$ declare t text; begin
  foreach t in array array['scan_events','flag_rules','member_flags'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_staff on public.%I;', t, t);
    execute format('create policy %I_staff on public.%I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- ── The flagging engine: flag members vs THEIR OWN baseline ──────────────────
-- A "visit" = a day with at least one granted scan. Only ACTIVE members are flagged
-- (paused/cancelled excluded). New joiners (within tenure grace) use a no-show rule.
-- Manual overrides are preserved across re-runs.
create or replace function public.compute_member_flags(p_week_of date default (date_trunc('week', now())::date))
returns void language plpgsql security definer as $$
declare
  r record; m record;
  base_start date; base_end date; rec_start date; rec_end date;
  base_visits int; rec_visits int; base_pw numeric; rec_pw numeric;
  ftype text; sev text; reason text;
begin
  for r in select * from public.flag_rules where enabled loop
    rec_end   := p_week_of;
    rec_start := p_week_of - (r.recent_weeks   * 7);
    base_end  := rec_start;
    base_start:= rec_start - (r.baseline_weeks * 7);

    for m in
      select gm.id, gm.joined_on
      from public.gym_members gm
      where gm.status = 'active'
        and (r.product = 'all' or gm.product = r.product)
    loop
      select count(distinct (se.ts)::date) into base_visits
        from public.scan_events se
        where se.member_ref = m.id and se.result = 'granted' and coalesce(se.excluded,false) = false
          and se.ts >= base_start and se.ts < base_end;
      select count(distinct (se.ts)::date) into rec_visits
        from public.scan_events se
        where se.member_ref = m.id and se.result = 'granted' and coalesce(se.excluded,false) = false
          and se.ts >= rec_start and se.ts < rec_end;

      base_pw := base_visits::numeric / greatest(r.baseline_weeks, 1);
      rec_pw  := rec_visits::numeric  / greatest(r.recent_weeks, 1);
      ftype := null; sev := null; reason := null;

      if m.joined_on is not null and m.joined_on > (p_week_of - r.tenure_grace_days) then
        if rec_visits = 0 then
          ftype := 'new_joiner_noshow'; sev := 'at_risk';
          reason := 'New joiner — no visits in last ' || r.recent_weeks || ' wks';
        end if;
      else
        if base_visits >= r.min_baseline_visits and rec_pw <= base_pw * (1 - r.drop_pct) then
          ftype := 'attendance_drop';
          if rec_pw = 0 then sev := 'urgent';
          elsif rec_pw <= base_pw * 0.25 then sev := 'at_risk';
          else sev := 'watch'; end if;
          reason := 'Down to ' || round(rec_pw,1) || '/wk from ' || round(base_pw,1) || '/wk baseline';
        end if;
      end if;

      if ftype is not null then
        insert into public.member_flags
          (member_ref, week_of, flag_type, severity, baseline_per_wk, recent_per_wk, reason)
        values (m.id, p_week_of, ftype, sev, round(base_pw,2), round(rec_pw,2), reason)
        on conflict (member_ref, week_of, flag_type) do update
          set severity = excluded.severity, baseline_per_wk = excluded.baseline_per_wk,
              recent_per_wk = excluded.recent_per_wk, reason = excluded.reason
          where member_flags.status <> 'overridden';   -- never clobber a manual override
      end if;
    end loop;
  end loop;
end $$;

-- Run every Monday 06:00 (UTC). Also runnable on demand: select public.compute_member_flags();
select cron.schedule('weekly-atrisk-flags', '0 6 * * 1', $$ select public.compute_member_flags(); $$);
