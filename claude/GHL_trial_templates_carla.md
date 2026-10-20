# Trial nurture — GHL WhatsApp templates (Carla's copy)

Paste one message per `template_key` into the GHL trial-nurture workflow (the branch that
matches that key). Merge fields:
- `{{contact.first_name}}` — the client's first name (where the app shows `{name}`). If your
  GHL first-name token is different, swap it here.
- `{{contact.coach_note}}` — the coach's edited note from the cockpit. The workflow sets the
  **Coach Note** contact field from the incoming `coach_note` before sending. If a coach sends
  without a note, this merges to blank (just leaves a gap).

The `template_key` strings MUST match exactly — the workflow branches on them.

---

## 1. `trial_welcome` — Day 1 (auto-fires from the trial start, not the cockpit)

NOTE: no coach note on this one — it auto-sends, so there's no `{{contact.coach_note}}` merge field.

Hi {{contact.first_name}}, welcome to Eat Train Live. Firstly thank you so much for choosing us — we're really looking forward to getting you where you need to be.

Make sure you check out the education area in the coaching section on the FitTrack app, as it has everything you need to know for getting started.

Have you had chance to look over the classes yet? If I can help you choose your first class, just shout up.

---

## 2. `trial_post_first` — Day 3 (after 1st session)

Hey {{contact.first_name}}, how did your first session go? Feeling a bit sore? It's very common to feel a few aches afterwards, so try not to be put off — it's totally normal. It can also feel a lot to take in at first and a little overwhelming. Just remember, all you need to do is rock up with your drink and leave the rest to us. You've done the hardest part by walking through those doors. Well done!

{{contact.coach_note}}

---

## 3. `trial_week1` — Day 7 (week 1 win)

One week in, {{contact.first_name}} — brilliant work getting started.

{{contact.coach_note}}

This week we build on it. Keep the sessions coming and you'll really start to feel it.

---

## 4. `trial_momentum` — Day 10 (if attending)

Hi {{contact.first_name}}, loving the consistency! This is exactly how results are built.

{{contact.coach_note}}

Keep that streak rolling. What session are you in for next?

---

## 5. `trial_reengage` — Day 10 (if gone quiet)

Hey {{contact.first_name}}, not seen you in a few days — everything ok?

{{contact.coach_note}}

Let's get your next session booked and pick it straight back up.

---

## 6. `trial_halfway` — Day 14 (halfway check)

Hi {{contact.first_name}}, halfway through already — how are you feeling about your sessions so far?

{{contact.coach_note}}

Fancy a trial review? I can book you in to come down for a quick chat and pop you on the Evolt body scanner again. If not, I'm free to call you if that works better?

---

## 7. `trial_results_review` — Day 21 (book results review)

Hi {{contact.first_name}}, you've put the work in, and it shows.

{{contact.coach_note}}

Let's sit down and look at your results properly. When suits you for a review this week? You can pop in or I can call you?

---

## 8. `trial_ending_soon` — Day 25 (trial ending soon)

Heyyyy {{contact.first_name}}, so your trial is up in a few days.

{{contact.coach_note}}

We hope you've enjoyed your time with us! I can book you in for a review to go over some membership options — just open the link to book whatever day/time works for you.

---

## 9. `trial_decision` — Day 28 (decision / last chance)

Last few days of your trial, {{contact.first_name}}.

{{contact.coach_note}}

Shall we get you set up before it ends so you don't lose your progress? I can book you in for a review — is there a day/time that works for you?

---

## Notes
- These match the app's cockpit preview (`src/lib/trialNurture.ts`) exactly. If Carla tweaks the
  wording, change it in BOTH places so the coach preview and the sent message stay in sync.
- WhatsApp templates sent outside the 24-hour window must be approved templates. Submit these for
  approval in GHL if required; within the 24h window free-text is allowed.
- Step 2 has no mid-message note slot (it's one flowing message), so `{{contact.coach_note}}` sits
  at the end — the coach can still add a line if they want, otherwise it's blank.
