# Catch-up prompt — paste into the builder (accountability video embed + preview seed)

Two fixes to the accountability week-content videos. Live data was fine (each week has its own real
Vimeo URLs); the bugs showed up in **Preview**, where the Watch button loaded the app shell (Staff Hub)
and every week showed the same two placeholder videos. Apply both so a future export keeps them.

## 1. `src/lib/accWeekContent.ts` — `getEmbedUrl` was treating any string as a video
The fallback returned the URL as-is, so a placeholder like `"#"` (or a relative path) became an iframe
`src`, which the browser resolved against the app origin and loaded the app itself. Only treat an
absolute http(s) URL as embeddable; everything else returns `null` (so `AccResourceList` renders it as a
plain link, not a video):
```ts
    // Fallback: only treat an absolute http(s) URL as embeddable. Placeholders
    // ("#"), relative paths and empty-ish values are NOT videos.
    return /^https?:\/\//i.test(u) ? u : null;
```
(Replaces the old `return u;` at the end of `getEmbedUrl`.)

## 2. `src/lib/accPreviewData.ts` — preview seed now has real, per-week videos
Every preview week spread one shared `DEMO_WEEK_CONTENT` whose `resources` were `url: "#"` and whose
`video_url` was `loom.com/share/demo`, so all six weeks showed the same two dead links. Give each week
its own real `video_url` + `resources` (real Vimeo URLs from the content load) so Preview faithfully
shows how each week looks and the videos actually play:

- **DEMO_WEEK_CONTENT (week 3):** `video_url: "https://vimeo.com/739617323"`,
  `resources: [{ title: "Thu — Your SOS plan", url: "https://vimeo.com/560321641" }]`
- **Week 0:** video `https://vimeo.com/740669361`; resources: Meet the scales `…/740669361`,
  Your why `https://vimeo.com/740659811/1e505697f6`
- **Week 1:** video `…/1012011826`; resources: Building your plate `…/1012394089`, Hydration `…/1013410677`
- **Week 2:** video `…/1017423995`; resources: Hand portions `…/1014225831`, Protein swaps `…/1017570117`,
  Nutrient density `…/1017903906`
- **Week 4:** video `…/1015118918`; resources: Cravings `…/1021978017`, Loss of motivation `…/809683505`,
  Calories in alcohol `…/809687911`
- **Week 5:** video `…/1017942117`; resources: Fats & carbs `…/748271372`, Fibre `…/913595843`,
  Protein deep-dive `…/913591485`, Protein timing `…/1017580452`
- **Week 6:** video `…/752061215`; resources: `[]` (the live call is handled separately, not a card)

No schema, no other files. (The live `acc_week_content` rows already carry these real URLs — this only
changes the demo/preview seed and the embed-URL guard.)
