-- Per-member actual pricing + funding, loaded from the ETL member-pricing export.
-- People on the same plan pay different amounts (discounts, legacy/founder rates, £0 funded),
-- so revenue must come from each member's real fee, not a plan list price. Joined by email.
alter table public.gym_members
  add column if not exists monthly_fee numeric,          -- actual £/month this member pays (NULL = unknown; 0 is a REAL price)
  add column if not exists is_paying boolean,            -- from the file; a £0 funded member is not "paying" on their own row
  add column if not exists zero_price_reason text,       -- why £0 (partner_paid, annual_prepaid, complimentary, staff, …)
  add column if not exists payer_email text,             -- someone else pays (links to another member)
  add column if not exists payment_route text,           -- gocardless / stripe / cash / etc.
  add column if not exists prepaid_renews_month text,    -- 'YYYY-MM' when a year-up-front runs out
  add column if not exists price_category text,          -- PT / Classes / Gym / Legacy (from the file)
  add column if not exists pricing_source text,          -- 'etl_pricing_file' once loaded from the export
  add column if not exists pricing_updated_at timestamptz,
  add column if not exists needs_review boolean not null default false;  -- in app but absent from the latest file

create index if not exists gym_members_payer_email_idx on public.gym_members(lower(payer_email)) where payer_email is not null;

notify pgrst, 'reload schema';
