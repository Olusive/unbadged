/* ---------- holiday themes ----------
   Federal holidays: theme runs from 3 weeks before to 3 days after.
   Other big holidays: 1 week before to 1 day after.
   When two overlap, the next upcoming holiday wins. */
const HOLI = {
  newyear:      { fed: 1, name: "New Year's", accent: "#ffd166", c1: "#3a2a7a", c2: "#1b3a6b", deco: ["🎆", "🥂", "✨"], fx: ["✦", "sparkle"], pre: "🎆 New Year's in {d}", day: "🎆 Happy New Year!", post: "🎆 Happy New Year!" , font: "Righteous", wt: "400", menu: "linear-gradient(90deg,#ffd166,#fff3c4,#c9a6ff)", icons: "🎉 💰 📜 🥂 💌 🎶 👑 ⏰".split(" ")},
  mlk:          { fed: 1, name: "MLK Day", accent: "#f4b942", c1: "#2a3d6e", c2: "#4a2f5e", deco: ["🕊️", "✊"], pre: "🕊️ MLK Day in {d}", day: "🕊️ Honoring Dr. Martin Luther King Jr.", post: "🕊️ Honoring Dr. Martin Luther King Jr." , font: "Cinzel", wt: "700", menu: "linear-gradient(90deg,#f4d58d,#f4b942)", icons: "🏠 💵 📜 🕊️ ✉️ 📻 👑 ⚙️".split(" ")},
  valentines:   { fed: 0, name: "Valentine's Day", accent: "#ff5c8a", c1: "#6b1f3a", c2: "#3d1838", deco: ["❤️", "💌", "💘"], fx: ["❤", "rise"], pre: "❤️ Valentine's Day in {d}", day: "❤️ Happy Valentine's Day", post: "❤️ Hope your Valentine's was a good one" , font: "Pacifico", wt: "400", menu: "linear-gradient(90deg,#ffb3c7,#ff4d6d)", icons: "🏡 💸 💌 💕 💘 🎵 👑 🌹".split(" ")},
  presidents:   { fed: 1, name: "Presidents Day", accent: "#e63946", c1: "#1d3557", c2: "#6b1d2a", deco: ["⭐", "🇺🇸"], pre: "🇺🇸 Presidents Day in {d}", day: "🇺🇸 Happy Presidents Day", post: "🇺🇸 Happy Presidents Day" , font: "Cinzel", wt: "700", menu: "linear-gradient(90deg,#ff6b6b,#ffffff,#6ea8ff)", icons: "🏛️ 💵 📜 🗳️ ✉️ 📻 🦅 ⚙️".split(" ")},
  stpatricks:   { fed: 0, name: "St. Patrick's Day", accent: "#2ecc71", c1: "#0f4d2a", c2: "#1d5c3a", deco: ["☘️", "🍀", "🌈"], fx: ["☘", "fall"], pre: "☘️ St. Patrick's Day in {d}", day: "☘️ Happy St. Patrick's Day!", post: "☘️ Hope you found your luck" , font: "Uncial Antiqua", wt: "400", menu: "linear-gradient(90deg,#9cf09f,#2ecc71,#ffd166)", icons: "🏡 🪙 🍀 🍻 💚 🎻 👑 🌈".split(" ")},
  easter:       { fed: 0, name: "Easter", accent: "#c39bff", c1: "#4a3a6e", c2: "#2f5a4a", deco: ["🐣", "🌷", "🥚"], pre: "🐣 Easter in {d}", day: "🐣 Happy Easter!", post: "🐣 Happy Easter!" , font: "Fredoka", wt: "600", menu: "linear-gradient(90deg,#c39bff,#ffb3d9,#9be7c4)", icons: "🏡 🥚 🌷 🐣 💌 🎶 👑 🐰".split(" ")},
  mothers:      { fed: 0, name: "Mother's Day", accent: "#ff8fb1", c1: "#5a2a45", c2: "#3a2a55", deco: ["💐", "🌸"], fx: ["🌸", "fall"], pre: "💐 Mother's Day in {d}", day: "💐 Happy Mother's Day", post: "💐 Happy Mother's Day" , font: "Dancing Script", wt: "700", menu: "linear-gradient(90deg,#ffc2d6,#ff8fb1)", icons: "🏡 💐 🌸 💬 💌 🎶 👑 🌷".split(" ")},
  memorial:     { fed: 1, name: "Memorial Day", accent: "#e5484d", c1: "#1d2f55", c2: "#4a1d24", deco: ["🇺🇸", "🎖️"], pre: "🇺🇸 Memorial Day in {d}", day: "🇺🇸 Memorial Day · Remembering those who gave everything", post: "🇺🇸 Remembering those who gave everything" , font: "Cinzel", wt: "700", menu: "linear-gradient(90deg,#ff6b6b,#ffffff,#6ea8ff)", icons: "🏠 💵 📜 🇺🇸 ✉️ 📻 🎖️ ⚙️".split(" ")},
  fathers:      { fed: 0, name: "Father's Day", accent: "#4c9aff", c1: "#1f3a5f", c2: "#2b3440", deco: ["👔", "🛠️", "🍔"], pre: "👔 Father's Day in {d}", day: "👔 Happy Father's Day", post: "👔 Happy Father's Day" , font: "Bebas Neue", wt: "400", menu: "linear-gradient(90deg,#a8d1ff,#4c9aff)", icons: "🏡 💵 🛠️ 🍔 👔 📻 👑 🔧".split(" ")},
  juneteenth:   { fed: 1, name: "Juneteenth", accent: "#ff5a4f", c1: "#1f4d2c", c2: "#5a1f1f", deco: ["⭐", "🎉"], fx: ["✦", "sparkle"], pre: "⭐ Juneteenth in {d}", day: "⭐ Happy Juneteenth · Freedom Day", post: "⭐ Happy Juneteenth" , font: "Righteous", wt: "400", menu: "linear-gradient(90deg,#ff5a4f,#ffd166,#3ddc84)", icons: "🏠 💵 📜 🎉 ✉️ 🎶 ⭐ ⚙️".split(" ")},
  july4:        { fed: 1, name: "Independence Day", accent: "#ff4d4d", c1: "#1d3570", c2: "#6b1d2a", deco: ["🎆", "🇺🇸", "⭐"], fx: ["✦", "sparkle"], pre: "🎆 July 4th in {d}", day: "🎆 Happy Independence Day!", post: "🎆 Happy 4th!" , font: "Alfa Slab One", wt: "400", menu: "linear-gradient(90deg,#ff4d4d,#ffffff,#4d8bff)", icons: "🏡 💵 🗽 🎆 🎇 📻 🦅 🌭".split(" ")},
  labor:        { fed: 1, name: "Labor Day", accent: "#ff9f1c", c1: "#1f3a5f", c2: "#4a2f12", deco: ["🛠️", "👷", "⚙️"], pre: "🛠️ Labor Day in {d}", day: "🛠️ Happy Labor Day. This one's for you.", post: "🛠️ Hope you got the day off" , font: "Bebas Neue", wt: "400", menu: "linear-gradient(90deg,#ffd08a,#ff9f1c)", icons: "🏠 💵 🛠️ 👷 ✉️ 📻 👑 ⚙️".split(" ")},
  columbus:     { fed: 1, name: "Columbus Day / Indigenous Peoples' Day", accent: "#e07a2e", c1: "#4a2a12", c2: "#3a1f0f", deco: ["🍂", "🍁"], fx: ["🍂", "fall"], pre: "🍂 Columbus Day · Indigenous Peoples' Day in {d}", day: "🍂 Columbus Day · Indigenous Peoples' Day", post: "🍂 Happy fall, y'all" , font: "Bree Serif", wt: "400", menu: "linear-gradient(90deg,#ffc27a,#e07a2e,#c1440e)", icons: "🏡 💵 🍁 🍂 ✉️ 📻 👑 🍎".split(" ")},
  halloween:    { fed: 1, name: "Halloween", accent: "#ff7b1a", c1: "#3a1550", c2: "#4a1f05", deco: ["🎃", "🦇", "👻"], fx: ["🦇", "rise"], pre: "🎃 Halloween in {d}", day: "🎃 Happy Halloween!", post: "🎃 Hope you got the good candy" , font: "Creepster", wt: "400", menu: "linear-gradient(90deg,#ffa24c,#ff7b1a,#b26bff)", icons: "🏚️ 🍬 🪦 👻 🦇 🎃 🧛 🕸️".split(" ")},
  veterans:     { fed: 1, name: "Veterans Day", accent: "#e5484d", c1: "#1d2f55", c2: "#353b45", deco: ["🎖️", "🇺🇸", "⭐"], pre: "🎖️ Veterans Day in {d}", day: "🎖️ Thank you to everyone who served", post: "🎖️ Thank you to everyone who served" , font: "Black Ops One", wt: "400", menu: "linear-gradient(90deg,#ff6b6b,#ffffff,#6ea8ff)", icons: "🏠 💵 📜 🎖️ ✉️ 📻 ⭐ 🇺🇸".split(" ")},
  thanksgiving: { fed: 1, name: "Thanksgiving", accent: "#e08a2e", c1: "#5a2f0f", c2: "#3a2a12", deco: ["🦃", "🍂", "🥧"], fx: ["🍂", "fall"], pre: "🦃 Thanksgiving in {d}", day: "🦃 Happy Thanksgiving", post: "🦃 Hope you got some leftovers" , font: "Lobster Two", wt: "700", menu: "linear-gradient(90deg,#ffd08a,#e08a2e,#b5541c)", icons: "🏡 🥧 🌽 🦃 💌 📻 👑 🍂".split(" ")},
  christmas:    { fed: 1, name: "Christmas", accent: "#ff4d4d", c1: "#0f4d2a", c2: "#5a1414", deco: ["🎄", "❄️", "🎁"], fx: ["❄", "fall"], pre: "🎄 Christmas in {d}", day: "🎄 Merry Christmas!", post: "🎄 Merry Christmas!" , font: "Mountains of Christmas", wt: "700", menu: "linear-gradient(90deg,#ff6b6b,#ffffff,#7ee081)", icons: "🎄 🎁 📜 ⛄ 💌 🔔 🎅 ❄️".split(" ")},
};

