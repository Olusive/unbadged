/* ---------- post celebrations and fireworks ----------
   celebrate(originEl) runs only after a successful post on Home.
   Sounds are made on the fly with Web Audio (no files to download). */
let _ac = null;
const audio = () => { try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); if (_ac.state === "suspended") _ac.resume(); return _ac; } catch (e) { return null; } };
function tone({ f = 440, f2 = 0, type = "sine", dur = 0.3, vol = 0.05, at = 0, attack = 0.01 }) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise({ dur = 0.4, vol = 0.06, at = 0, freq = 800, kind = "lowpass" }) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + at, len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; fl.type = kind; fl.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl).connect(g).connect(a.destination); src.start(t);
}
const SOUNDS = {
  spooky: () => { tone({ f: 330, f2: 175, dur: 1.5, vol: 0.05, attack: 0.25 }); tone({ f: 494, f2: 262, dur: 1.5, vol: 0.025, at: 0.06, attack: 0.25 }); },
  bells: () => { [659, 659, 659, 0, 659, 659, 659, 0, 659, 784, 523, 587, 659].forEach((f, i) => { if (f) { tone({ f, type: "triangle", dur: 0.28, vol: 0.045, at: i * 0.14 }); tone({ f: f * 4, dur: 0.12, vol: 0.012, at: i * 0.14 }); } }); },
  boom: (n = 3) => { for (let i = 0; i < n; i++) { const at = i * 0.45 + Math.random() * 0.15; noise({ dur: 0.9, vol: 0.12, at, freq: 160 }); tone({ f: 90, f2: 38, dur: 0.6, vol: 0.07, at }); noise({ dur: 0.5, vol: 0.02, at: at + 0.12, freq: 3500, kind: "highpass" }); } },
  pop: () => { noise({ dur: 0.08, vol: 0.06, freq: 1800, kind: "highpass" }); tone({ f: 620, f2: 1240, dur: 0.1, vol: 0.04 }); },
  chime: () => { tone({ f: 880, dur: 0.7, vol: 0.035 }); tone({ f: 1320, dur: 0.8, vol: 0.028, at: 0.12 }); tone({ f: 1760, dur: 0.9, vol: 0.018, at: 0.24 }); },
  boing: () => { tone({ f: 190, f2: 760, dur: 0.3, vol: 0.05 }); tone({ f: 190, f2: 760, dur: 0.3, vol: 0.05, at: 0.45 }); tone({ f: 190, f2: 760, dur: 0.3, vol: 0.05, at: 0.9 }); },
  gobble: () => { for (let i = 0; i < 7; i++) tone({ f: 380 + (i % 2) * 140, type: "square", dur: 0.06, vol: 0.02, at: i * 0.065 }); },
  clink: () => { [0, 0.15, 0.3].forEach(at => { tone({ f: 2400 + Math.random() * 400, dur: 0.22, vol: 0.035, at }); tone({ f: 3300, dur: 0.15, vol: 0.02, at: at + 0.02 }); }); },
  whoosh: () => { noise({ dur: 0.9, vol: 0.05, freq: 900, kind: "bandpass" }); },
  hammer: () => { [0, 0.28, 0.56].forEach(at => { noise({ dur: 0.07, vol: 0.09, freq: 2600, kind: "bandpass", at }); tone({ f: 1700, dur: 0.12, vol: 0.02, at }); }); },
};

