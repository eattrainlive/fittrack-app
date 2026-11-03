-- Seed Carla's training guides into staff_guides, grouped into sections.
-- video_url is left NULL — edit each guide in the app and paste the Loom/YouTube
-- link once you've recorded it. Re-runnable: skips any guide that already exists
-- (same title + category), so it won't duplicate or overwrite your video links.

-- Helper pattern: insert only if not already present.
insert into public.staff_guides (title, category, body, sort_order, video_url)
select v.title, v.category, v.body, v.sort_order, null
from (values
  -- ── Trialist nurture ──────────────────────────────────────────────────────
  ($t$The board & the six tabs$t$, $c$Trialist nurture$c$, $b$# The board & the six tabs

**Goal:** understand the cockpit and how to read it.

Read the tabs left to right as a pipeline:
- **Due now** — action today
- **Waiting for reply** — already messaged, give them space
- **In the funnel** — in the drip, nothing due yet
- **Joined** — signed up
- **Parked** — moved out by hand (reversible)
- **Lost** — gone, with a reason

On each card: name, **D9/21** (day 9 of a 21-day trial), the step label, the **OVERDUE/DUE** chip, flags like **Hot lead** / **Review not booked**, and the activity line (classes · scans · workouts).

**Takeaway:** your job each day is to clear the Due now tab, top to bottom.$b$, 1),

  ($t$Sending the suggested message$t$, $c$Trialist nurture$c$, $b$# Sending the suggested message

**Goal:** send the right message in a few taps.

1. Open a **Due now** card.
2. The **suggested** template is pre-selected — approved copy, you can''t edit it.
3. Add a **coach note** if there''s a slot (the personal bit). Watch the "Sends as" preview update.
4. Tap **Send WhatsApp**. Look for "Sent ✓".

**Takeaway:** the template is fixed and approved — your note is the personal touch.$b$, 2),

  ($t$Choosing a different message$t$, $c$Trialist nurture$c$, $b$# Choosing a different message

**Goal:** override the suggestion when it doesn''t fit.

- On a card, open the template dropdown / **Browse all**.
- Pick any step. The suggested one is tagged, but you decide.

**Takeaway:** the suggestion is a starting point — you''re in charge.$b$, 3),

  ($t$Waiting for reply$t$, $c$Trialist nurture$c$, $b$# Waiting for reply

**Goal:** know why people disappear after you message them.

- After you send, they move to the **Waiting for reply** tab for **3 days**.
- If they reply, they come straight back so you can respond.
- If 3 days pass with no reply, they return to Due now.

**Takeaway:** if someone''s not in Due now, check Waiting — you''ve probably just messaged them.$b$, 4),

  ($t$The "Check first" no-reply nudge$t$, $c$Trialist nurture$c$, $b$# The "Check first" no-reply nudge

**Goal:** use the gentle chase correctly.

- Some cards show an amber **Check first** chip and a **"No reply to your last message"** banner.
- This appears when someone didn''t reply and there''s nothing else to send.
- **Only send it if you haven''t already spoken to them in the gym.** If you have, leave it.

**Takeaway:** this one always needs a human check — don''t send it on autopilot.$b$, 5),

  ($t$Recording the outcome: Won / Lost / Move out$t$, $c$Trialist nurture$c$, $b$# Recording the outcome

**Goal:** keep the list clean and the numbers right.

On a card, use the **Outcome** row:
- **Won** → moves them to Joined.
- **Lost** → pick a reason (Price / Timing / etc.); counts against conversions.
- **Move out** → removes them from the list but doesn''t count as a loss, and is reversible.

**Takeaway:** Won and Lost are decisions. Move out just means "stop showing me this one."$b$, 6),

  ($t$Parked & Lost tabs$t$, $c$Trialist nurture$c$, $b$# Parked & Lost tabs

**Goal:** undo a mistake or review history.

- **Parked** tab → **Bring back** returns them to the list.
- **Lost** tab → shows the date + reason on each; **Restore** puts them back.

**Takeaway:** nothing''s ever truly gone — you can always bring someone back.$b$, 7),

  -- ── Member management ─────────────────────────────────────────────────────
  ($t$Opening a member & reading their activity$t$, $c$Member management$c$, $b$# Opening a member & reading their activity

**Goal:** check how engaged someone is.

1. Open a member and tap **View Activity**.
2. **This month** — classes / gym visits / sessions logged.
3. **3-month breakdown** and **rolling 90 days** (streak, lifted, etc.).

**Takeaway:** this tells you at a glance whether they''re actually turning up.$b$, 1),

  ($t$Setting or resetting a password$t$, $c$Member management$c$, $b$# Setting or resetting a password

**Goal:** get a stuck member logged in.

1. In the member drawer, tap **Set / reset password**.
2. Tap **Generate** (makes a readable one), then **Copy**, then **Save**.
3. Give it to the member — they log in with their email, then change it in their profile.

Only works for members with an app account.

**Takeaway:** use this when someone can''t do the email reset themselves.$b$, 2),

  ($t$Macros & food diary (optional)$t$, $c$Member management$c$, $b$# Macros & food diary

**Goal:** view or adjust a member''s targets.

- In the member drawer, open the macro targets (grams / %) and the food diary.
- Changes here are the coach override.

Only relevant if nutrition is part of your role.$b$, 3),

  -- ── Reviews & bookings ────────────────────────────────────────────────────
  ($t$"Review not booked" + booking the review$t$, $c$Reviews & bookings$c$, $b$# "Review not booked" + booking the review

**Goal:** get trial reviews in the diary at the right time.

- Near the end of a trial, cards show a **Review not booked** flag.
- Send the message that carries the booking link (the "Trial ending soon" / review step) to invite them to book.

**Takeaway:** the review is where trials convert — this flag is your prompt to chase it.$b$, 1),

  ($t$Seeing who''s booked$t$, $c$Reviews & bookings$c$, $b$# Seeing who''s booked

**Goal:** know who''s coming in.

- Once a member books, the **Review not booked** flag clears.
- Check the upcoming reviews list / calendar to see who''s in.

**Takeaway:** once it''s booked, the flag clears and you''ll see them here.$b$, 2)
) as v(title, category, body, sort_order)
where not exists (
  select 1 from public.staff_guides g
  where g.title = v.title and g.category = v.category
);

notify pgrst, 'reload schema';
