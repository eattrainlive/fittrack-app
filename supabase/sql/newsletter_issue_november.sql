-- ============================================================================
-- Newsletter issue: ETL November. Inserts as a DRAFT (published=false) so you
-- can add a cover image, confirm the two event dates, and publish in the app
-- (Admin -> Newsletters). Re-runnable: on_conflict(slug) updates the content.
-- Run AFTER newsletters.sql.
-- ============================================================================

insert into public.newsletters (slug, title, subtitle, cover_image, blocks, published)
values (
  'november-2026',
  'The ETL Newsletter',
  'Your dose of training, events and tribe news',
  null,
  $json$[
    {
      "id": "b_nl1_intro",
      "type": "text",
      "text": "Welcome to the first ETL newsletter. A quick round-up of what's worth knowing this month — a bit of training science to sharpen your results, the events to get in your diary, where we're up to on the Million Metre Challenge, and a plain-English guide to the four programmes sitting in your app right now."
    },
    { "id": "b_nl1_div1", "type": "divider" },

    { "id": "b_nl1_meta_h", "type": "heading", "text": "Why Fat Loss Stalls: Metabolic Adaptation" },
    {
      "id": "b_nl1_meta_t1",
      "type": "text",
      "text": "You've been eating well and training hard, then the scales stop moving. It's not a lack of willpower and it's not a broken metabolism — it's adaptation. When you diet, your body gets more efficient. It burns slightly fewer calories at rest, you move a little less without noticing (fidgeting, posture and daily steps all quietly dip), and hunger signals ramp up. That's your body doing exactly what it evolved to do: protect you during a perceived shortage.\n\nThe mistake is to answer a stall by eating less and less. That just digs the hole deeper and costs you muscle. The better play is to keep protein high, keep strength training to hold onto muscle (your most metabolically active tissue), protect your sleep and step count, and take planned breaks back at maintenance calories to let things reset before pushing again."
    },
    {
      "id": "b_nl1_meta_c",
      "type": "callout",
      "text": "Takeaway: a stall is a signal to train hard, eat enough protein and stay patient — not to slash calories further. Muscle is your metabolism's best friend."
    },
    { "id": "b_nl1_div2", "type": "divider" },

    { "id": "b_nl1_ev_h", "type": "heading", "text": "What's On: Games Day & Christmas Party" },
    {
      "id": "b_nl1_ev_t1",
      "type": "text",
      "text": "Two big tribe dates to get in the diary. Games Day is a fun, all-levels throwdown — teams, laughs and a bit of friendly competition, whatever your ability. Then we round off the year with the ETL Christmas Party: good food, good people and a well-earned celebration of everything you've put in this year."
    },
    {
      "id": "b_nl1_ev_games",
      "type": "callout",
      "text": "Games Day — [add date & time in the builder]. All abilities welcome; come with a team or we'll sort you one on the day."
    },
    {
      "id": "b_nl1_ev_xmas",
      "type": "callout",
      "text": "Christmas Party — [add date & venue in the builder]. Our end-of-year celebration. Don't miss it."
    },
    {
      "id": "b_nl1_ev_t2",
      "type": "text",
      "text": "Let us know you're coming so we can plan numbers — tap 'Attending' on the Events page in the app."
    },
    {
      "id": "b_nl1_ev_btn",
      "type": "button",
      "label": "RSVP on the app",
      "url": "https://etlfittrack.netlify.app/community"
    },
    { "id": "b_nl1_div3", "type": "divider" },

    { "id": "b_nl1_mm_h", "type": "heading", "text": "The Million Metre Challenge" },
    {
      "id": "b_nl1_mm_t1",
      "type": "text",
      "text": "We're rowing, skiing and biking our way to one million metres as a gym before Christmas. Every metre you log on the ergs counts towards the tribe total — so whether you smash a 5k row or tick off 500m on the bike between sets, it all adds up. It's the easiest way to add a bit of free conditioning and be part of something bigger while you're at it."
    },
    {
      "id": "b_nl1_mm_c",
      "type": "callout",
      "text": "Every erg metre counts. Log your workouts in the app and watch the tribe total climb."
    },
    {
      "id": "b_nl1_mm_btn",
      "type": "button",
      "label": "See the leaderboard",
      "url": "https://etlfittrack.netlify.app/challenge"
    },
    { "id": "b_nl1_div4", "type": "divider" },

    { "id": "b_nl1_prog_h", "type": "heading", "text": "Your 4 Programmes, Explained" },
    {
      "id": "b_nl1_prog_t",
      "type": "text",
      "text": "Every membership gives you access to four distinct training streams in the app. Not sure which fits? Here's the quick rundown — and you can switch anytime."
    },
    { "id": "b_nl1_prog_f_h", "type": "heading", "text": "Foundations" },
    {
      "id": "b_nl1_prog_f_t",
      "type": "text",
      "text": "New to training, or coming back after a break? Start here. Simple, full-body sessions that build technique, confidence and consistency, with gentle progressions so you're never thrown in at the deep end."
    },
    { "id": "b_nl1_prog_s_h", "type": "heading", "text": "Stronger" },
    {
      "id": "b_nl1_prog_s_t",
      "type": "text",
      "text": "Our strength-focused stream. A push/pull/legs structure with progressive overload built in — ideal if your main goal is to get genuinely stronger and build muscle."
    },
    { "id": "b_nl1_prog_fu_h", "type": "heading", "text": "Fusion" },
    {
      "id": "b_nl1_prog_fu_t",
      "type": "text",
      "text": "The best of both worlds: strength work blended with conditioning for balanced, all-round fitness. Great if you want to lift, move well and keep your engine ticking over."
    },
    { "id": "b_nl1_prog_p_h", "type": "heading", "text": "Performance" },
    {
      "id": "b_nl1_prog_p_t",
      "type": "text",
      "text": "For those who want to push. A hybrid-athlete approach pairing heavy strength with engine and conditioning blocks — including leaderboard workouts so you can race the rest of the tribe."
    },
    {
      "id": "b_nl1_prog_close",
      "type": "text",
      "text": "Open the app, head to Workouts and pick the stream that matches your goal. Not sure? Your coach can point you in the right direction anytime."
    }
  ]$json$::jsonb,
  false
)
on conflict (slug) do update
  set title = excluded.title,
      subtitle = excluded.subtitle,
      blocks = excluded.blocks,
      updated_at = now();