const rnd = (a, b) => a + Math.random() * (b - a), pickOne = a => a[Math.floor(Math.random() * a.length)];
function fxLayer(ms = 6500) { const d = document.createElement("div"); d.className = "celebrate"; d.setAttribute("aria-hidden", "true"); document.body.appendChild(d); setTimeout(() => d.remove(), ms); return d; }
function glyph(layer, ch, size, css = "") { const s = document.createElement("span"); s.className = "cglyph"; s.textContent = ch; s.style.cssText = `font-size:${size}px;${css}`; layer.appendChild(s); return s; }
const FX = {
  fly(chars, n = 7, o = {}) {
    const L = fxLayer(), dir = o.dir || 1;
    for (let i = 0; i < n; i++) {
      const y = rnd(o.yMin ?? 8, o.yMax ?? 70), s = glyph(L, pickOne(chars), rnd(...(o.size || [28, 46])), `top:${y}vh;left:0`);
      const w = o.wobble ?? 6, start = dir > 0 ? -15 : 115, end = dir > 0 ? 115 : -15;
      s.animate([{ transform: `translate(${start}vw,0) scaleX(${dir > 0 ? 1 : -1})` }, { transform: `translate(${(start + end) / 3}vw,${-w}vh) scaleX(${dir > 0 ? 1 : -1})` }, { transform: `translate(${(start + end) * 2 / 3}vw,${w}vh) scaleX(${dir > 0 ? 1 : -1})` }, { transform: `translate(${end}vw,0) scaleX(${dir > 0 ? 1 : -1})` }],
        { duration: rnd(...(o.dur || [2400, 4000])), delay: rnd(0, o.spread ?? 900), easing: "ease-in-out", fill: "both" });
    }
  },
  rain(chars, n = 24, o = {}) {
    const L = fxLayer();
    for (let i = 0; i < n; i++) {
      const s = glyph(L, pickOne(chars), rnd(...(o.size || [18, 34])), `left:${rnd(0, 100)}vw;top:0`), dx = rnd(-10, 10);
      s.animate([{ transform: "translate(0,-12vh) rotate(0deg)", opacity: 1 }, { transform: `translate(${dx}vw,112vh) rotate(${rnd(-300, 300)}deg)`, opacity: 0.9 }], { duration: rnd(2200, 3800), delay: rnd(0, 1200), easing: "cubic-bezier(.3,.1,.6,1)", fill: "both" });
    }
  },
  rise(chars, n = 16, o = {}) {
    const L = fxLayer();
    for (let i = 0; i < n; i++) {
      const s = glyph(L, pickOne(chars), rnd(...(o.size || [20, 38])), `left:${rnd(5, 95)}vw;top:100vh`);
      s.animate([{ transform: "translate(0,0) scale(.6)", opacity: 0 }, { transform: `translate(${rnd(-6, 6)}vw,-45vh) scale(1)`, opacity: 1, offset: 0.4 }, { transform: `translate(${rnd(-10, 10)}vw,-112vh) scale(1.1)`, opacity: 0 }], { duration: rnd(2600, 4200), delay: rnd(0, 1000), easing: "ease-out", fill: "both" });
    }
  },
  burst(chars, x, y, n = 40) {
    const L = fxLayer(4000);
    for (let i = 0; i < n; i++) {
      const s = glyph(L, pickOne(chars), rnd(14, 26), `left:${x}px;top:${y}px`), ang = rnd(0, Math.PI * 2), dist = rnd(80, 260);
      const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 80;
      s.animate([{ transform: "translate(-50%,-50%) scale(.3)", opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1) rotate(${rnd(-180, 180)}deg)`, opacity: 1, offset: 0.35 }, { transform: `translate(calc(-50% + ${dx * 1.15}px),calc(-50% + ${dy + 380}px)) rotate(${rnd(-360, 360)}deg)`, opacity: 0 }], { duration: rnd(1600, 2400), easing: "cubic-bezier(.2,.7,.4,1)", fill: "both" });
    }
  },
  walk(ch, o = {}) {
    const L = fxLayer(), s = glyph(L, ch, o.size || 64, `left:0;bottom:${o.bottom ?? 12}vh`), hops = o.hops || 8, frames = [];
    for (let i = 0; i <= hops * 2; i++) frames.push({ transform: `translate(${-15 + (130 * i) / (hops * 2)}vw,${i % 2 ? -(o.hop ?? 6) : 0}vh) scaleX(-1)` });
    s.animate(frames, { duration: o.dur || 4200, easing: "linear", fill: "both" });
  },
  gentle(chars, x, y, n = 7) {
    const L = fxLayer(2600);
    for (let i = 0; i < n; i++) {
      const s = glyph(L, chars[i % chars.length], rnd(26, 40), `left:${x + rnd(-110, 110)}px;top:${y + rnd(-120, 10)}px`);
      s.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.5)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.25 }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)", offset: 0.7 }, { opacity: 0, transform: "translate(-50%,-50%) scale(1)" }], { duration: 2200, delay: i * 90, fill: "both" });
    }
  },
  fireworks(colors, bursts = 6) {
    const c = document.createElement("canvas"); c.className = "celebrate cfw"; document.body.appendChild(c);
    const fw = new Fireworks(c, colors, 1); for (let i = 0; i < bursts; i++) setTimeout(() => fw.launch(), i * 380 + rnd(0, 200));
    setTimeout(() => { fw.stop(); c.remove(); }, bursts * 380 + 2600);
  },
};

/* small fireworks engine, used for the July 4th background and for post celebrations */
class Fireworks {
  constructor(canvas, colors, alpha = 0.6) { this.c = canvas; this.g = canvas.getContext("2d"); this.colors = colors; this.alpha = alpha; this.p = []; this.on = true; this.fit(); this._fit = () => this.fit(); addEventListener("resize", this._fit); this.loop(); }
  fit() { const r = devicePixelRatio || 1; this.c.width = innerWidth * r; this.c.height = innerHeight * r; this.g.setTransform(r, 0, 0, r, 0, 0); }
  launch(x = rnd(innerWidth * 0.15, innerWidth * 0.85), y = rnd(innerHeight * 0.12, innerHeight * 0.5)) {
    const col = pickOne(this.colors), n = innerWidth < 720 ? 60 : 90, sp = rnd(3.2, 5.6);
    for (let i = 0; i < n; i++) { const a = (Math.PI * 2 * i) / n, v = sp * rnd(0.6, 1.1); this.p.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col: Math.random() < 0.15 ? "#ffffff" : col }); }
  }
  loop() {
    if (!this.on) return;
    const g = this.g; g.clearRect(0, 0, innerWidth, innerHeight); g.globalCompositeOperation = "lighter";
    this.p = this.p.filter(q => q.life > 0);
    for (const q of this.p) { q.x += q.vx; q.y += q.vy; q.vy += 0.045; q.vx *= 0.985; q.vy *= 0.985; q.life -= 0.011; g.globalAlpha = Math.max(0, q.life) * this.alpha; g.strokeStyle = g.fillStyle = q.col; g.lineWidth = 2.2; g.beginPath(); g.moveTo(q.x - q.vx * 3, q.y - q.vy * 3); g.lineTo(q.x, q.y); g.stroke(); g.beginPath(); g.arc(q.x, q.y, 2.2, 0, 6.283); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    this.raf = requestAnimationFrame(() => this.loop());
  }
  stop() { this.on = false; cancelAnimationFrame(this.raf); removeEventListener("resize", this._fit); }
}
let bgFireworks = null;
function backgroundFireworks(colors) {
  if (bgFireworks) { bgFireworks.fw.stop(); clearInterval(bgFireworks.t); bgFireworks.c.remove(); bgFireworks = null; }
  if (!colors || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas"); c.id = "holiFw"; c.setAttribute("aria-hidden", "true"); document.body.prepend(c);
  const fw = new Fireworks(c, colors, 0.8);
  const t = setInterval(() => { if (!document.hidden) fw.launch(); }, 1500);
  bgFireworks = { fw, t, c };
}

const CELEBRATIONS = {
  halloween: () => { FX.fly(["🦇"], 9, { size: [26, 44], wobble: 8 }); setTimeout(() => FX.rise(["👻"], 3, { size: [40, 56] }), 600); return "spooky"; },
  christmas: () => { FX.fly(["🦌🦌🛷🎅"], 1, { yMin: 10, yMax: 18, size: [44, 44], dur: [4200, 4200], spread: 0, wobble: 3 }); FX.rain(["❄️", "❄"], 18, { size: [14, 26] }); return "bells"; },
  newyear: () => { FX.fireworks(["#ffd166", "#c9a6ff", "#fff3c4", "#7df9ff"], 6); return () => { SOUNDS.boom(3); setTimeout(SOUNDS.pop, 300); }; },
  july4: () => { FX.fireworks(["#ff4d4d", "#ffffff", "#4d8bff"], 7); return () => SOUNDS.boom(4); },
  thanksgiving: () => { FX.walk("🦃", { size: 70, hops: 10, hop: 3 }); FX.rain(["🍂", "🍁"], 12); return "gobble"; },
  veterans: () => { FX.rise(["🇺🇸", "⭐"], 14, { size: [22, 36] }); return "chime"; },
  memorial: () => { FX.rise(["🇺🇸"], 10, { size: [24, 36] }); return "chime"; },
  mlk: () => { FX.fly(["🕊️"], 3, { dur: [4200, 5200], size: [34, 44], wobble: 4 }); return "chime"; },
  presidents: () => { FX.fly(["🦅"], 2, { size: [44, 56], dur: [3000, 3600] }); FX.rain(["⭐"], 12, { size: [14, 22] }); return "whoosh"; },
  valentines: () => { FX.rise(["❤️", "💖", "💕", "💘"], 20); return "chime"; },
  stpatricks: () => { FX.rain(["🍀", "☘️", "🪙"], 26); return "clink"; },
  easter: () => { FX.walk("🐇", { size: 60, hops: 7, hop: 9, dur: 3800 }); FX.rain(["🥚", "🌷"], 10); return "boing"; },
  mothers: () => { FX.rain(["🌸", "💐", "🌷"], 22); return "chime"; },
  fathers: (x, y) => { FX.burst(["🛠️", "🍔", "👔", "🔧"], x, y, 26); return "hammer"; },
  juneteenth: (x, y) => { FX.burst(["⭐", "✨", "🎉"], x, y, 34); return "chime"; },
  labor: (x, y) => { FX.burst(["🛠️", "⚙️", "👷", "🔩"], x, y, 28); return "hammer"; },
  columbus: () => { FX.fly(["🍂", "🍁"], 14, { size: [20, 34], dur: [1800, 2800], wobble: 10 }); return "whoosh"; },
  none: (x, y) => { FX.burst(["🎉", "✨", "🟧", "🟨", "🟦"], x, y, 36); return "pop"; },
};
const GENTLE = {halloween: ["🦇","🎃","👻"], christmas: ["🎄","🎁","❄️","🎅"], newyear: ["🎆","🥂","✨"], july4: ["🎆","🇺🇸","⭐"], thanksgiving: ["🦃","🍂","🥧"], veterans: ["🇺🇸","⭐","🎖️"], memorial: ["🇺🇸","🎖️"], mlk: ["🕊️"], presidents: ["🦅","⭐"], valentines: ["❤️","💖","💕"], stpatricks: ["🍀","🪙","🌈"], easter: ["🐇","🥚","🌷"], mothers: ["🌸","💐"], fathers: ["🛠️","🍔","👔"], juneteenth: ["⭐","✨","🎉"], labor: ["🛠️","⚙️","👷"], columbus: ["🍂","🍁"], none: ["🎉","✨"]};
function celebrate(originEl) {
  try {
    const key = (typeof holidayNow !== "undefined" && holidayNow && holidayNow.key) || "none";
    const r = originEl ? originEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const quiet = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let sound = "pop";
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (!document.body.animate) return; // very old browser
    if (!quiet) sound = (CELEBRATIONS[key] || CELEBRATIONS.none)(x, y);
    else { FX.gentle(GENTLE[key] || GENTLE.none, Math.min(Math.max(x, 130), innerWidth - 130), Math.max(y, 180)); const s = (CELEBRATIONS[key] || CELEBRATIONS.none).toString().match(/return "(\w+)"/); sound = s ? s[1] : "pop"; }
    let soundOn = true; try { soundOn = JSON.parse(localStorage.getItem("ub-celebrateSound") ?? "true"); } catch (e) {}
    if (soundOn && sound) (typeof sound === "function" ? sound : SOUNDS[sound] || SOUNDS.pop)();
  } catch (e) { console.warn("celebration skipped", e); /* a celebration should never break posting */ }
}
