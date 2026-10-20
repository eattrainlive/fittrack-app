# Trial nurture — GHL / WhatsApp approved templates (Carla's copy)

WhatsApp approved templates use **positional** placeholders, numbered in order of appearance:
- `{{1}}` = the client's first name (where the app shows `{name}`).
- `{{2}}` = the coach's note from the cockpit (the editable line). Map it to the **Coach Note**
  contact field (`coach_note`) when you set the template's variables in GHL.

So in every template: `{{1}}` is the first name, `{{2}}` is the coach note. The Welcome has only
`{{1}}` (it auto-sends, no coach note).

The `template_key` strings MUST match exactly — the GHL workflow branches on them.

> WhatsApp tip: templates can't start or end with a variable and can't have two variables
> back-to-back — these are all fine on that front. Submit each for approval in WhatsApp Manager /
> GHL, then map {{1}} → first name and {{2}} → Coach Note.

---

## 1. `trial_welcome` — Day 1 (auto-fires from the trial start, not the cockpit)

NOTE: no coach note on this one — only `{{1}}`.

Hi {{1}}, welcome to Eat Train Live. Firstly thank you so much for choosing us — we're really looking forward to getting you where you need to be.

Make sure you check out the education area in the coaching section on the FitTrack app, as it has everything you need to know for getting started.

Have you had chance to look over the classes yet? If I can help you choose your first class, just shout up.

I'll be your point of contact over the next few weeks, so fire over any questions.
Carla

---

## 2. `trial_post_first` — Day 3 (after 1st session)

NOTE: no coach note on this one — only `{{1}}`.

Hey {{1}}, how did your first session go? Feeling a bit sore? It's very common to feel a few aches afterwards, so try not to be put off — it's totally normal. It can also feel a lot to take in at first and a little overwhelming. Just remember, all you need to do is rock up with your drink and leave the rest to us. You've done the hardest part by walking through those doors. Well done!

Carla
ETL

---

## 3. `trial_week1` — Day 7 (week 1 win)

One week in, {{1}} — brilliant work getting started.

{{2}}

This week we build on it. Keep the sessions coming and you'll really start to feel it.

---

## 4. `trial_momentum` — Day 10 (if attending)

Hi {{1}}, loving the consistency! This is exactly how results are built.

{{2}}

Keep that streak rolling. What session are you in for next?

---

## 5. `trial_reengage` — Day 10 (if gone quiet)

Hey {{1}}, not seen you in a few days — everything ok?

{{2}}

Let's get your next session booked and pick it straight back up.

---

## 6. `trial_halfway` — Day 14 (halfway check)

Hi {{1}}, halfway through already — how are you feeling about your sessions so far?

{{2}}

Fancy a trial review? I can book you in to come down for a quick chat and pop you on the Evolt body scanner again. If not, I'm free to call you if that works better?

---

## 7. `trial_results_review` — Day 21 (book results review)

Hi {{1}}, you've put the work in, and it shows.

{{2}}

Let's sit down and look at your results properly. When suits you for a review this week? You can pop in or I can call you?

---

## 8. `trial_ending_soon` — Day 25 (trial ending soon)

Heyyyy {{1}}, so your trial is up in a few days.

{{2}}

We hope you've enjoyed your time with us! I can book you in for a review to go over some membership options — just open the link to book whatever day/time works for you.

https://api.leadconnectorhq.com/widget/bookings/trial-reviews

Any issues let me know.

---

## 9. `trial_decision` — Day 28 (decision / last chance)

NOTE: no coach note on this one — only `{{1}}`.

Hey {{1}}, we haven't had you in for your trial review yet.

Shall we get you set up before it ends so you don't lose your progress? I can book you in, is there a day/time that works for you?

---

## Notes
- Variable map for every template: `{{1}}` → contact first name, `{{2}}` → Coach Note (`coach_note`).
- These match the app's cockpit preview (`src/lib/trialNurture.ts`), which shows `{name}` and the
  coach note inline. If Carla tweaks wording, change it in BOTH places so the preview and the sent
  message stay in sync.
- Step 2 has no mid-message note slot (one flowing message), so `{{2}}` sits at the end — the coach
  can still add a line, otherwise map it so an empty note sends cleanly.
- If a coach sends without typing a note, make sure the Coach Note field is cleared/handled so `{{2}}`
  doesn't carry a previous value — set Coach Note = incoming `coach_note` on every run before sending.
