# GHL — retention nudge templates (active members)

The Retention cockpit (Staff Hub → Members → engagement view) sends these the SAME way as
the trial cockpit: the app POSTs a `template_key` to the existing **"Trial nurture — send"**
inbound-webhook workflow, which branches on `template_key` and sends the matching approved
WhatsApp template. So you only need to (1) create 4 approved templates and (2) add 4 branches
to that same workflow (use the chained-Condition-node trick if the current node is full).

No new webhook, Netlify env, or workflow — it reuses the trial-nurture pipe.

## Templates to create (WhatsApp Manager, English UK)

| template_key | Variables | Copy |
| --- | --- | --- |
| `retention_missed_you` | `{{1}}`=first name · `{{2}}`=coach note (optional) | Hey {{1}}, we've missed you at ETL lately! Life gets busy — I just wanted to check in. {{2}} Want me to help you get a session booked back in this week? Whatever's getting in the way, I'm here to help. |
| `retention_slipping` | `{{1}}`=first name · `{{2}}`=coach note (optional) | Hey {{1}}, not seen you quite as much lately — everything ok? {{2}} Anything I can do to help you get back into your groove? Happy to get a session booked in with you. |
| `retention_celebrate` | `{{1}}`=first name | {{1}}, loving seeing you in so consistently — brilliant work, it really does pay off. Keep that momentum rolling — proud of you! |
| `retention_pt_low` | `{{1}}`=first name · `{{2}}`=sessions remaining (app fills this automatically) | Hey {{1}}, quick heads up — you've got {{2}} PT sessions left before they reset. Want me to get them booked in so you don't lose them? Let me know what days suit. |
| `retention_app_try` | `{{1}}`=first name · `{{2}}`=coach note (optional) | Hey {{1}}, have you had a chance to dive into your training programmes in the ETL app yet? {{2}} There's a plan matched to your goals ready to go — want me to show you how to get started? Takes two minutes and it really does make a difference. |
| `retention_app_comeback` | `{{1}}`=first name · `{{2}}`=coach note (optional) | Hey {{1}}, you were flying with your app workouts for a while then things went quiet — everything ok? {{2}} Your programme's still there waiting. Want me to help you pick it back up, or switch you onto something fresh to reignite it? |

Notes:
- `retention_pt_low`'s `{{2}}` is the **remaining count** — the app sends it automatically (the
  coach doesn't type it). `missed_you` / `slipping` `{{2}}` is the coach's optional personal note
  (empty is fine). `celebrate` has **no `{{2}}`** — build it with only `{{1}}`.
- The app preview and the template wording must stay in sync — if you reword in GHL, tell me and
  I'll match the copy in `src/lib/retentionNurture.ts`.

## Workflow branches
In **"Trial nurture — send"**, add a branch per key above → **Send WhatsApp → the matching
template**, mapping the variables as in the table. If the current Condition node is at its branch
cap, add a new Condition node on its "none of the conditions met" path (same chaining as before).

## How members surface
- **Missed you** → 0 visits in the window (at-risk). **Slipping** → attendance dropping.
  **PT credits low** → PT member with ≤2 left and reset ≤10 days away. **Celebrate** → thriving/
  consistent. **Try the app** → signed in to the app but never logged a programme workout.
  **App drop-off** → logged app workouts before but none in the last 14 days. Steady members get
  nothing. (One touch per member, attendance taking priority over app usage.)
- Each has a cooldown (missed/slipping/pt 14d, celebrate 28d) and a 3-day "waiting for reply"
  hold after any send (clears on an inbound reply). Logged in `retention_touch_log`.
