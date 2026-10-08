-- AI Programming v2 — Phase 1 setup. Run in Supabase. Idempotent where possible.
-- 1a needs only the tag columns + family key + variety caps. 1b adds pgvector embeddings.

-- ── 1a: tag columns (add any missing; the enrichment work already covers several) ──
alter table public.exercises
  add column if not exists movement_pattern   text,      -- squat|hinge|lunge|h_push|v_push|h_pull|v_pull|carry|core|isolation...
  add column if not exists plane               text,
  add column if not exists unilateral          boolean default false,
  add column if not exists primary_muscles     text[],
  add column if not exists secondary_muscles   text[],
  add column if not exists contraindications   text[],    -- e.g. {'shoulder','lower_back'}
  add column if not exists movement_family      text;      -- normalised key: glute bridge variants -> 'glute_bridge'

create index if not exists exercises_pattern_idx  on public.exercises (movement_pattern);
create index if not exists exercises_family_idx   on public.exercises (movement_family);

-- Helper: derive a normalised family key so the variety check can't be fooled by renamed variants.
-- (Run once to backfill; the app can also set movement_family on save. Extend the CASE as needed.)
update public.exercises set movement_family = case
  when name ilike '%glute bridge%'                              then 'glute_bridge'
  when name ilike '%hip thrust%'                                then 'hip_thrust'
  when name ilike '%single leg%rdl%' or name ilike '%sl rdl%'   then 'sl_rdl'
  when name ilike '%rdl%' or name ilike '%romanian%'            then 'rdl'
  when name ilike '%face pull%'                                 then 'face_pull'
  when name ilike '%tricep%'                                    then 'tricep_iso'
  else movement_family
end
where movement_family is null;

-- Variety caps (settings-driven; tune without a rebuild). Uses feature_settings (key/value jsonb).
insert into public.feature_settings (key, value) values (
  'variety_caps',
  '{"maxPerFamilyPerWeek": {"glute_bridge": 1, "hip_thrust": 2, "face_pull": 2, "default": 3},
    "maxSameIsolationPerSession": 1, "flagDuplicateExactAcrossWeek": true}'::jsonb
) on conflict (key) do nothing;

-- ── 1b: embeddings (pgvector) — run when you're ready for semantic ranking ──
create extension if not exists vector;
-- Dimension must match your embeddings model (e.g. 1536 for text-embedding-3-small). Adjust if different.
alter table public.exercises
  add column if not exists embedding vector(1536);

create index if not exists exercises_embedding_idx
  on public.exercises using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Semantic match RPC: nearest exercises to a query embedding, with optional hard filters applied by the caller.
create or replace function public.match_exercises(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (id text, name text, movement_pattern text, similarity float)
language sql stable as $$
  select e.id::text, e.name, e.movement_pattern,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.exercises e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

notify pgrst, 'reload schema';

-- CONFIG (not SQL): store the embeddings API key as a Supabase secret for the embed_exercises edge fn.
-- Then run embed_exercises once to backfill, and on any library change.
