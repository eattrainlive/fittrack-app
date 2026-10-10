# Builder brief — Accountability: make lesson videos clear + play in-app

**Why:** On the member week view (`WeekContentView`) and the dashboard lesson card (`Lesson.tsx`), the
week's resource videos render as small plain text links with a generic external-link icon — they don't
read as watchable videos, and they bounce the member out to a browser tab. Make them obvious video
items that play inside the app.

**Scope:** `WeekContentView.tsx` + `accDashboard/Lesson.tsx` only. No data/schema changes.

## What a "resource" is
`acc_week_content.resources` is `[{ title, url }]`. Most are videos (Vimeo/YouTube/Loom), some may be
non-video links (a template, a calculator, a live-call URL). Use the existing `getEmbedUrl(url)` from
`@/lib/accWeekContent` to decide: if it returns a non-null embed URL → treat as a **video**; otherwise
→ a plain link.

## 1. Video resources → clear, tappable video cards (both files)
For each resource that IS a video, render a tappable **row/card** (not a text link):
- A filled **play icon** (lime `PlayCircle`) on the left.
- The resource **title** (e.g. "Tue — Building your plate"), bold-ish.
- A small "Watch" affordance on the right (a chevron or "▶ Watch").
- Card styling: rounded, bordered, `bg-muted/40`, padding, hover/active state — looks like a video item.
- Group them under a small heading **"This week's videos"** when there's at least one.

Non-video resources keep a simpler link row (external-link icon, opens in a new tab) under a separate
"Resources" heading (or just below the videos).

## 2. Play in-app (don't open a browser tab)
Tapping a video card opens an **in-app dialog** (use `@/components/ui/dialog`) containing the embedded
player:
```tsx
<div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
  <iframe src={getEmbedUrl(url)} title={title} className="w-full h-full"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen />
</div>
```
Dialog title = the resource title. Closing returns to the page. (Keep a tiny "Open in new tab" link
inside the dialog as a fallback.)

## 3. Keep the main weekly video as-is
The big embedded `video_url` at the top (the week's main lesson) stays as the large inline player it
already is. Only the **resources** list changes. If `video_url` is empty (e.g. Week 0 until the app-tour
film is added), just show nothing there — no empty box.

## 4. Consistency
Make `WeekContentView` (pre-start / week pages) and `Lesson.tsx` (dashboard "This week's lesson" card)
use the same video-card + dialog treatment so it looks identical wherever lessons appear.

## Acceptance
1. Week-0 resources "Meet the scales" / "Your why" show as video cards with a play icon, under
   "This week's videos".
2. Tapping one opens an in-app player dialog; the video plays; closing returns to the page.
3. A non-video resource (if any) shows as a plain link, not a video card.
4. The main weekly video still plays inline at the top; no empty box when it's blank.
5. Same look on the dashboard lesson card and the week view.

**Deploy:** builder export → `scripts/merge-builder-export.py` → review → push.
