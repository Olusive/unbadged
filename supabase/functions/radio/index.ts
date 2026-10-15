// Unbadged radio: finds working stations by genre from the free Radio Browser directory (radio-browser.info).
// Audio streams play straight from each broadcaster to the listener; nothing is re-streamed through Unbadged.
const GENRES: Record<string, string[]> = {
  rock: ["rock", "classic rock"],
  country: ["country"],
  rap: ["hip hop", "hiphop", "rap"],
  metal: ["heavy metal", "metal"],
  pop: ["pop", "top 40"],
};
// words that should NOT dominate a station in that genre (filters out mixed or off-genre stations)
const AVOID: Record<string, string[]> = {
  rock: ["reggae", "country", "hip hop", "hiphop", "rap", "jazz", "classical", "news", "talk", "dance", "electronic", "ambient"],
  country: ["news", "talk", "rock", "hip hop", "dance", "electronic"],
  rap: ["rock", "metal", "thrash", "indie", "eclectic", "electronic", "ambient", "jazz", "country", "news", "talk", "chill"],
  metal: ["news", "talk", "pop", "country", "hip hop", "dance"],
  pop: ["news", "talk", "country", "metal", "hip hop", "rap", "ambient", "classical"],
};
const NAME_HINT: Record<string, RegExp> = {
  rock: /rock/i, country: /country|outlaw|honky|kickin/i,
  rap: /hip.?hop|\brap\b|trap|beat|urban|g-?funk|old ?school|bounce|jamz|r&b|rnb|\bhot \d|power \d|\bwild \d/i,
  metal: /metal|hard rock|hair|headbang/i, pop: /pop|hits|top ?40|kiss|kiis|z100|chr/i,
};
const NAME_REQUIRED = new Set(["rap"]); // tags on rap stations are messy; trust the station name
const cleanName = (n: string) => String(n).replace(/\s*[-–|]\s*(online|www\.|https?:).*$/i, "").replace(/\s*\((\d+k|\d+ ?kbps)[^)]*\)?/i, "").replace(/^[_.]+/, "").trim().slice(0, 48);
const HOSTS = ["de1", "de2", "fi1", "nl1", "at1"].map((h) => `https://${h}.api.radio-browser.info`);
const UA = "Unbadged/0.1 (closed beta)";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const cache = new Map<string, { t: number; data: unknown }>();
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function rb(path: string): Promise<any> {
  const order = [...HOSTS].sort(() => Math.random() - 0.5);
  for (const h of order) {
    try {
      const r = await fetch(h + path, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
      if (r.ok) return await r.json();
    } catch (_) { /* try the next mirror */ }
  }
  throw new Error("The radio directory is unreachable right now.");
}
const search = (tag: string, us: boolean) =>
  rb(`/json/stations/search?tag=${encodeURIComponent(tag)}${us ? "&countrycode=US" : ""}&hidebroken=true&is_https=true&order=clickcount&reverse=true&limit=80`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const body = await req.json().catch(() => ({}));
  if (typeof body.click === "string") {
    if (/^[0-9a-f-]{36}$/i.test(body.click)) rb(`/json/url/${body.click}`).catch(() => {});
    return json({ ok: true });
  }
  const g = body.genre as string, tags = GENRES[g];
  if (!tags) return json({ error: "Unknown genre." }, 400);
  const hit = cache.get(g);
  if (hit && Date.now() - hit.t < 6 * 3600e3) return json(hit.data);
  try {
    let raw: any[] = (await Promise.all(tags.map((t) => search(t, true).catch(() => [])))).flat();
    if (raw.length < 15) raw = raw.concat(await search(tags[0], false).catch(() => []));
    const seen = new Set<string>(), out: any[] = [];
    raw
      .filter((s) => s.lastcheckok === 1 && s.hls === 0 && /^https:\/\//.test(s.url_resolved || "") && /mp3|aac/i.test(s.codec || ""))
      .filter((s) => {
        const st = String(s.tags || "").toLowerCase().split(",").map((x: string) => x.trim()).filter(Boolean);
        const hits = st.filter((x: string) => tags.some((t) => x.includes(t))).length;
        const bad = st.filter((x: string) => (AVOID[g] || []).some((a) => x.includes(a))).length;
        const name = String(s.name || "").trim(), named = NAME_HINT[g].test(name);
        if (/news|talk|sports|church|sermon/i.test(name)) return false;
        if (!named && (NAME_REQUIRED.has(g) || !/\s|\d|\./.test(name))) return false;
        return named ? bad <= hits + 1 : hits > 0 && bad <= hits - 1 && hits / Math.max(1, st.length) >= 0.25;
      })
      .sort((a, b) => (b.clickcount - a.clickcount) || (b.votes - a.votes))
      .forEach((s) => {
        const name = cleanName(s.name), key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!key || seen.has(key) || seen.has(s.stationuuid)) return;
        seen.add(key); seen.add(s.stationuuid);
        out.push({
          id: s.stationuuid,
          name,
          url: s.url_resolved,
          icon: /^https:\/\//.test(s.favicon || "") ? s.favicon : "",
          where: [s.state, s.countrycode].filter(Boolean).join(", "),
          kbps: s.bitrate || 0,
        });
      });
    const data = { stations: out.slice(0, 24) };
    if (out.length) cache.set(g, { t: Date.now(), data });
    return json(data);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});
