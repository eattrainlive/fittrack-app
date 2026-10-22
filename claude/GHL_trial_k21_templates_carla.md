# 21-Day Kickstart nurture — GHL / WhatsApp approved templates (Carla's copy)

Companion to `GHL_trial_templates_carla.md` (the 30-day coached set). These are the **21-day
Kickstart** (gym / £21) templates — mostly gym-only members, so the copy leans on scanning in,
classes and the app programmes rather than coached sessions.

WhatsApp approved templates use **positional** placeholders, numbered in order of appearance:
- `{{1}}` = the client's first name (where the app shows `{name}`).
- `{{2}}` = the coach's note from the cockpit (the editable line). Map it to the **Coach Note**
  contact field (`coach_note`) when you set the template's variables in GHL.

The `template_key` strings MUST match exactly — the GHL workflow branches on them. All Kickstart
keys are prefixed `trial_k21_` so they never clash with the 30-day keys.

> WhatsApp tip: a template can't start or end with a variable, and can't have two variables
> back-to-back. All of these are fine on that front. Submit each for approval in WhatsApp Manager /
> GHL, then map {{1}} → first name and {{2}} → Coach Note.

---

## 1. `trial_k21_welcome` — Day 1 (auto-fires from the trial start, not the cockpit)

NOTE: no coach note on this one — only `{{1}}`.

Hi {{1}}, welcome to your 21-day Kickstart at Eat Train Live! So glad to have you.

Pop in whenever suits — just scan in at the door. Check the education area in the app for how to get started, and give me a shout if you want pointing in the right direction.

Carla
ETL

---

## 2. `trial_k21_post_first` — after 1st visit (fires ~Day 3 / off their first session)

NOTE: no coach note on this one — only `{{1}}`.

Hey {{1}}, how did your first one go? Any aches or questions, just shout — totally normal to feel it at first. You've made the hardest step by getting in.

Carla
ETL

---

## 3. `trial_k21_try_class` — Day 5 (try a class)

Hey {{1}}, are there any classes you fancy trying while you're with us?

{{2}}

They're a great way to mix it up and meet people — I can get you booked onto one, just let me know what takes your fancy and when suits.

---

## 4. `trial_k21_momentum` — Day 7 (if getting in / active)

Week one down, {{1}} — loving seeing you getting stuck in!

{{2}}

Is there anything in particular you need any help with?

---

## 5. `trial_k21_reengage` — Day 7 (if not been in / gone quiet)

Hey {{1}}, not seen you in much — everything ok?

{{2}}

What day works and I'll make sure someone's there to help you out?

---

## 6. `trial_k21_app_workout` — Day 8 (only if no app workout logged)

NOTE: no coach note on this one — only `{{1}}`.

Hey {{1}}, noticed you've not tried any of our workouts in the app yet.

There's loads in there you can follow along with in the gym, they are a great way to know exactly what to do. Want me to point you to a good one to start with?

---

## 7. `trial_k21_pt_taster` — Day 9 (PT taster credit offer)

NOTE: no coach note on this one — only `{{1}}`.

Hey {{1}}, fancy trying a group PT session while you're with us?

I can pop a group PT taster credit on your account so you can give it a go with the team... no cost, just a chance to see what it's like. Want me to set it up?

---

## 8. `trial_k21_mid` — Day 11 (mid-trial check)

Over halfway through your Kickstart, {{1}}

{{2}}

Just shout up if I can help at all

---

## 9. `trial_k21_ending_soon` — Day 19 (Kickstart ending soon)

Heyyyy {{1}}, your 21 days are nearly up!

{{2}}

We'd love to keep you going — I can talk you through the membership options whenever suits.

---

## 10. `trial_k21_decision` — Day 21 (decision / last chance)

NOTE: no coach note on this one — only `{{1}}`.

We haven't got your membership set up yet {{1}}. Shall we get you set up so you don't lose the momentum? Is there a day/time that works for a quick chat? Or you can book a slot here

https://api.leadconnectorhq.com/widget/bookings/trial-reviews

---

## Notes
- Variable map for every template: `{{1}}` → contact first name, `{{2}}` → Coach Note (`coach_note`).
- Templates 1, 2, 6, 7 and 10 have **no** coach note (only `{{1}}`) — build them in GHL with NO `{{2}}`
  variable (an empty `{{2}}` makes WhatsApp reject the send). The rest use `{{2}}` = Coach Note.
- (Legacy note) welcome auto-fires, post-first is one
  flowing message, decision is a short direct ask.
- `trial_k21_momentum` (4) and `trial_k21_reengage` (5) are the Day-7 behaviour pair — only one fires
  per person (active vs quiet), same as the 30-day momentum/reengage branch.
- `trial_k21_app_workout` (6) only surfaces for a Kickstarter who has logged **zero** app workouts; it
  drops off their list automatically once they log one.
- These mirror the app's cockpit preview (`KICKSTART21_STEPS` in `src/lib/trialNurture.ts`). If Carla
  tweaks wording, change it in BOTH places so the preview and the sent message stay in sync.
- If a coach sends without typing a note, clear/handle the Coach Note field so `{{2}}` doesn't carry a
  previous value — set Coach Note = incoming `coach_note` on every run before sending.