function nthWeekday(y, m, wd, n) { const first = new Date(y, m, 1); return new Date(y, m, 1 + ((wd - first.getDay() + 7) % 7) + 7 * (n - 1)); }
function lastWeekday(y, m, wd) { const last = new Date(y, m + 1, 0); return new Date(y, m, last.getDate() - ((last.getDay() - wd + 7) % 7)); }
function easterDate(y) { // Anonymous Gregorian algorithm
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
function holidayDates(y) {
  return [
    ["newyear", new Date(y, 0, 1)], ["mlk", nthWeekday(y, 0, 1, 3)], ["valentines", new Date(y, 1, 14)], ["presidents", nthWeekday(y, 1, 1, 3)],
    ["stpatricks", new Date(y, 2, 17)], ["easter", easterDate(y)], ["mothers", nthWeekday(y, 4, 0, 2)], ["memorial", lastWeekday(y, 4, 1)],
    ["fathers", nthWeekday(y, 5, 0, 3)], ["juneteenth", new Date(y, 5, 19)], ["july4", new Date(y, 6, 4)], ["labor", nthWeekday(y, 8, 1, 1)],
    ["columbus", nthWeekday(y, 9, 1, 2)], ["halloween", new Date(y, 9, 31)], ["veterans", new Date(y, 10, 11)], ["thanksgiving", nthWeekday(y, 10, 4, 4)],
    ["christmas", new Date(y, 11, 25)],
  ];
}
// The big six win any overlap. A smaller holiday that lands first still gets its day,
// then the big one takes over the moment the smaller one is over.
const HOLI_PRIORITY = new Set(["christmas", "newyear", "thanksgiving", "july4", "halloween", "veterans"]);
function activeHoliday(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), live = [];
  for (const y of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
    for (const [key, date] of holidayDates(y)) {
      const t = HOLI[key], days = Math.round((date - today) / 864e5), before = t.fed ? 21 : 7, after = t.fed ? 3 : 1;
      if (days > before || days < -after) continue;
      live.push({ key, days, date, rank: days >= 0 ? days : 1000 - days }); // upcoming beats already-passed; nearest wins
    }
  }
  const pick = list => list.sort((a, b) => a.rank - b.rank)[0] || null;
  const big = pick(live.filter(h => HOLI_PRIORITY.has(h.key)));
  if (!big) return pick(live);
  const smallFirst = pick(live.filter(h => !HOLI_PRIORITY.has(h.key) && h.days >= 0 && h.date < big.date));
  return smallFirst || big;
}
function holidayBanner(h) {
  const t = HOLI[h.key];
  if (h.days > 0) return t.pre.replace("{d}", h.days === 1 ? "tomorrow" : h.days + " days").replace(" in tomorrow", " is tomorrow");
  return h.days === 0 ? t.day : t.post;
}
function holidayTile(deco) {
  const spots = [[20, 30, -12], [95, 18, 10], [58, 78, 6], [130, 92, -8], [18, 128, 14], [92, 140, -4]];
  const txt = spots.map(([x, y, r], i) => `<text x="${x}" y="${y}" font-size="22" transform="rotate(${r} ${x} ${y})">${deco[i % deco.length]}</text>`).join("");
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><g opacity=".09">${txt}</g></svg>`)}")`;
}
function holidayFx(fx) {
  let box = document.getElementById("holiFx");
  if (box) box.remove();
  if (!fx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const [glyph, mode] = fx, n = innerWidth < 720 ? 12 : 22;
  box = document.createElement("div"); box.id = "holiFx"; box.setAttribute("aria-hidden", "true");
  box.innerHTML = Array.from({ length: n }, () => {
    const left = Math.random() * 100, dur = mode === "sparkle" ? 2 + Math.random() * 3 : 9 + Math.random() * 10, delay = -Math.random() * dur, size = 10 + Math.random() * 14, top = Math.random() * 100;
    return `<i class="hfx ${mode}" style="left:${left}%;${mode === "sparkle" ? `top:${top}%;` : ""}font-size:${size}px;animation-duration:${dur}s;animation-delay:${delay}s">${glyph}</i>`;
  }).join("");
  document.body.appendChild(box);
}
let holidayNow = null;
function applyHoliday(previewKey) {
  const root = document.documentElement, on = (() => { try { return JSON.parse(localStorage.getItem("ub-holidays") ?? "true"); } catch (e) { return true; } })();
  const h = previewKey ? { key: previewKey, days: 0 } : on ? activeHoliday() : null;
  holidayNow = h;
  let banner = document.getElementById("holiBanner");
  if (!h) {
    delete root.dataset.holiday; ["--hdeco", "--hbg", "--hfont", "--hmenu", "--hwt"].forEach(v => root.style.removeProperty(v));
    if (typeof renderNav === "function" && typeof S !== "undefined" && S.uid) try { renderNav(); } catch (e) {}
    root.style.setProperty("--accent", (typeof S !== "undefined" && S.accent) || "#ff7b30");
    if (banner) banner.hidden = true; holidayFx(null); return null;
  }
  const t = HOLI[h.key];
  root.dataset.holiday = h.key;
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--hdeco", holidayTile(t.deco));
  root.style.setProperty("--hbg", `radial-gradient(1100px 620px at 0% 0%, ${t.c1}aa, transparent 62%), radial-gradient(900px 560px at 100% 100%, ${t.c2}aa, transparent 62%)`);
  if (!banner) {
    const bar = document.querySelector(".topbar .logo") || document.querySelector(".topbar");
    banner = document.createElement("span"); banner.id = "holiBanner"; banner.className = "holibanner";
    if (bar) bar.insertAdjacentElement("afterend", banner);
  }
  if (banner) { banner.hidden = false; banner.textContent = holidayBanner(h); banner.title = t.name; }
  const fid = "hfont-" + t.font.replace(/\s+/g, "");
  if (!document.getElementById(fid)) { const l = document.createElement("link"); l.id = fid; l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${t.font.replace(/\s+/g, "+")}:wght@${t.wt}&display=swap`; document.head.appendChild(l); }
  root.style.setProperty("--hfont", `"${t.font}"`); root.style.setProperty("--hwt", t.wt); root.style.setProperty("--hmenu", t.menu);
  holidayFx(t.fx);
  if (typeof renderNav === "function" && typeof S !== "undefined" && S.uid) try { renderNav(); } catch (e) {}
  return h;
}
