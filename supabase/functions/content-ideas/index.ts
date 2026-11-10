// Supabase Edge Function: content-ideas
// AI content idea generator for the Staff Hub. Given a topic (and optional
// destination/tone), returns ready-to-use caption options + story prompts +
// post angles in the ETL ("Eat Train Live Smart") brand voice. Staff-guarded by
// STAFF_SECRET; reuses the ANTHROPIC_API_KEY secret already set for the coach
// agent. No new secrets.
//
// POST { staffSecret, topic, destination?, tone?, extra? }
// → { captions: string[], stories: string[], angles: string[] }
// Deploy: supabase functions deploy content-ideas

const MODEL = "claude-sonnet-5";
const ANTHROPIC = "https://api.anthropic.com/v1/messages";
const STAFF_SECRET = Deno.env.get("STAFF_SECRET") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: any, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `You write social media content for "Eat Train Live Smart" (ETL), a friendly, community-focused gym in the UK.
Voice: warm, motivating, down-to-earth, British spelling, first-person-plural ("we", "our members"). Encouraging, never salesy or hype-y. Speak to real members, not an audience of strangers. Emojis sparingly (0–2 per caption) and only where natural.
Avoid: clickbait, fake urgency, medical claims, "transform your body" clichés, hashtag spam (at most 2–3 relevant hashtags, and only on main-page posts).
Return STRICT JSON only, no prose around it, in this exact shape:
{"captions": ["...","...","..."], "stories": ["...","...","..."], "angles": ["...","...","..."]}
- captions: 3 complete, ready-to-post captions of varying length (one short, one medium, one longer).
- stories: 3 short story-slide ideas (one line each — what to show + the on-screen text).
- angles: 3 one-line angles/hooks for future posts on the same theme.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (!STAFF_SECRET || body.staffSecret !== STAFF_SECRET) return json({ error: "Not authorised." }, 401);

    const topic = String(body.topic || "").trim();
    if (!topic) return json({ error: "A topic is required." }, 400);
    const destination = String(body.destination || "").trim();
    const tone = String(body.tone || "").trim();
    const extra = String(body.extra || "").trim();

    const destLine =
      destination === "stories"
        ? "These are primarily for Instagram/Facebook Stories — keep captions short and punchy."
        : destination === "private"
          ? "These are for our private members-only page — warm and insider, you can assume they're already members."
          : destination === "main"
            ? "These are for our main public page — welcoming to members and prospective members alike."
            : "";

    const userMsg = [
      `Topic: ${topic}`,
      destLine,
      tone ? `Preferred tone: ${tone}` : "",
      extra ? `Extra context: ${extra}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const r = await fetch(ANTHROPIC, {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: "user", content: userMsg }],
        thinking: { type: "disabled" },
      }),
    });
    if (!r.ok) return json({ error: `ai ${r.status}` }, 502);
    const data = await r.json();
    const text = (data?.content ?? [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();

    // Pull the JSON object out of the reply (strip any stray fences/prose).
    let parsed: any = null;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : text);
    } catch (_) {
      return json({ error: "Couldn't parse the AI response — try again.", raw: text }, 502);
    }

    return json({
      captions: Array.isArray(parsed.captions) ? parsed.captions.slice(0, 5) : [],
      stories: Array.isArray(parsed.stories) ? parsed.stories.slice(0, 5) : [],
      angles: Array.isArray(parsed.angles) ? parsed.angles.slice(0, 5) : [],
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
