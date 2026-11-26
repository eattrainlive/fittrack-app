# FitTrack multi-tenant — Phase 1 (foundations)

**Goal of the whole project:** serve several gyms from one FitTrack app. Each gym is a
theme-swapped skin of the same codebase; you onboard one by inserting a config row, not cloning a
stack. v1 scope for partner gyms = **content + engagement** (programmes, challenges, nutrition,
habits, check-ins, leaderboards, workout tracking). The **retention / KPI / finance backend stays
with PT Genius**, so those tables are out of the v1 tenant scope (they remain ETL-only for now).

**Decisions locked:** multi-tenant single app · theme swap (one PWA, per-gym branding) · PT Genius
owns the business layer.

---

## The tenancy model in one picture

- A new table `gyms` is the tenant. Each row = one gym, carrying its **branding** (logo, colours,
  app name, domain) and **feature flags**.
- Every logged-in user is either a **member** (`members`) or **staff** (`staff_users`); both already
  key off `auth.uid()`. We add `gym_id` to those two tables — that's what ties a *person* to a gym.
- A helper `current_gym_id()` resolves the logged-in user → their gym. Every tenant-scoped table
  later gets an RLS policy of the form `gym_id = current_gym_id()`, which is the isolation guarantee.
- Each tenant-scoped **data** table gets its own `gym_id` column (so queries and RLS are cheap and a
  bug can't leak gym A's rows to gym B).

Phase 1 ships **only the rails** — `gyms`, `gym_id` on the two identity tables, the helper, and ETL
seeded as tenant #1. It changes nothing a member or coach sees. The per-table `gym_id` rollout and
the RLS flip come after, deliberately, so isolation is turned on once and tested hard.

File: `supabase/sql/tenant_phase1_foundations.sql` (safe/additive — run anytime).

---

## Table inventory — how each of the ~90 tables is treated

### A. Identity & config — the backbone (Phase 1 + 1b)
`members`, `staff_users` → **gym_id now** (Phase 1). `gym_members` (GymOS roster), `member_links`
→ gym_id next. `feature_settings` → make **per-gym** (composite key `gym_id + key`) so each gym
toggles its own challenge/branding; note this touches the `xmas-challenge` function which reads it.

### B. Global shared library — NO gym_id (your IP, shared across gyms)
`exercise_enrichment`, `foods` (generic staples), the programme **stream templates** behind the
generator, base `habits` / `checklist_templates`. These are the content you supply to every gym.
(Later a gym can *override/extend* these with its own rows carrying a gym_id — "global default +
per-gym custom" — but that's a later refinement, not Phase 1.)

### C. Content & engagement — the v1 product (needs gym_id)
Programmes/workouts: `programme_history`, `programme_chats`, `workout_history`, `custom_workouts`,
`block_scores`, `personal_records`, `workout_of_week`, `wow_results`.
Challenges/engagement: `xmas_raffle`, `erg_challenge_logs`, `scan_events`, `fob_entries`,
`evolt_scans`, `member_habits`, `habit_checkins`, `checklist_log`, `wellness_tracks`.
Nutrition (per member): `food_diary`, `macro_logs`, `member_macros`, `member_nutrition`,
`saved_meal_plans`, `stream_recipes` (if per-gym).
Member profile: `member_goals`, `member_measurements`, `member_photos`, `member_emails`, `par_q`,
`coaching_preferences`, `trial_goals`.
Community: `community_posts`, `community_comments`, `community_reactions`, `community_events`,
`community_event_rsvps`.
Content/resources: `resources`, `resource_sections`, `content_posts`.
→ All get `gym_id` (defaulting 'etl'), mostly derivable via the owning member but stamped directly
for clean RLS. This is the bulk of the Phase 2 rollout.

### D. Staff hub / ops — gym_id, lower priority for v1
`staff_reminders`, `staff_announcements`, `staff_events`, `staff_guides`, `staff_supplies`,
`coach_notes`, `staff_trial_stage`, `equipment_faults`. Each gym's staff see their own; only needed
when partner gyms get a staff hub.

### E. Out of v1 tenant scope → PT Genius / ETL-only (gym_id later, not now)
Retention/CRM: `member_flags`, `member_messages`, `retention_touch_log`, `trial_cohort`,
`trial_nurture_log`, `trial_outcomes`, `trial_week_content`, `review_bookings`, `member_bookings`,
`membership_status_history`, `payment_events`, `payment_flags`, `flag_rules`, `newsletters`, `won`,
`staff_contact_progress`.
Finance: `bank_transactions`, `tax_pot`, `revenue_plans`, `transaction_categories`,
`transaction_rules`, `membership_plan_prices`, `import_batches`.
Accountability programme: `acc_*` (8 tables).
→ These stay ETL-only. They keep working for ETL; other gyms simply don't use them. They get gym_id
if/when that functionality is ever offered beyond ETL.

### F. System — no gym_id (or special handling)
`app_events`, `app_settings`, `error_log`. `webhook_log` stays global **but** inbound GymOS/other
webhooks will need to resolve which gym they belong to (per-gym webhook key or URL) — a Phase 3
concern tied to the retention layer, so not a v1 problem.

---

## Rollout order (so isolation is turned on safely, once)

1. **Phase 1 (this file):** `gyms` + `gym_id` on `members`/`staff_users` + `current_gym_id()` + ETL
   seed. No RLS change. Invisible to users. ← do + verify first.
2. **Phase 1b:** branding config wired into the app (theme reads `gyms.branding`); de-hardcode "ETL"
   / colours / app name out of the code. feature_settings → per-gym.
3. **Phase 2:** add `gym_id` (default 'etl') to every table in groups C (and D), backfilled to ETL.
   Still no RLS flip — purely additive.
4. **Phase 2b:** flip RLS on those tables to `gym_id = current_gym_id()`; stamp gym_id on insert in
   the app/edge functions; **test cross-tenant isolation hard** (a gym-B user must see zero gym-A
   rows). This is the one genuinely risky step — do it behind a second test tenant before any real
   gym's members exist.
5. **Phase 3+ (later / PT Genius seam):** retention, finance, webhooks per gym.

---

## Risks & gotchas to keep in mind
- **Edge functions use the service-role key** (bypasses RLS). Every function that writes member data
  must set `gym_id` explicitly — RLS won't protect you there. Audit each function in Phase 2b.
- **feature_settings PK change** (key → gym_id+key) touches the xmas-challenge function; do it with
  that function's redeploy.
- **gym_members is keyed by a text id** from GymOS; its gym_id comes from the import/webhook source,
  not a member login — handle when the retention layer goes multi-tenant (Phase 3).
- **Generators** (programme/challenge AI) are shared code; they must write their output rows with the
  requesting user's `current_gym_id()`.
- **Open question for Barrie:** the data seam between FitTrack and PT Genius — how PT Genius reads
  engagement/activity out to drive KPIs & retention (API vs shared read vs export). Settle before
  Phase 3.
