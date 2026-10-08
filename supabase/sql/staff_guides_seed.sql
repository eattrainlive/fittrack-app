-- Seed starter staff guides. Run AFTER staff_guides.sql. Safe to re-run: it clears the seeded
-- rows by title first so you don't get duplicates (won't touch guides you write yourself with
-- other titles). Edit any of these in-app once they're loaded.

-- Dollar-quoted bodies ($g$...$g$) so apostrophes/markdown need no escaping.

delete from public.staff_guides where title in (
  'Welcome — how these guides work',
  'Inviting a member to the app',
  'How membership controls programme access',
  'When a member cancels or changes membership',
  'Importing your whole member roster',
  'Chasing members who aren''t on the app yet',
  'Using the check-in scanner',
  'Troubleshooting the check-in scanner',
  'Generating a weekly programme',
  'Setting the Workout of the Week',
  'Leaderboards'
);

insert into public.staff_guides (title, category, body, video_url, sort_order) values

('Welcome — how these guides work', 'Getting started', $g$
This is your staff-only knowledge base for running the app. Members never see this section — it's locked to staff accounts.

**Editing:** hit **Add guide** to write a new one, or **Edit** on any guide. Guides are grouped by **Category** (the folder name), so use a consistent category to keep things tidy.

**Adding a video:** paste a Loom or YouTube link into the Video field and it'll embed at the top of the guide. Great for quick screen-recordings of a workflow.
$g$, null, 0),

('Inviting a member to the app', 'Members & access', $g$
1. Go to **Staff Hub → Members**.
2. Find the person (search by name or email, or filter to **Not on app**).
3. Hit **Invite** on their card.

**What they receive:** the invite fires your GHL automation, which sends a **WhatsApp and an email** with a secure link. They tap it, set a password, and land in the app signed in. Their badge then flips to **On app**.

**Notes**
- If they already have an account, Invite won't re-send — it just re-applies their access.
- Anyone without a mobile on file only gets the email (that's expected).
- Links expire — if someone says theirs didn't work, just hit **Invite** again for a fresh one.
$g$, null, 1),

('How membership controls programme access', 'Members & access', $g$
Programme access is set **automatically from a member's membership type** — you don't pick streams by hand.

**Everyone gets:** Foundations, Stronger, Fusion, Performance.

**Group PT is added only for:**
- 30-day (PT) trial
- PT memberships

**No Group PT for:** the 21-for-£21 gym trial, Classes (Team Training), and gym memberships (Core+, Core, Open Gym, 24hr).

This is applied when you invite them and kept in sync as their membership changes.

**Manual override:** if you edit a member's streams by hand, they're marked **Manual override** and won't auto-update. Hit **Revert to membership** to put them back on automatic.
$g$, null, 2),

('When a member cancels or changes membership', 'Members & access', $g$
Membership changes come in automatically from GymOS/Quoox — you don't do anything manually.

**Upgrade / downgrade:** access re-syncs to the new membership. E.g. a PT client who drops to Classes automatically loses Group PT; someone moving up gains the extra stream.

**Cancellation:** they keep access during a short grace period, then the app shows them a **"Membership inactive"** screen instead of blocking or deleting anything. Their history and data are kept, so if they rejoin, access restores automatically.

**Paused/frozen:** they keep access while paused.

Coach-side, cancelled members still show in the Members grid (with their status) so you can run win-backs.
$g$, null, 3),

('Importing your whole member roster', 'Members & access', $g$
You can import every member into the system so their **gym usage tracks** even before they're on the app.

- Imported members appear in the Members grid with their membership and an **On app / Invited / Not on app** badge.
- Their scans and bookings track against them regardless of whether they've joined the app.
- Nothing is "activated" until they accept an invite — so importing is safe and doesn't spam anyone.
$g$, null, 4),

('Chasing members who aren''t on the app yet', 'Members & access', $g$
1. Staff Hub → Members → filter to **Not on app**.
2. You'll see the count ("X of Y on the app") and everyone still to onboard.
3. Hit **Invite** (or **Reinvite** for someone invited but not joined) per person, or bulk-invite the filtered list.

The badge flips to **On app** automatically once they sign in — no need to mark it yourself.
$g$, null, 5),

('Using the check-in scanner', 'Check-in kiosk', $g$
The reception tablet scans a member's QR to log their visit.

- Members show their **check-in QR** from their app.
- The Eyoyo scanner (or the tablet camera) reads it; the screen shows a **green / amber / red** result.
- Booked sessions (PT/classes) are matched automatically; otherwise it logs as an open-gym visit.

**Scanner hardware:** run the Eyoyo on battery during check-ins — if it plays up, check the charging cable first (a dodgy cable causes intermittent drop-outs). Keep a spare cable at the desk.
$g$, null, 6),

('Troubleshooting the check-in scanner', 'Check-in kiosk', $g$
**Nothing happens when I scan:**
1. Test the scanner into a plain **Notes** app on the tablet — if the barcode doesn't type there, it's the scanner, not the app.
2. Check the scanner is **connected** in the tablet's Bluetooth settings (it drops pairing sometimes).
3. Make sure it's in **HID / keyboard mode** and **instant upload** mode, not storage mode (see the Eyoyo manual's setup barcodes).
4. If it beeps but nothing types, it's usually the connection or the wrong mode. No beep = charge it.

**Camera scanner won't read (iPad/Safari):** the tablet camera reader needs Chrome on Android; on iPad Safari use the hardware scanner. Camera only works on the live site with camera permission allowed.
$g$, null, 7),

('Generating a weekly programme', 'Programming', $g$
Use the AI generator in the Programmes area to build a week for a stream (Foundations, Stronger, Fusion, Performance, Group PT).

- Pick the stream and days per week; the generator lays out the sessions to that stream's recipe.
- Review the draft, tweak any exercises, then save. Weeks repeat in sequence through the block.
- Exercises pull from your library — if something doesn't match the library it's flagged so you can fix the name.
$g$, null, 8),

('Setting the Workout of the Week', 'Programming', $g$
The Workout of the Week is the featured session members see on their home screen.

- Create/select the workout and mark it as the featured week.
- Engine/conditioning blocks can be flagged for the **leaderboard** so members' scores rank.
- Members reach the Leaderboards page from the Workout-of-the-Week card.
$g$, null, 9),

('Leaderboards', 'Engagement', $g$
Leaderboards rank member scores on flagged conditioning blocks (e.g. Performance engine days).

- A block shows on the leaderboard when it's flagged as a leaderboard block.
- Scores are logged when members complete the block (reps / rounds / time), and ranked best-first.
- The consolidated **Leaderboards** page collects them together for members to browse.
$g$, null, 10);

notify pgrst, 'reload schema';
