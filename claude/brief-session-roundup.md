# Builder brief — Session Roundup card (post-workout, shareable)

Bring back the fun **session roundup** that shows after a member logs a workout: total volume lifted,
the "you lifted X 🐘 Baby Elephants" comparison, and any PBs — as a branded card they can **share to
the community feed and to socials (Instagram/Facebook)**. All the pieces exist; this reassembles them.

## When it shows
After a workout is saved. The log sheet already does the work — in `AdLibLogSheet.tsx` `saveWorkout()`
(~line 349) it runs `detectAndSavePBs(realExercises)` and calls `onPBs(pbs)`. Extend that moment:
instead of only a PB modal, open a **Session Roundup modal** with the full card (PBs included). (Do the
same wherever else a planned workout is logged, if there's a second save path.)

## What's on the card
Compute from the sets just logged (weight × reps, summed across all sets/exercises):
1. **Total volume** — e.g. "You moved **4,250 kg** today".
2. **Fun comparison** — from `REWARD_ITEMS` in `src/lib/workoutConstants.tsx` (each has
   `{ weight, name, plural, emoji }`, e.g. Car Tire 15kg 🛞, Baby Elephant 100kg 🐘, Rhinoceros 2000kg
   🦏, School Bus 10000kg 🚌). Pick the **largest item whose weight ≤ total volume**, count =
   `Math.floor(volume / item.weight)`, and show "That's **42 🐘 Baby Elephants**!" (use plural when >1).
   If volume is below the smallest item, fall back to the smallest.
3. **PBs this session** — the array returned by `detectAndSavePBs` (passed via `onPBs`): list each
   exercise + new best (e.g. "🏆 New PB — Deadlift 100 kg"). Omit the section if none.
4. Small stats line: exercises, total sets, (duration if available).
Keep it visual and celebratory — this is a share asset. Brand it (ETL colours/logo).

## Sharing — reuse the proven pattern
The share-to-image flow already exists in `MemberProgressHub.tsx` (`handleShareRecap`): a hidden
branded card is rendered to PNG with `html-to-image`'s `toPng`, turned into a `File`, and shared via
`navigator.share({ files:[file] })` with a download fallback. Mirror it here:

- **Share to socials** button → `toPng(cardRef)` → `File` → `navigator.share({ files, text })` (opens
  the native share sheet → Instagram/Facebook/WhatsApp/etc.); if `navigator.canShare` is unsupported,
  download the PNG so they can post it manually.
- **Share to community feed** button → render the same card to a PNG, upload it to the community image
  bucket (reuse whatever path existing community-post images use), then
  `createPost(caption, imageUrl)` from `src/lib/communityWall.ts` (signature: `createPost(body,
  imageUrl)`). Caption e.g. "Smashed a session 💪 4,250 kg — 42 Baby Elephants!". Toast "Shared to the
  community ✓".

## Reuse (don't rebuild)
- `REWARD_ITEMS` (comparison data) — `workoutConstants.tsx`.
- `detectAndSavePBs` → `onPBs(pbs)` — already wired in `AdLibLogSheet.tsx`.
- `handleShareRecap` / `RecapCard` toPng + `navigator.share` pattern — `MemberProgressHub.tsx`.
- `createPost(body, imageUrl)` — `communityWall.ts`.

## Notes
- No new tables or SQL.
- Make the two share buttons optional actions on the modal, plus a "Done/Close". Don't block closing.
- Volume is just moved weight (weight × reps × sets); bodyweight/time-tracked exercises contribute 0 to
  volume — that's fine, they still count toward the stats line.
- Keep it lightweight and fast to render so it pops up instantly after a save.
