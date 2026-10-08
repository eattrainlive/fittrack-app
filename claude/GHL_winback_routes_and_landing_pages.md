# Win back — GHL routing + landing pages

The Staff Hub now sends the win-back route with each WhatsApp fire. When a coach hits the WhatsApp
step on a **Win back** card, the app posts to the same GHL inbound webhook as before, but for lapsed
members it also includes:

```
"list_type": "lapsed",
"route": "gym" | "coached",      // gym = Gym/Core+   ·   coached = Classes/PT/Group PT
"membership": "<their old plan>",
"category": "<their old category>"
```

So one webhook feeds everything; GHL branches on `list_type` then `route`, and sends **a WhatsApp +
an email** with the landing page link that matches their old membership.

## Build the branches in your existing workflow
In the "Staff Hub — Reach-out WhatsApp" workflow (the one the inbound webhook already triggers):

1. After the trigger + **Find Contact (by email)**, add an **If/Else** on
   `{{inboundWebhookRequest.list_type}}`:
   - **= `reachout`** → your existing reach-out WhatsApp (unchanged).
   - **= `lapsed`** → continue to step 2.
2. Inside the `lapsed` branch, add another **If/Else** on `{{inboundWebhookRequest.route}}`:
   - **= `coached`** → **Send WhatsApp** (coached comeback message) **+ Send Email** (coached offer),
     both linking to the **Coached comeback** landing page.
   - **else (`gym`)** → **Send WhatsApp** (gym restart message) **+ Send Email** (gym offer), both
     linking to the **Gym comeback** landing page.
3. Publish.

Tip: keep the two landing-page URLs in GHL **custom values** (Settings → Custom Values), e.g.
`{{custom_values.winback_gym_url}}` and `{{custom_values.winback_coached_url}}`, and reference those
in the messages — then if a URL changes you edit it in one place.

### Message drafts (edit to taste; set the real price/dates)
**Gym / Core+ — WhatsApp**
> Hi {{contact.first_name}}, it's Eat Train Live 👋 We'd love to get you back in. Your comeback: **2
> weeks free**, then just pick up where you left off — no join fee, no contract. Want me to switch it
> on? Claim here: {{custom_values.winback_gym_url}}

**Gym / Core+ — Email** (subject: "Your 2 weeks back at ETL — on us")
> Short, warm, one button to the gym comeback page. Reiterate: 2 weeks free, no join fee, cancel
> anytime, ends {{date}}.

**Classes / PT — WhatsApp**
> Hi {{contact.first_name}}, it's Eat Train Live 👋 Fancy a fresh start? Come in for a **free
> goal-reset session** and we'll map a plan, then a **4-week kickstart** to get your momentum back.
> Not ready for classes? You can ease back in on gym access too. Here's everything:
> {{custom_values.winback_coached_url}}

**Classes / PT — Email** (subject: "Let's get your comeback plan sorted, {{contact.first_name}}")
> Warm re-engagement: free goal-reset + 4-week kickstart, plus the gym-access ease-back option. One
> button to the coached comeback page.

---

## Landing page copy

### Page 1 — Gym / Core+ comeback  (`winback_gym_url`)
**Headline:** Come back to Eat Train Live — your first 2 weeks are on us
**Sub:** No join fee. No contract. Just walk back in and pick up where you left off.
**Body:**
- Life gets busy — we get it. This is the easy way back: **2 weeks free**, then your normal gym
  membership (from £X/mo), cancel anytime.
- Full access to the gym floor and kit, plus the FitTrack app with your programmes.
- No rejoining fee, no catch. Offer ends **{{date}}**.
**CTA button:** Start my 2 free weeks → (links to your GymOS/Quoox join or a "claim" form)
**Reassurance line:** Prefer a chat first? Reply to the text and we'll sort it.

### Page 2 — Classes / PT comeback  (`winback_coached_url`)
**Headline:** Your comeback starts with a plan, {{first_name}}
**Sub:** A free goal-reset session, then a 4-week kickstart to get your results — and your rhythm —
back.
**Body:**
- **Step 1 — Free goal-reset (30 min):** sit down with a coach, look at where you're at, set a clear
  target. No pressure, no cost.
- **Step 2 — 4-week kickstart:** a focused block of {{classes/PT}} to rebuild momentum and show quick
  wins — at a special comeback rate of £X.
- **Not ready to jump back into coaching?** Ease back in on **gym access from £X/mo** and step up when
  you're ready. Same door, lower commitment.
**CTA button:** Book my free goal-reset → (links to your GHL/calendar booking)
**Secondary CTA:** Just restart on gym access → (links to the gym join)
**Reassurance line:** No commitment at the goal-reset — it's just a conversation.

> Build these as two pages in your funnel tool, drop the final prices/dates in, then paste the two
> URLs into GHL custom values. Tell me the URLs if you'd like me to sanity-check the GHL mapping.
