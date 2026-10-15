/* ================= Unbadged closed beta: app logic =================
   Data lives in Supabase. Row-level security on the server decides who can see and change what;
   nothing in this file is trusted for security. */

const SB_URL = "https://ciaajponuxvvcttalvwa.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYWFqcG9udXh2dmN0dGFsdndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMzMzMTgsImV4cCI6MjEwNzYwOTMxOH0.2Zh9IbEojQr3HQtCfYQQOB1m5OQuav_4hf7hL6HMqd0";
const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const S = {
  uid: null, view: "home", filter: "All", profiles: new Map(), boards: [], posts: [], rooms: [], room: null,
  msgs: new Map(), members: new Map(), urls: new Map(), follows: { out: new Set(), in: new Set() },
  blocks: { user: new Set(), board: new Set(), room: new Set() }, shift: null, wages: new Map(),
  joined: new Set(), prof: true, hideLang: false, accent: "#ff7b30", dm: null, roomSettings: false,
  unread: new Map(), dmRoom: null, roomBans: [], notify: false,
};
const store = {
  get(k, d) { try { const v = localStorage.getItem("ub-" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ub-" + k, JSON.stringify(v)); } catch (e) {} },
};
S.prof = store.get("prof", true); S.hideLang = store.get("hideLang", false); S.notify = store.get("notify", false);

/* ---------- small helpers ---------- */
const P = id => S.profiles.get(id) || { id, username: "Someone", avatar: 0, role: "member", banned: false };
const isMe = id => id === S.uid;
const owner = () => P(S.uid).role === "owner";
const showBetaAv = p => p.beta && p.show_beta_av && p.role !== "owner";
const OT = id => { const p = P(id); return p.role === "owner" ? FTAG() : p.beta && p.show_beta_tag ? BTAG() : ""; };
function AV(id, size = "") {
  const p = P(id), pic = p.avatar_path && S.urls.get(p.avatar_path);
  if (pic) { const big = size === "lg" || size === "xl", im = `<img src="${pic}" alt="${big ? esc(p.username) + "'s profile photo" : ""}" ${big ? "data-zoom" : ""}>`; return p.role === "owner" ? `<span class="av ${size} oav avimg" aria-label="Founder"><span class="oav-in">${im}</span></span>` : showBetaAv(p) ? `<span class="av ${size} bav avimg" aria-label="Beta tester"><span class="bav-in">${im}</span></span>` : `<span class="av ${size} avimg" aria-hidden="${size === "lg" || size === "xl" ? "false" : "true"}">${im}</span>`; }
  if (p.role === "owner") return OWNER_AV(size);
  if (showBetaAv(p)) return BETA_AV(size);
  const i = Math.max(0, Math.min(9, p.avatar || 0));
  return `<span class="av ${size}" style="background:${AV_COL[i]}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${AV_GLY[i][1]}"/></svg></span>`;
}
function avByIdx(i, size = "") {
  return `<span class="av ${size}" style="background:${AV_COL[i]}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${AV_GLY[i][1]}"/></svg></span>`;
}
const UL = id => {
  const p = P(id), cls = p.role === "owner" ? "oname" : "";
  return isMe(id) ? `<span class="mono ${cls}">${esc(p.username)}</span>${OT(id)}`
    : `<button class="ulink mono ${cls}" data-user="${id}">${esc(p.username)}</button>${OT(id)}`;
};
const ago = t => { const m = Math.round((Date.now() - new Date(t)) / 6e4); return m < 1 ? "now" : m < 60 ? m + "m" : m < 1440 ? Math.round(m / 60) + "h" : Math.round(m / 1440) + "d"; };
const chicagoDay = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
const mutual = id => S.follows.out.has(id) && S.follows.in.has(id);
const errMsg = e => (e && (e.message || e.error_description)) || "Something went wrong. Try again.";
async function fnError(error) { try { const j = await error.context.json(); return j.error || errMsg(error); } catch (e) { return errMsg(error); } }
function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.textContent; btn.textContent = label || "Working…"; btn.disabled = true; } else { btn.textContent = btn.dataset.l || btn.textContent; btn.disabled = false; } }

const ADJ = ["Overnight","Backroom","Freight","Register","Night","Dock","Aisle","Shift","Pallet","Break","Clocked","Headset"];
const NOUN = ["Owl","Ghost","Runner","Hero","Fairy","Bandit","Wizard","Legend","Captain","Rider","Goblin","Ranger"];
const pick = a => a[Math.floor(Math.random() * a.length)];
const newHandle = () => `${pick(ADJ)}_${pick(NOUN)}_${Math.floor(10 + Math.random() * 9890)}`;
const WORDLIST = ("acorn actor adobe agent alarm album alley amber anchor angle ankle apple apron arena armor arrow atlas attic autumn avocado badge bagel baker bamboo banjo barn barrel basil basket beacon beaver bench berry bicycle biscuit blanket blizzard bloom bonfire boots bottle boulder bracket breeze brick bridge bronze broom bubble bucket buffalo bugle bundle burger butter cabin cactus camera canal candle canoe canyon captain carbon cargo carpet carrot castle cedar cellar chalk channel cherry chimney cider cinder circus citrus clamp clover cobalt cocoa comet compass copper coral cotton cougar cowboy coyote crane crater crayon cricket crystal cupcake curtain cyclone daisy dancer delta denim desert diesel dingo dolphin domino donut dragon drift drum dune eagle easel echo eclipse elbow ember emerald engine falcon fender ferry fiddle finch flag flame flannel flint forest fossil fountain fox frost galaxy garage garden garnet gasket gazelle geyser ginger glacier globe goblet gopher granite gravel guitar gumbo hammer harbor harvest hatchet hazel helmet hickory honey hornet husky iceberg igloo indigo island ivory jacket jaguar jasmine jelly jigsaw jungle kayak kernel kettle kiwi koala ladder lagoon lantern laser lava lemon lentil lever lilac lime linen lizard llama lobster locket lumber magnet mango maple marble meadow melon meteor mint mitten mocha monsoon moose mosaic muffin mural mustang nectar needle nickel noodle nutmeg oasis ocean olive onyx orbit orchid otter oyster paddle pancake panda panther parade parrot pasta peach peanut pebble pecan pelican pepper piano pickle pigeon pillow pine pistol pixel planet plaza pocket polka pony popcorn poppy prairie pretzel prism pumpkin puzzle quail quarry quartz quilt rabbit radar radish raft rainbow raven razor relay ribbon ridge rocket rodeo rooster rubber ruby saddle saffron salmon sandal satin scarf scooter sequoia shadow shamrock shovel signal silver skate sketch sled slipper socket sonar spark sparrow spider spinach spruce squash static steam stitch storm sugar summit sunset swallow syrup taco talon tango teapot temple thistle thunder tiger timber toast tomato topaz torch tractor trail trumpet tulip tundra turbo turtle tuxedo umbrella unicorn valley vanilla velvet violet volcano wafer waffle walnut walrus wander warbler wasabi whistle widget willow window winter wizard wombat yarrow yodel zebra zephyr zipper").split(" ");
function newPhrase() { const r = new Uint32Array(6); crypto.getRandomValues(r); return [...r].map(x => WORDLIST[x % WORDLIST.length]).join("-"); }
const normPhrase = s => s.trim().toLowerCase().split(/[\s,-]+/).filter(Boolean).join("-");

function nameProblem(n, allowReserved) {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(n)) return "Use 3 to 20 letters, numbers, or underscores. No spaces.";
  if (/^\d+$/.test(n)) return "Add at least one letter.";
  if (/\d{7,}/.test(n)) return "That has a long string of numbers. Leave out phone numbers and IDs.";
  if (!allowReserved && /(owner|founder|admin|moderator|mod_|staff|official|unbadged|support)/i.test(n)) return "That name is reserved so nobody can pretend to run Unbadged. Try another.";
  if (new RegExp(PROF.source, "i").test(n.replace(/_/g, " "))) return "Pick a username without swear words.";
  return null;
}
function setAccent(c) { S.accent = c; document.documentElement.style.setProperty("--accent", c); store.set("accent", c); }
setAccent(store.get("accent", "#ff7b30"));

/* ---------- photos: signed links, upload ---------- */
async function signUrls(paths) {
  const need = [...new Set(paths.filter(p => p && !S.urls.has(p)))];
  if (!need.length) return;
  const { data } = await sb.storage.from("photos").createSignedUrls(need, 3600);
  (data || []).forEach(d => { if (d.signedUrl) S.urls.set(d.path, d.signedUrl); });
}
async function uploadPhoto(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${S.uid}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  S.urls.set(path, dataUrl);
  return path;
}
const img = (path, alt) => path ? `<img src="${S.urls.get(path) || ""}" alt="${esc(alt)}" loading="lazy" data-zoom tabindex="0" role="button" aria-label="${esc(alt)}. Tap to view full screen.">` : "";

/* ---------- full-screen photo viewer: tap to open, pinch or double-tap to zoom, drag to pan, swipe down or tap to close ---------- */
function openViewer(src, alt) {
  const ov = document.createElement("div");
  ov.className = "viewer"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "Photo viewer");
  ov.innerHTML = `<button class="vclose" aria-label="Close photo">✕</button><img src="${src}" alt="${esc(alt || "Photo")}" draggable="false">`;
  document.body.appendChild(ov); document.body.style.overflow = "hidden";
  const im = ov.querySelector("img"), pts = new Map();
  let sc = 1, tx = 0, ty = 0, startDist = 0, startSc = 1, last = null, moved = false, lastTap = 0, downY = 0;
  const apply = (anim) => { im.style.transition = anim ? "transform .2s ease" : "none"; im.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`; ov.style.background = `rgba(0,0,0,${sc === 1 ? Math.max(.35, .94 - Math.abs(ty) / 500) : .94})`; };
  const clamp = () => { if (sc <= 1) { sc = 1; tx = 0; ty = 0; return; } const r = im.getBoundingClientRect(), bw = im.offsetWidth * sc, bh = im.offsetHeight * sc, mx = Math.max(0, (bw - innerWidth) / 2), my = Math.max(0, (bh - innerHeight) / 2); tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty)); };
  const close = () => { ov.remove(); document.body.style.overflow = ""; document.removeEventListener("keydown", key); };
  const key = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key);
  ov.querySelector(".vclose").onclick = e => { e.stopPropagation(); close(); };
  const zoomAt = (x, y, to) => { const cx = x - innerWidth / 2, cy = y - innerHeight / 2, k = to / sc; tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; sc = to; clamp(); apply(true); };
  ov.addEventListener("pointerdown", e => {
    if (e.target.closest(".vclose")) return;
    ov.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; downY = e.clientY;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a.x - b.x, a.y - b.y); startSc = sc; }
    last = { x: e.clientX, y: e.clientY };
  });
  ov.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); sc = Math.max(1, Math.min(5, startSc * d / startDist)); moved = true; apply(false); return; }
    const dx = e.clientX - last.x, dy = e.clientY - last.y; last = { x: e.clientX, y: e.clientY };
    if (Math.abs(e.clientY - downY) > 6 || Math.abs(dx) > 6) moved = true;
    if (sc > 1) { tx += dx; ty += dy; clamp(); } else ty += dy; // at normal size, dragging moves the photo to swipe-close
    apply(false);
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (pts.size) { last = [...pts.values()][0]; return; }
    if (sc === 1 && Math.abs(ty) > 110) { close(); return; }
    if (!moved) {
      const now = Date.now();
      if (now - lastTap < 300) { lastTap = 0; zoomAt(e.clientX, e.clientY, sc > 1 ? 1 : 2.5); return; }
      lastTap = now;
      const tapX = e.clientX, tapY = e.clientY, onImg = e.target === im;
      setTimeout(() => { if (lastTap === now && sc === 1 && !onImg) close(); }, 300);
      return;
    }
    clamp(); apply(true);
  };
  ov.addEventListener("pointerup", up); ov.addEventListener("pointercancel", up);
  ov.addEventListener("wheel", e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.max(1, Math.min(5, sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2)))); }, { passive: false });
  apply(false); ov.querySelector(".vclose").focus();
}
document.addEventListener("click", e => { const z = e.target.closest("img[data-zoom]"); if (z && z.src) { e.preventDefault(); e.stopPropagation(); openViewer(z.src, z.alt); } }, true);
document.addEventListener("keydown", e => { const z = e.target.closest && e.target.closest("img[data-zoom]"); if (z && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openViewer(z.src, z.alt); } });

/* ---------- face detection (runs on the device, before upload) ---------- */
let faceDet = null;
async function getFaceDetector() {
  if (faceDet !== null) return faceDet;
  try {
    const V = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
    const vision = await import(V);
    const files = await vision.FilesetResolver.forVisionTasks(V + "/wasm");
    faceDet = await vision.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite" },
      runningMode: "IMAGE", minDetectionConfidence: 0.5,
    });
  } catch (e) { faceDet = false; }
  return faceDet;
}
async function findFaces(cv) {
  const fd = await getFaceDetector(); if (!fd) return null;
  const out = [];
  // only keep detections that look like a real face: confident, roughly square, eyes above nose above mouth
  const looksLikeFace = (d, iw, ih, minScore) => {
    const sc = d.categories && d.categories[0] ? d.categories[0].score : 0;
    if (sc < minScore) return false;
    const b = d.boundingBox, ar = b.width / b.height;
    if (ar < 0.55 || ar > 1.6) return false;
    const k = d.keypoints;
    if (!k || k.length < 4) return true;
    const px = i => ({ x: k[i].x * iw, y: k[i].y * ih });
    const re = px(0), le = px(1), nose = px(2), mouth = px(3), eyeY = (re.y + le.y) / 2, eyeD = Math.abs(re.x - le.x);
    if (eyeD < b.width * 0.2 || eyeD > b.width * 0.8) return false;
    if (Math.abs(re.y - le.y) > eyeD * 0.6) return false;
    if (!(mouth.y > eyeY + eyeD * 0.3)) return false;
    if (nose.y < eyeY - eyeD * 0.15 || nose.y > mouth.y + eyeD * 0.15) return false;
    const mx = (re.x + le.x) / 2;
    if (Math.abs(nose.x - mx) > eyeD * 0.7 || Math.abs(mouth.x - mx) > eyeD * 0.7) return false;
    return true;
  };
  const add = (dets, ox, oy, iw, ih, minScore) => dets.filter(d => looksLikeFace(d, iw, ih, minScore)).forEach(d => { const b = d.boundingBox; out.push({ x: ox + b.originX, y: oy + b.originY, w: b.width, h: b.height }); });
  try {
    add(fd.detect(cv).detections, 0, 0, cv.width, cv.height, 0.6);
    // also scan four overlapping tiles so small faces in group photos get caught
    const W = cv.width, H = cv.height, tw = Math.round(W * 0.6), th = Math.round(H * 0.6);
    for (const [ox, oy] of [[0, 0], [W - tw, 0], [0, H - th], [W - tw, H - th]]) {
      const t = document.createElement("canvas"); t.width = tw; t.height = th; t.getContext("2d").drawImage(cv, ox, oy, tw, th, 0, 0, tw, th);
      add(fd.detect(t).detections, ox, oy, tw, th, 0.72);
    }
  } catch (e) { return out.length ? out : null; }
  // merge boxes that overlap a lot
  const merged = [];
  out.forEach(b => {
    const m = merged.find(a => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return ix * iy > 0.3 * Math.min(a.w * a.h, b.w * b.h); });
    if (m) { const x = Math.min(m.x, b.x), y = Math.min(m.y, b.y); m.w = Math.max(m.x + m.w, b.x + b.w) - x; m.h = Math.max(m.y + m.h, b.y + b.h) - y; m.x = x; m.y = y; } else merged.push({ ...b });
  });
  return merged;
}

function processPhoto(file, pctx, done) {
  const close = modal(`<div class="pmhead"><h2>Photo check</h2><button class="btn small" id="pmX">Cancel</button></div>
   <div class="pmsteps" id="pmSteps"><span class="muted" style="font-size:13px">Checking photo…</span></div>
   <div class="pmcanvas"><canvas id="pmC" aria-label="Photo preview. Tap to blur a spot."></canvas></div>
   <p class="fine" id="pmHint" style="margin:0"></p>
   <div class="row"><span class="fine" style="flex:1;min-width:160px">${esc(pctx.note)}</span><button class="btn small" id="pmUndo" hidden>Undo last blur</button><button class="btn primary" id="pmOk" disabled>Use photo</button></div>`);
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = async () => {
      const sc = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), W = Math.round(im.naturalWidth * sc), H = Math.round(im.naturalHeight * sc);
      const cv = $("#pmC"); if (!cv) return; cv.width = W; cv.height = H; const g = cv.getContext("2d");
      let auto = [], manual = [];
      const draw = () => { g.drawImage(im, 0, 0, W, H); [...auto, ...manual].forEach(b => pixelate(g, im, b, W, H)); const u = $("#pmUndo"); if (u) u.hidden = !manual.length; };
      draw();
      const steps = $("#pmSteps"), add = (t, cls = "okchip") => { if (!steps) return; if (steps.querySelector(".muted")) steps.innerHTML = ""; steps.insertAdjacentHTML("beforeend", `<span class="${cls}">${t}</span>`); };
      add("✓ Location and camera data removed");
      let hint = "Tap anywhere on the photo to blur something yourself.";
      if (pctx.blur) {
        add("Finding faces…", "sample");
        const f = await findFaces(cv);
        steps && steps.lastElementChild && steps.lastElementChild.remove();
        if (f === null) hint = "Face detection couldn't load on this device. Tap each face to blur it before you post.";
        else { auto = f; hint = "Tap to blur anything it missed."; }
        draw(); add(auto.length ? `✓ ${auto.length} face${auto.length > 1 ? "s" : ""} blurred` : "No faces found", auto.length ? "okchip" : "sample");
      } else add("Faces left visible (allowed here)", "sample");
      $("#pmHint").textContent = hint; $("#pmOk").disabled = false;
      cv.onclick = e => { const rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * H / rc.height, s = Math.min(W, H) * .2; manual.push({ x: x - s / 2, y: y - s / 2, w: s, h: s }); draw(); };
      $("#pmUndo").onclick = () => { manual.pop(); draw(); };
      $("#pmOk").onclick = () => { const url = cv.toDataURL("image/jpeg", .85); close(); done(url); };
    };
    im.onerror = () => { close(); toast("That file couldn't be opened as a photo."); };
    im.src = r.result;
  };
  r.readAsDataURL(file);
}

/* ---------- loading data ---------- */
async function loadProfiles() {
  const { data } = await sb.from("profiles").select("id,username,avatar,avatar_path,role,banned,company,bio,interests,hobbies,likes,beta,show_beta_av,show_beta_tag");
  S.profiles = new Map((data || []).map(p => [p.id, p]));
  const need = [...S.profiles.values()].map(p => p.avatar_path).filter(x => x && !S.urls.has(x));
  if (need.length) { const { data: sg } = await sb.storage.from("photos").createSignedUrls(need, 86400); (sg || []).forEach(d => { if (d.signedUrl) S.urls.set(d.path, d.signedUrl); }); }
}
async function loadSocial() {
  const [f, b] = await Promise.all([
    sb.from("follows").select("follower,followee").or(`follower.eq.${S.uid},followee.eq.${S.uid}`),
    sb.from("blocks").select("kind,target"),
  ]);
  S.follows = { out: new Set(), in: new Set() };
  (f.data || []).forEach(r => { if (r.follower === S.uid) S.follows.out.add(r.followee); else S.follows.in.add(r.follower); });
  S.blocks = { user: new Set(), board: new Set(), room: new Set() };
  (b.data || []).forEach(r => S.blocks[r.kind] && S.blocks[r.kind].add(r.target));
}
async function loadBoards() {
  const [{ data }, mine] = await Promise.all([sb.from("boards").select("*").order("sort"), sb.from("board_members").select("board")]);
  S.boards = data || [];
  if (!mine.error && (mine.data || []).length) { S.joined = new Set(mine.data.map(r => r.board)); return; }
  // first time on the server: bring over this phone's boards, or start with sensible defaults
  const me = P(S.uid), co = S.boards.find(b => b.id.toLowerCase() === ("b/" + (me.company || "").replace(/\s+/g, "")).toLowerCase());
  const start = store.get("joined:" + S.uid, null) || [...(co ? [co.id] : []), "b/NightShift", "b/Retail"];
  S.joined = new Set(start.filter(id => S.boards.some(b => b.id === id)));
  if (!mine.error && S.joined.size) await sb.from("board_members").insert([...S.joined].map(board => ({ board })));
}
async function joinBoard(id, on) {
  const { error } = on ? await sb.from("board_members").insert({ board: id }) : await sb.from("board_members").delete().eq("board", id).eq("user_id", S.uid);
  if (error && !/duplicate/.test(error.message)) { toast(errMsg(error)); return false; }
  on ? S.joined.add(id) : S.joined.delete(id);
  if (!on) { S.rooms.filter(r => r.kind === "public" && r.board === id).forEach(c => { S.members.set(c.id, (S.members.get(c.id) || []).filter(m => !isMe(m.user_id))); S.unread.delete(c.id); }); paintUnread(); }
  return true;
}
async function enrichPosts(list) {
  const ids = list.map(p => p.id);
  let cms = [], vts = [];
  if (ids.length) {
    const [c, v] = await Promise.all([
      sb.from("comments").select("id,post_id,user_id,body,created_at").in("post_id", ids).order("created_at"),
      sb.from("votes").select("post_id,user_id,value").in("post_id", ids),
    ]);
    cms = c.data || []; vts = v.data || [];
  }
  list.forEach(p => {
    p.comments = cms.filter(c => c.post_id === p.id);
    const pv = vts.filter(v => v.post_id === p.id);
    p.score = pv.reduce((a, v) => a + v.value, 0);
    p.my = (pv.find(v => v.user_id === S.uid) || {}).value || 0;
  });
  await signUrls(list.map(p => p.img_path));
  return list;
}
async function loadFeed() {
  const { data: posts } = await sb.from("posts").select("id,user_id,board,title,body,strong,img_path,created_at").order("created_at", { ascending: false }).limit(100);
  S.posts = await enrichPosts(posts || []);
}
async function loadUserPosts(id) {
  const { data } = await sb.from("posts").select("id,user_id,board,title,body,strong,img_path,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(60);
  S.uPosts = await enrichPosts(data || []); S.uPostsFor = id;
}
const findPost = id => S.posts.find(x => x.id == id) || (S.uPosts || []).find(x => x.id == id);
async function reloadPosts() { if (S.view === "profile") { await loadUserPosts(S.profileId); S.feedLoaded = false; } else await loadFeed(); }
const rerenderPosts = () => S.view === "profile" ? renderProfile() : renderHome();
async function loadShift() {
  const [r, m] = await Promise.all([sb.rpc("shift_results"), sb.from("shift_answers").select("choice").eq("day", chicagoDay()).maybeSingle()]);
  const counts = [0, 0, 0, 0]; (r.data || []).forEach(x => counts[x.choice] = Number(x.n));
  S.shift = { counts, mine: m.data ? m.data.choice : null };
}

/* ---------- unread counts & notifications ---------- */
async function loadUnread() {
  const { data, error } = await sb.rpc("my_unread"); if (error) return;
  S.unread = new Map((data || []).map(u => [u.room_id, { kind: u.kind, name: u.name, other: u.other, muted: u.muted, n: Number(u.n) }]));
}
const unreadTotal = kind => [...S.unread.values()].filter(u => u.kind === kind && !u.muted && !(u.other && S.blocks.user.has(u.other))).reduce((a, u) => a + u.n, 0);
const dmRoomOf = uid => [...S.unread.entries()].find(([, u]) => u.kind === "dm" && u.other === uid);
const ubadge = (roomId, n) => `<span class="ubadge" data-ub="${roomId}" ${n ? "" : "hidden"}>${n > 99 ? "99+" : n}</span>`;
function paintUnread() {
  renderNav();
  document.querySelectorAll("[data-ub]").forEach(el => { const u = S.unread.get(el.dataset.ub), n = u ? u.n : 0; el.hidden = !n; el.textContent = n > 99 ? "99+" : n; });
  const t = unreadTotal("group") + unreadTotal("public") + unreadTotal("dm"); document.title = t ? `(${t}) Unbadged` : "Unbadged";
}
async function markRead(roomId) {
  const u = S.unread.get(roomId); if (!u) return;
  u.n = 0; paintUnread();
  await sb.from("room_members").update({ last_read: new Date().toISOString() }).eq("room_id", roomId).eq("user_id", S.uid);
}
let swReg = null;
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(r => { swReg = r; }).catch(() => {});
  navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.openRoom) openRoomFromAlert(e.data.openRoom); });
}
const alertsOn = () => S.notify && "Notification" in window && Notification.permission === "granted";
function openRoomFromAlert(roomId) {
  const u = S.unread.get(roomId); if (!u) return;
  if (u.kind === "dm") { S.dm = u.other; go("dms"); } else { S.room = roomId; go("chats"); }
}
function notifyNew(m, u) {
  const who = P(m.user_id).username, where = u.kind === "dm" ? who : u.name || "a group chat";
  let text = m.img_path && !m.body ? "Sent a photo" : (m.body || "").slice(0, 90);
  if (S.prof) text = text.replace(new RegExp(PROF.source, "gi"), "****");
  if (!document.hidden) { toast(u.kind === "dm" ? `💬 ${who}: ${text}` : `💬 ${who} in ${where}: ${text}`); return; }
  if (!alertsOn()) return;
  const title = u.kind === "dm" ? who : `${who} in ${where}`, opts = { body: text, icon: "/icon-512.png", badge: "/icon-180.png", tag: m.room_id, renotify: true, data: { room: m.room_id } };
  try { if (swReg) swReg.showNotification(title, opts); else { const n = new Notification(title, opts); n.onclick = () => { window.focus(); openRoomFromAlert(m.room_id); }; } } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden || !S.uid) return;
  loadUnread().then(() => { const open = S.view === "chats" && !S.roomSettings ? S.room : S.view === "dms" ? S.dmRoom : null; if (open && S.unread.get(open)?.n) markRead(open); else paintUnread(); });
});

/* ---------- nav ---------- */
const NAV = [["home", "Home", ICON.home], ["pay", "Pay Check", ICON.pay], ["boards", "Boards", ICON.boards], ["chats", "Chats", ICON.chat], ["dms", "Messages", ICON.dm], ["radio", "Radio", ICON.radio]];
const SHORT = { pay: "Pay", dms: "DMs" };
function renderNav() {
  const b = ([id, label, ic]) => { const c = id === "chats" ? unreadTotal("group") + unreadTotal("public") : id === "dms" ? unreadTotal("dm") : 0; return `<button class="navbtn" data-view="${id}" ${S.view === id ? 'aria-current="page"' : ""}>${ic}<span>${label}</span>${c ? `<span class="count" aria-label="${c} unread">${c > 99 ? "99+" : c}</span>` : ""}</button>`; };
  $("#navMain").innerHTML = (owner() ? [...NAV, ["owner", "Owner tools", ICON.plus]] : NAV).map(b).join("");
  $("#tabs").innerHTML = (owner() ? [...NAV, ["owner", "Owner", ICON.plus]] : NAV).map(([id, l, ic]) => b([id, SHORT[id] || l, ic])).join("");
  $("#myBoards").innerHTML = [...S.joined].filter(x => !S.blocks.board.has(x)).map(x => `<button class="boardlink" data-board="${esc(x)}">${esc(x)}</button>`).join("");
  const me = P(S.uid);
  $("#meHandle").textContent = me.username; $("#meHandle").classList.toggle("oname", me.role === "owner");
  $("#meTag").innerHTML = OT(S.uid); $("#meAv").innerHTML = AV(S.uid, "sm"); $("#meCog").innerHTML = COG;
  ["#meAv", "#meHandle"].forEach(k => { const el = $(k); el.dataset.user = S.uid; el.style.cursor = "pointer"; el.title = "Your profile"; });
  $("#navBottom").innerHTML = `<button class="navbtn" data-view="settings" ${S.view === "settings" ? 'aria-current="page"' : ""}>${COG}<span>Settings</span></button>`;
}
async function go(view) { S.view = view; S.roomSettings = false; await render(); const m = $("#main"); if (m) m.scrollTop = 0; }
document.addEventListener("click", e => {
  const v = e.target.closest("[data-view]"); if (v) { go(v.dataset.view); return; }
  const b = e.target.closest("[data-board]"); if (b) { S.filter = b.dataset.board; go("home"); return; }
  const u = e.target.closest("[data-user]"); if (u) { e.preventDefault(); openUser(u.dataset.user); return; }
  const p = e.target.closest(".prof"); if (p) p.classList.toggle("show");
});

/* ---------- home ---------- */
const POLL = { q: "How's staffing on your shift tonight?", opts: ["Fully staffed", "A little short", "Skeleton crew", "I am the whole crew"] };
function shiftReportHTML() {
  if (!S.shift) return "";
  const tot = S.shift.counts.reduce((a, b) => a + b, 0);
  return `<div class="card sr"><div class="srhead"><span class="eyebrow">Tonight's Shift Report</span><span class="mono muted">${tot} answer${tot === 1 ? "" : "s"} · resets midnight</span></div>
  <h3 class="srq">${POLL.q}</h3>
  ${S.shift.mine == null ? `<div class="sropts">${POLL.opts.map((o, i) => `<button class="btn" data-poll="${i}">${o}</button>`).join("")}</div>`
    : `<div class="bars">${POLL.opts.map((o, i) => { const pc = tot ? Math.round(S.shift.counts[i] / tot * 100) : 0; return `<div class="barrow ${i === S.shift.mine ? "mine" : ""}"><span>${o}${i === S.shift.mine ? " · you" : ""}</span><span class="mono">${pc}%</span><i style="width:${pc}%"></i></div>`; }).join("")}</div>`}
  </div>`;
}
function postHTML(p) {
  const pic = p.img_path ? `<div class="pimg">${img(p.img_path, "Photo posted by " + P(p.user_id).username)}</div>` : "";
  const inner = `<h3>${T(p.title)}</h3>${p.body ? `<p>${T(p.body)}</p>` : ""}${pic}`;
  const coms = p.comments.filter(c => !S.blocks.user.has(c.user_id));
  return `<article class="card post" data-id="${p.id}">
   <div class="votes"><button class="up" aria-label="Upvote" aria-pressed="${p.my === 1}" data-vote="1">▲</button><span class="n">${p.score}</span><button class="down" aria-label="Downvote" aria-pressed="${p.my === -1}" data-vote="-1">▼</button></div>
   <div class="pbody">
    <div class="meta">${AV(p.user_id, "sm")}<span class="board">${esc(p.board)}</span>${UL(p.user_id)}${P(p.user_id).company ? `<span class="co">${esc(P(p.user_id).company)}</span>` : ""}${p.strong ? '<span class="r18">LANGUAGE</span>' : ""}<span>· ${ago(p.created_at)}</span></div>
    ${inner}
    <div class="actions"><button class="act" data-cmt="${p.id}">💬 ${coms.length} comment${coms.length === 1 ? "" : "s"}</button>
     ${isMe(p.user_id) ? `<button class="act" data-delpost="${p.id}">Delete</button>` : `<button class="act" data-rpt='${esc(JSON.stringify({ kind: "post", name: P(p.user_id).username, id: p.id }))}'>⚑ Report</button>`}
     ${owner() && !isMe(p.user_id) ? `<button class="act" data-oremove="${p.id}">Remove (owner)</button>` : ""}</div>
    <div class="comments" id="c${p.id}" ${S.openC === p.id ? "" : "hidden"}>${coms.map(c => `<div class="cmt"><div class="who2">${AV(c.user_id, "sm")}${UL(c.user_id)}<span class="fine">${ago(c.created_at)}</span></div><div>${T(c.body)}</div></div>`).join("")}
     <div class="row"><input type="text" id="ci${p.id}" placeholder="Add a reply" maxlength="2000" style="flex:1;min-width:0"><button class="btn small primary" data-reply="${p.id}">Reply</button></div><div class="warn" id="cw${p.id}" hidden></div></div>
   </div></article>`;
}
async function renderHome() {
  if (!S.feedLoaded) { await Promise.all([loadFeed(), loadShift()]); S.feedLoaded = true; }
  const filters = ["All", ...[...S.joined].filter(x => !S.blocks.board.has(x))];
  const list = S.posts.filter(p => !S.blocks.user.has(p.user_id) && !S.blocks.board.has(p.board) && (S.filter === "All" || p.board === S.filter) && !(S.hideLang && p.strong && !isMe(p.user_id)));
  const boardOpts = S.boards.filter(b => !b.locked && !S.blocks.board.has(b.id));
  const def = S.filter !== "All" ? S.filter : [...S.joined][0];
  $("#main").innerHTML = `<div class="col">
   <div class="viewhead"><h1>${S.filter === "All" ? "Your feed" : esc(S.filter)}</h1><span class="muted" style="font-size:13px">Posting as <span class="mono">${esc(P(S.uid).username)}</span></span></div>
   ${S.filter !== "All" ? `<div class="row boardbar"><span class="fine">Viewing ${esc(S.filter)}</span><span style="flex:1"></span><button class="act" data-rpt='${esc(JSON.stringify({ kind: "board", name: S.filter }))}'>⚑ Report board</button><button class="act" data-bboard="${esc(S.filter)}">⊘ Block board</button></div>` : ""}
   <div class="chips">${filters.map(f => `<button class="chip" data-filter="${esc(f)}" aria-pressed="${S.filter === f}">${esc(f)}</button>`).join("")}</div>
   <div id="mobBrk" class="mobrail">${breakHTML()}</div>
   ${shiftReportHTML()}
   <div class="card composer">
    <textarea id="draft" maxlength="5000" placeholder="What happened on shift? First line is the title. Vent about the job, not specific people."></textarea>
    <div class="warn" id="draftWarn" hidden></div>
    <div class="preview" id="draftPrev" hidden></div>
    <div class="row">
     <select id="draftBoard" aria-label="Post to board">${boardOpts.map(b => `<option ${b.id === def ? "selected" : ""}>${esc(b.id)}</option>`).join("")}</select>
     <label class="btn small" for="draftFile">📷 Photo</label><input type="file" id="draftFile" accept="image/*" hidden>
     <label class="toggle"><input type="checkbox" id="draft18"> Strong language</label>
     <span style="flex:1"></span>
     <button class="btn primary" id="postBtn">Post</button>
    </div>
   </div>
   ${list.map(postHTML).join("") || '<div class="card" style="padding:20px"><span class="muted">Nothing here yet. Be the first to post.</span></div>'}
  </div>`;
  const d = $("#draft"), w = $("#draftWarn"), pb = $("#postBtn");
  d.oninput = () => { const m = check(d.value); w.hidden = !m; w.textContent = m || ""; pb.disabled = !!m; };
  const usePhoto = url => { S.draftImg = url; const pr = $("#draftPrev"); pr.hidden = false; pr.innerHTML = `<div class="row"><img src="${url}" alt="Your photo"><span class="okchip">✓ Passed photo check</span><button class="btn small" id="rmImg">Remove</button></div>`; $("#rmImg").onclick = () => { S.draftImg = null; pr.hidden = true; }; };
  $("#draftFile").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) processPhoto(f, { blur: true, note: "Public post. Faces are always blurred." }, usePhoto); };
  pb.onclick = async () => {
    const txt = d.value.trim(); if (!txt) { toast("Write something first. The first line is the title."); return; }
    const [title, ...rest] = txt.split("\n");
    busy(pb, true, "Posting…");
    try {
      const img_path = S.draftImg ? await uploadPhoto(S.draftImg) : null;
      const { error } = await sb.from("posts").insert({ board: $("#draftBoard").value, title: title.slice(0, 200), body: rest.join("\n").trim(), strong: $("#draft18").checked, img_path });
      if (error) throw error;
      S.draftImg = null; await loadFeed(); renderHome(); toast("Posted");
    } catch (e) { busy(pb, false); toast(errMsg(e)); }
  };
}
document.addEventListener("click", async e => {
  const f = e.target.closest("[data-filter]"); if (f) { S.filter = f.dataset.filter; renderHome(); return; }
  const pl = e.target.closest("[data-poll]");
  if (pl) { const { error } = await sb.from("shift_answers").insert({ choice: +pl.dataset.poll }); if (error) toast(errMsg(error)); await loadShift(); renderHome(); toast("Counted. Come back tomorrow for a new question."); return; }
  const v = e.target.closest("[data-vote]");
  if (v) {
    const p = findPost(v.closest(".post").dataset.id), n = +v.dataset.vote;
    const res = p.my === n ? await sb.from("votes").delete().eq("post_id", p.id).eq("user_id", S.uid) : await sb.from("votes").upsert({ post_id: p.id, user_id: S.uid, value: n });
    if (res.error) { toast(errMsg(res.error)); return; }
    p.score += (p.my === n ? -n : n - p.my); p.my = p.my === n ? 0 : n; const q = S.posts.find(x => x.id === p.id); if (q && q !== p) { q.score = p.score; q.my = p.my; } rerenderPosts(); return;
  }
  const c = e.target.closest("[data-cmt]"); if (c) { const el = $("#c" + c.dataset.cmt); el.hidden = !el.hidden; S.openC = el.hidden ? null : +c.dataset.cmt; return; }
  const rp = e.target.closest("[data-reply]");
  if (rp) {
    const id = +rp.dataset.reply, inp = $("#ci" + id), w = $("#cw" + id), m = check(inp.value);
    if (m) { w.hidden = false; w.textContent = m; return; } if (!inp.value.trim()) return;
    busy(rp, true, "…"); const { error } = await sb.from("comments").insert({ post_id: id, body: inp.value.trim() });
    if (error) { busy(rp, false); toast(errMsg(error)); return; }
    S.openC = id; await reloadPosts(); rerenderPosts(); return;
  }
  const dp = e.target.closest("[data-delpost]");
  if (dp) { const { error } = await sb.from("posts").delete().eq("id", +dp.dataset.delpost); if (error) { toast(errMsg(error)); return; } await reloadPosts(); rerenderPosts(); toast("Post deleted"); return; }
  const orm = e.target.closest("[data-oremove]");
  if (orm) { const { error } = await sb.rpc("remove_post", { p_id: +orm.dataset.oremove }); if (error) { toast(errMsg(error)); return; } await reloadPosts(); rerenderPosts(); toast("Post removed for everyone"); return; }
});

/* ---------- pay check ---------- */
// Public pay is the starting point. Member reports (once 3+ people share a job) pull the numbers toward
// what members actually make. Public data counts like PAY_K reports, so after PAY_K member reports it's half and half.
const PAY_K = 10;
function payStats(w) {
  const s = S.wages.get(wLabel(w));
  if (!s) return { lo: w.lo, med: w.med, hi: w.hi, n: 0, m: 0 };
  const n = Number(s.n), m = n / (n + PAY_K), mix = (a, b) => (1 - m) * a + m * b;
  return { lo: mix(w.lo, +s.lo), med: mix(w.med, +s.med), hi: mix(w.hi, +s.hi), n, m };
}
const paySrc = p => p.n ? `Public + ${p.n} report${p.n > 1 ? "s" : ""}` : "Public data";
function payRowsHTML() {
  const cat = S.payCat || "All", q = (S.payQ || "").toLowerCase();
  const rows = WAGES.filter(w => (cat === "All" || w.cat === cat) && (!q || wLabel(w).toLowerCase().includes(q)));
  if (!rows.length) return `<tr><td colspan="5" class="fine">No jobs match that search.</td></tr>`;
  return rows.map(w => { const p = payStats(w); return `<tr><td>${esc(wLabel(w))}<div class="fine">${esc(w.cat)}</div></td><td class="mono">$${p.lo.toFixed(2)}</td><td class="mono"><b>$${p.med.toFixed(2)}</b></td><td class="mono">$${p.hi.toFixed(2)}</td><td class="fine" title="${esc("Public figure: " + w.bls)}">${paySrc(p)}</td></tr>`; }).join("");
}
async function loadWages() { const { data } = await sb.rpc("wage_stats"); S.wages = new Map((data || []).map(r => [r.role_key, r])); }
async function renderPay() {
  await loadWages();
  const cat = S.payCat || "All";
  $("#main").innerHTML = `<div class="col">
   <div class="viewhead"><h1>Pay Check</h1><span class="muted" style="font-size:13px">Public pay data, adjusted by what members report</span></div>
   <div class="card composer">
    <div class="row"><select id="pRole" aria-label="Your job" style="flex:1;min-width:200px">${WAGE_CATS.map(c => `<optgroup label="${c}">${WAGES.map((w, i) => [w, i]).filter(([w]) => w.cat === c).map(([w, i]) => `<option value="${i}">${esc(wLabel(w))}</option>`).join("")}</optgroup>`).join("")}</select>
    <input type="text" id="pRate" inputmode="decimal" placeholder="Your hourly pay, like 16.40" style="flex:1;min-width:140px"><button class="btn primary" id="pGo">Share and compare</button></div>
    <p class="fine" style="margin:0">Your pay is saved with no username attached. Member reports start adjusting a job's numbers once 3 people in that job have shared.</p>
   </div>
   <div id="pOut"></div>
   <div class="viewhead" style="margin-top:6px"><h2 style="font-size:22px">Pay by job</h2><input type="text" id="pSearch" placeholder="Search jobs, like welder" value="${esc(S.payQ || "")}" style="min-width:0;flex:0 1 220px"></div>
   <div class="chips">${["All", ...WAGE_CATS].map(c => `<button class="chip" data-pcat="${c}" aria-pressed="${cat === c}">${c}</button>`).join("")}</div>
   <div class="card" style="overflow-x:auto"><table class="wt"><thead><tr><th>Job</th><th>Low</th><th>Median</th><th>High</th><th>Based on</th></tr></thead><tbody id="pRows">${payRowsHTML()}</tbody></table></div>
   <p class="fine">Hourly pay. Starting numbers are national figures from the ${PAY_SOURCE}. Company rows use the national figure for that type of job until members report. Low and high are the 10th and 90th percentile. As members share, their reports count more: at ${PAY_K} reports a job is half public data, half member reports, and the member side keeps growing from there.</p>
  </div>`;
  document.querySelectorAll("[data-pcat]").forEach(b => b.onclick = () => { S.payCat = b.dataset.pcat; document.querySelectorAll("[data-pcat]").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#pRows").innerHTML = payRowsHTML(); });
  const ps = $("#pSearch"); ps.oninput = () => { S.payQ = ps.value; $("#pRows").innerHTML = payRowsHTML(); };
  $("#pGo").onclick = async () => {
    const w = WAGES[$("#pRole").value], key = wLabel(w), r = parseFloat($("#pRate").value.replace(/[$,]/g, ""));
    if (!(r > 5 && r < 300)) { $("#pOut").innerHTML = `<div class="warn">Enter your hourly pay as a number, like 16.40.</div>`; return; }
    const shared = store.get("wages:" + S.uid, []);
    if (!shared.includes(key)) { const { error } = await sb.from("wages").insert({ role_key: key, rate: r }); if (error) { toast(errMsg(error)); return; } shared.push(key); store.set("wages:" + S.uid, shared); }
    await loadWages();
    const p = payStats(w), lo = p.lo, med = p.med, hi = p.hi, span = Math.max(.01, hi - lo), pos = Math.max(0, Math.min(100, (r - lo) / span * 100)), diff = r - med;
    const verdict = diff >= 0.25 ? ["ok", "You're above the median"] : diff <= -0.25 ? ["bad", "You're below the median"] : ["mid", "You're right at the median"];
    $("#pOut").innerHTML = `<div class="card result"><span class="eyebrow">${esc(key)} · ${paySrc(p)}</span><h3 class="srq ${verdict[0]}">${verdict[1]}${Math.abs(diff) >= .25 ? ` by $${Math.abs(diff).toFixed(2)}/hr` : ""}</h3>
     <div class="range"><i style="left:${pos}%"></i></div><div class="row mono" style="justify-content:space-between"><span>$${lo.toFixed(2)}</span><span>median $${med.toFixed(2)}</span><span>$${hi.toFixed(2)}</span></div>
     <p class="fine" style="margin:0">That's about $${Math.abs(diff * 2080).toLocaleString(undefined, { maximumFractionDigits: 0 })} a year at full time.${p.n ? "" : " Thanks, your pay was added. Once 3 people in this job share, member reports start adjusting these numbers."}</p></div>`;
    $("#pRows").innerHTML = payRowsHTML();
  };
}

/* ---------- boards ---------- */
function renderBoards() {
  $("#main").innerHTML = `<div class="col" style="max-width:900px">
   <div class="viewhead"><h1>Boards</h1><span class="muted" style="font-size:13px">Join your company, your industry, or anyone's.</span></div>
   <div class="row"><input type="text" id="bsearch" placeholder="Search jobs and companies, like welder or Costco" style="flex:1;min-width:0" value="${esc(S.bQ || "")}"></div>
   <div class="chips" id="bcats"></div>
   <div id="blist"></div>
   <p class="fine">Don't see your job or company? Ask for a board in Settings → Send feedback.</p></div>`;
  const cats = [...new Set(S.boards.map(b => b.kind))], card = (b, grouped) => `<div class="card bcard">${grouped && !b.locked ? "" : `<span class="k">${grouped ? "" : esc(b.kind)}${b.locked ? (grouped ? "" : " · ") + "🔒 locked" : ""}</span>`}<h3>${esc(b.id)}</h3><p class="muted" style="margin:0;font-size:14px">${esc(b.description)}</p>
     <div class="row"><button class="btn small ${S.joined.has(b.id) ? "" : "primary"}" data-join="${esc(b.id)}">${S.joined.has(b.id) ? "Joined" : "Join"}</button><button class="btn small" data-board="${esc(b.id)}">View</button></div>
     <div class="row">${S.blocks.board.has(b.id) ? `<span class="fine">⊘ Blocked</span><button class="act" data-unblock-board="${esc(b.id)}">Unblock</button>` : `<button class="act" data-rpt='${esc(JSON.stringify({ kind: "board", name: b.id }))}'>⚑ Report</button><button class="act" data-bboard="${esc(b.id)}">⊘ Block board</button>`}${owner() ? `<button class="act" data-olock="${esc(b.id)}" data-lock="${!b.locked}">${b.locked ? "Unlock" : "Lock"} (owner)</button>` : ""}</div></div>`;
  const draw = () => {
    const q = (S.bQ || "").toLowerCase(), cat = S.bCat || "All";
    $("#bcats").innerHTML = ["All", "Joined", ...cats].map(c => `<button class="chip" data-bcat="${esc(c)}" aria-pressed="${cat === c}">${esc(c)}</button>`).join("");
    const list = S.boards.filter(b => (cat === "All" || (cat === "Joined" ? S.joined.has(b.id) : b.kind === cat)) && (!q || (b.id + " " + b.kind + " " + b.description).toLowerCase().includes(q)));
    const groups = cat === "All" && !q ? cats.map(c => [c, list.filter(b => b.kind === c)]).filter(([, l]) => l.length) : [[null, list]];
    $("#blist").innerHTML = list.length ? groups.map(([c, l]) => `${c ? `<h2 class="bgroup">${esc(c)}</h2>` : ""}<div class="boards">${l.map(b => card(b, !!c)).join("")}</div>`).join("")
      : `<div class="card" style="padding:20px"><span class="muted">${cat === "Joined" ? "You haven't joined any boards yet." : "No boards match. Ask for one in Settings → Send feedback."}</span></div>`;
    document.querySelectorAll("[data-bcat]").forEach(b => b.onclick = () => { S.bCat = b.dataset.bcat; draw(); });
  };
  draw(); $("#bsearch").oninput = e => { S.bQ = e.target.value; draw(); };
}
document.addEventListener("click", async e => {
  const j = e.target.closest("[data-join]");
  if (j) {
    const id = j.dataset.join, on = !S.joined.has(id); if (S.rooms.length === 0) await loadRooms();
    const inChat = S.rooms.some(r => r.kind === "public" && r.board === id && myMember(r));
    if (!await joinBoard(id, on)) return;
    await loadRooms(); renderNav(); renderBoards();
    toast(on ? `Joined ${id}. Its chats are in Chats now.` : inChat ? `Left ${id} and its chats` : `Left ${id}`); return;
  }
  const ol = e.target.closest("[data-olock]");
  if (ol) { const { error } = await sb.rpc("lock_board", { b: ol.dataset.olock, do_lock: ol.dataset.lock === "true" }); if (error) { toast(errMsg(error)); return; } await loadBoards(); renderBoards(); return; }
});

/* ---------- chats (public rooms + private groups) ---------- */
function msgHTML(m) {
  if (m.system) return `<div class="sysmsg">${esc(m.body)}</div>`;
  if (S.blocks.user.has(m.user_id)) return `<div class="sysmsg">Message from an account you blocked</div>`;
  const mine = isMe(m.user_id);
  return `<div class="msg ${mine ? "mine" : ""}"><span class="who mono">${AV(m.user_id, "xs")}${mine ? "You" + OT(m.user_id) : UL(m.user_id)}<span class="fine">${ago(m.created_at)}</span></span><div class="bub">${m.img_path ? img(m.img_path, "Shared photo") : ""}${m.body ? T(m.body) : ""}</div></div>`;
}
function sendBar(id) { return `<div class="sendbar"><div class="warn" id="${id}W" hidden></div><div class="row"><label class="btn small" for="${id}F" aria-label="Add photo">📷</label><input type="file" id="${id}F" accept="image/*" hidden><input type="text" id="${id}I" placeholder="Message" maxlength="2000"><button class="btn primary small" id="${id}S">Send</button></div></div>`; }
const EXP_H = { "Off": 1e6, "24 hours": 24, "7 days": 168, "30 days": 720 };
async function loadMessages(roomId) {
  const r = S.rooms.find(x => x.id === roomId) || S.dmRooms?.find(x => x.id === roomId);
  const hrs = r && r.kind === "group" ? EXP_H[r.expiry] || 168 : r && r.kind === "dm" ? 1e6 : 168;
  const since = new Date(Date.now() - Math.min(hrs, 1e5) * 36e5).toISOString();
  const { data } = await sb.from("messages").select("*").eq("room_id", roomId).gte("created_at", since).order("created_at", { ascending: false }).limit(150);
  const list = (data || []).reverse(); S.msgs.set(roomId, list); await signUrls(list.map(m => m.img_path));
}
function wireSend(id, roomId, redraw, pctx) {
  const inp = $("#" + id + "I"), w = $("#" + id + "W");
  const send = async (body, img_path) => {
    const { error } = await sb.from("messages").insert({ room_id: roomId, user_id: S.uid, body: body || "", img_path: img_path || null });
    if (error) { toast(errMsg(error)); return false; } await loadMessages(roomId); redraw(); return true;
  };
  const go = async () => { const m = check(inp.value); if (m) { w.hidden = false; w.textContent = m; return; } w.hidden = true; const v = inp.value.trim(); if (!v) return; inp.value = ""; if (!await send(v)) inp.value = v; };
  $("#" + id + "S").onclick = go; inp.onkeydown = e => { if (e.key === "Enter") go(); };
  $("#" + id + "F").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) processPhoto(f, pctx, async url => { try { const p = await uploadPhoto(url); if (await send("", p)) toast("Photo sent"); } catch (er) { toast(errMsg(er)); } }); };
  const box = document.querySelector(".msgs"); if (box) box.scrollTop = box.scrollHeight;
}
async function loadRooms() {
  const [{ data }, { data: mem }] = await Promise.all([
    sb.from("rooms").select("*").in("kind", ["public", "group"]).order("created_at"),
    sb.from("room_members").select("room_id,user_id,role,muted,silenced"),
  ]);
  S.members = new Map(); (mem || []).forEach(m => { if (!S.members.has(m.room_id)) S.members.set(m.room_id, []); S.members.get(m.room_id).push(m); });
  S.rooms = (data || []).filter(r => !S.blocks.room.has(r.id) && (r.kind === "group" || !r.board || S.joined.has(r.board) || inRoom(r)));
  const rank = r => r.kind === "group" ? 0 : inRoom(r) ? 1 : 2, bord = r => S.boards.findIndex(b => b.id === r.board);
  S.rooms.sort((a, b) => rank(a) - rank(b) || bord(a) - bord(b));
}
const myMember = r => (S.members.get(r.id) || []).find(m => isMe(m.user_id));
const myRole = r => r.kind === "group" ? (myMember(r) || {}).role : null;
const isOwnerOf = r => myRole(r) === "owner";
const isAdmin = r => ["admin", "owner"].includes(myRole(r));
const canManage = (r, m) => !isMe(m.user_id) && (isOwnerOf(r) || (isAdmin(r) && m.role === "member"));
const ROLE_TAG = { owner: '<span class="shift">Owner</span>', admin: '<span class="shift">Admin</span>', member: "" };
const inRoom = r => !!myMember(r);
const roomSub = r => r.kind === "public" ? `${r.board ? r.board + " · " : ""}${inRoom(r) ? `board chat · ${(S.members.get(r.id) || []).length} in it${(myMember(r) || {}).muted ? " · notifications off" : ""}` : S.joined.has(r.board) ? "board chat · tap to join" : "join the board to chat"}` : r.kind === "group" ? `Private group · ${(S.members.get(r.id) || []).length} members${(myMember(r) || {}).muted ? " · notifications off" : ""}` : (r.board ? r.board + " · public room" : "Public room");
async function renderChats() {
  await loadRooms();
  const chatBoards = S.boards.filter(b => S.rooms.some(r => r.kind === "public" && r.board === b.id)).map(b => b.id);
  if (S.chatBoard && S.chatBoard !== "All" && !chatBoards.includes(S.chatBoard)) S.chatBoard = "All";
  const fb = S.chatBoard || "All";
  // private groups always show; board chats follow the filter
  const shown = S.rooms.filter(x => x.kind === "group" || fb === "All" || x.board === fb);
  if (!S.room || !shown.find(r => r.id === S.room)) S.room = (shown[0] || {}).id;
  const r = shown.find(x => x.id === S.room);
  const filterRow = chatBoards.length ? `<div class="chips">${["All", ...chatBoards].map(c => `<button class="chip" data-cboard="${esc(c)}" aria-pressed="${fb === c}">${c === "All" ? "All boards" : esc(c)}</button>`).join("")}</div>` : "";
  if (!r) { $("#main").innerHTML = `<div class="col"><div class="viewhead"><h1>Group chats</h1><button class="btn small primary" id="newGroup">+ New group chat</button></div>${filterRow}<div class="card" style="padding:20px"><b>No chats yet</b><p class="muted" style="margin:6px 0 0">Every board has its own chats. Join a board and its chats show up here.</p><button class="btn small primary" data-view="boards" style="margin-top:10px">Browse boards</button></div></div>`; $("#newGroup").onclick = newGroupModal; wireChatFilter(); return; }
  const locked = r.kind === "public" && !inRoom(r);
  if (!S.roomSettings && !locked) { await loadMessages(r.id); if (S.unread.get(r.id)?.n) markRead(r.id); }
  else if (isAdmin(r)) { const { data } = await sb.from("room_bans").select("user_id").eq("room_id", r.id); S.roomBans = (data || []).map(x => x.user_id); if (S.roomBans.some(id => !S.profiles.has(id))) await loadProfiles(); }
  const silenced = (myMember(r) || {}).silenced;
  $("#main").innerHTML = `<div class="chatview"><div class="viewhead"><h1>Group chats</h1><button class="btn small primary" id="newGroup">+ New group chat</button></div>
   ${filterRow}<div class="card chatwrap"><div class="rooms">${shown.map((x, i) => (x.kind === "public" && (i === 0 || shown[i - 1].kind === "group") && shown.some(g => g.kind === "group") ? '<div class="roomsep">Board chats</div>' : x.kind === "group" && i === 0 ? '<div class="roomsep">Your private groups</div>' : "") + `<button class="room ${x.kind === "public" && !inRoom(x) ? "lockedroom" : ""}" data-room="${x.id}" aria-current="${x.id === S.room}"><b>${x.kind === "group" ? "🔒 " : ""}${esc(x.name)}${ubadge(x.id, (S.unread.get(x.id) || {}).n || 0)}</b><small>${esc(roomSub(x))}</small></button>`).join("")}</div>
   <div class="thread"><div class="threadhead"><div><h2>${esc(r.name)}</h2><span class="muted mono">${esc(roomSub(r))}</span></div>
    <button class="btn small" id="roomGear">${COG.replace("<svg", '<svg width="16" height="16" style="vertical-align:-3px"')} ${S.roomSettings ? "Back to chat" : "Settings"}</button></div>
   ${S.roomSettings ? roomSettingsHTML(r) : locked ? `<div class="lockpane"><b>${S.joined.has(r.board) ? "Join this chat" : `Members of ${esc(r.board)} only`}</b><span>${S.joined.has(r.board) ? "You're in " + esc(r.board) + ", so you can join its chat. Leave the board any time and you'll leave the chat too." : "This chat belongs to " + esc(r.board) + ". Join the board to chat here. If you leave the board later, you'll leave the chat too."}</span><button class="btn primary" id="rJoin">${S.joined.has(r.board) ? "Join chat" : "Join " + esc(r.board) + " and this chat"}</button></div>` : `<div class="msgs">${(S.msgs.get(r.id) || []).map(msgHTML).join("") || '<div class="sysmsg">No messages in the last few days. Say something.</div>'}</div>${silenced ? '<div class="sendbar"><span class="fine">An admin muted you in this group. You can read messages but can’t send them.</span></div>' : sendBar("room")}`}
   </div></div></div>`;
  $("#newGroup").onclick = newGroupModal; wireChatFilter();
  $("#roomGear").onclick = () => { S.roomSettings = !S.roomSettings; renderChats(); };
  const cur = document.querySelector('.room[aria-current="true"]'); if (cur) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
  if (S.roomSettings) return wireRoomSettings(r);
  if (locked) { $("#rJoin").onclick = async e => { busy(e.target, true, "Joining…"); if (r.board && !S.joined.has(r.board) && !await joinBoard(r.board, true)) { busy(e.target, false); return; } const { error } = await sb.rpc("join_room", { r: r.id }); if (error) { busy(e.target, false); toast(errMsg(error)); return; } await loadUnread(); renderNav(); renderChats(); toast("You joined " + r.name); }; return; }
  const pctx = r.kind === "group" && r.allow_faces ? { blur: false, note: "This group allows faces. Only its members can see photos." } : { blur: true, note: r.kind === "group" ? "Faces are blurred in this group. An admin can allow faces in settings." : "Public room. Faces are always blurred." };
  if (!silenced) wireSend("room", r.id, renderChats, pctx); else { const box = document.querySelector(".msgs"); if (box) box.scrollTop = box.scrollHeight; }
}
function wireChatFilter() { document.querySelectorAll("[data-cboard]").forEach(b => b.onclick = () => { S.chatBoard = b.dataset.cboard; S.room = null; S.roomSettings = false; renderChats(); }); }
document.addEventListener("click", e => { const r = e.target.closest("[data-room]"); if (r) { S.room = r.dataset.room; S.roomSettings = false; renderChats(); } });

function roomSettingsHTML(r) {
  const mem = myMember(r) || {};
  if (r.kind !== "group") return `<div class="rset">
   <div class="rsec"><span class="eyebrow">About this chat</span><p style="margin:0;font-size:14px">The chat for ${esc(r.board || "everyone")}. Only members of the board can join. If you leave the board, you leave this chat too. Faces are always blurred, the house rules apply, and messages older than 7 days are hidden.</p></div>
   ${inRoom(r) ? `<div class="rsec">${sw("rMute", mem.muted, "Mute notifications", "Just for you. No pop-ups or alerts, and it won't count toward your Chats badge.")}</div>` : ""}
   <div class="rsec"><div class="row"><button class="btn small" id="rReport">⚑ Report chat</button>${inRoom(r) ? '<button class="btn small" id="rLeave">Leave chat</button>' : ""}<button class="btn small" id="rBlock">⊘ Block chat</button></div><div id="rConfirm" hidden></div></div></div>`;
  const adm = isAdmin(r), own = isOwnerOf(r), lock = adm ? "" : "disabled", ro = adm ? "" : '<span class="fine">Only admins can change this.</span>';
  const ord = { owner: 0, admin: 1, member: 2 };
  const people = [...(S.members.get(r.id) || [])].sort((a, b) => ord[a.role] - ord[b.role]).map(m => `<div class="mem memrow"><div class="row" style="gap:8px;flex-wrap:nowrap;min-width:0">${AV(m.user_id, "sm")}${UL(m.user_id)}${isMe(m.user_id) ? " (you)" : ""}${ROLE_TAG[m.role] || ""}${m.silenced ? '<span class="r18">Muted</span>' : ""}</div>
    ${canManage(r, m) ? `<div class="memacts">${own ? `<button class="act" data-mk="${m.user_id}" data-make="${m.role !== "admin"}">${m.role === "admin" ? "Remove admin" : "Make admin"}</button><button class="act" data-own="${m.user_id}">Make owner</button>` : ""}<button class="act" data-sil="${m.user_id}" data-on="${!m.silenced}">${m.silenced ? "Unmute" : "Mute"}</button><button class="act" data-rm="${m.user_id}">Remove</button><button class="act" data-ban="${m.user_id}">Block</button></div>` : ""}</div>`).join("");
  const bans = adm && S.roomBans.length ? `<div class="rsec"><span class="eyebrow">Blocked from this group · ${S.roomBans.length}</span>${S.roomBans.map(id => `<div class="mem">${AV(id, "sm")}<span class="mono">${esc(P(id).username)}</span><span style="flex:1"></span><button class="act" data-unban="${id}">Unblock</button></div>`).join("")}<span class="fine">Blocked people can't be added back until an admin unblocks them.</span></div>` : "";
  const canAdd = adm || r.invites === "everyone";
  const addable = [...S.follows.out].filter(id => mutual(id) && !(S.members.get(r.id) || []).some(m => m.user_id === id) && !S.blocks.user.has(id));
  return `<div class="rset">
   <div class="rsec"><span class="eyebrow">Group name</span>
    <div class="row"><input type="text" id="rName" value="${esc(r.name)}" maxlength="40" ${lock} style="flex:1;min-width:0"><button class="btn small" id="rNameSave" ${lock}>Save</button></div>${ro}</div>
   <div class="rsec"><span class="eyebrow">Members · ${(S.members.get(r.id) || []).length}</span><span class="fine">The owner can do everything, including choosing admins. Admins can add, remove, mute, and block members. Muted people can read but can't send.</span>${people}
    ${canAdd ? (addable.length ? `<details id="rAddBox"><summary>Add people</summary><p class="fine">You can add people you follow each other with.</p>${addable.map(id => `<label class="pick">${AV(id, "sm")}<span class="mono">${esc(P(id).username)}</span><input type="checkbox" value="${id}"></label>`).join("")}<button class="btn small primary" id="rAdd">Add to group</button></details>` : '<span class="fine">To add someone, follow each other first.</span>') : '<span class="fine">Only admins can add people to this group.</span>'}</div>${bans}
   <div class="rsec"><span class="eyebrow">Photos</span>${sw("rFaces", r.allow_faces, "Allow faces in photos", "Off: faces are blurred automatically. On: photos post as-is, visible only to members. Everyone gets notified when this changes.")}${ro}</div>
   <div class="rsec"><span class="eyebrow">Who can add people</span>
    <div class="seg2"><button aria-selected="${r.invites === "admins"}" data-inv="admins" ${lock}>Admins only</button><button aria-selected="${r.invites === "everyone"}" data-inv="everyone" ${lock}>All members</button></div>${ro}</div>
   <div class="rsec"><span class="eyebrow">Disappearing messages</span>
    <div class="seg4">${["Off", "24 hours", "7 days", "30 days"].map(o => `<button aria-selected="${r.expiry === o}" data-exp="${o}" ${lock}>${o}</button>`).join("")}</div>
    <span class="fine">${r.expiry === "Off" ? "Messages stay until someone deletes them." : `Messages older than ${r.expiry} are hidden.`}</span>${ro}</div>
   <div class="rsec">${sw("rMute", mem.muted, "Mute notifications", "Just for you. No pop-ups or alerts, and it won't count toward your Chats badge.")}</div>
   <div class="rsec"><div class="row"><button class="btn small" id="rReport">⚑ Report group</button><button class="btn small" id="rLeave">Leave group</button><button class="btn small" id="rBlock">⊘ Leave and block</button>${own ? '<button class="btn small" id="rDelete">Delete group</button>' : ""}</div>${own && (S.members.get(r.id) || []).length > 1 ? '<span class="fine">You own this group. To leave, make someone else the owner first, or delete the group.</span>' : ""}
    <div id="rConfirm" hidden></div></div></div>`;
}
function wireRoomSettings(r) {
  const re = () => renderChats(), q = id => $(id);
  const call = async (fn, args, msg) => { const { error } = await sb.rpc(fn, args); if (error) { toast(errMsg(error)); return false; } if (msg) toast(msg); await re(); return true; };
  const confirmBox = (msg, yes, act) => { const c = q("#rConfirm"); c.hidden = false; c.innerHTML = `<p style="margin:8px 0;font-size:14px">${msg}</p><div class="row"><button class="btn small" id="rNo">Cancel</button><button class="btn small dangerbtn" id="rYes">${yes}</button></div>`; q("#rNo").onclick = () => { c.hidden = true; }; q("#rYes").onclick = act; };
  q("#rReport").onclick = () => reportModal({ kind: r.kind === "group" ? "group" : "room", name: r.name, roomId: r.id });
  q("#rBlock").onclick = () => confirmBox(r.kind === "group" ? "Leave and block this group? Nobody can add you back. Unblock it in Settings any time." : "Block this chat? You'll leave it and it disappears from your chats list.", r.kind === "group" ? "Leave and block" : "Block chat", () => blockRoom(r));
  const mute0 = q("#rMute"); if (mute0 && r.kind !== "group") mute0.onchange = async e => { await sb.from("room_members").update({ muted: e.target.checked }).eq("room_id", r.id).eq("user_id", S.uid); const u = S.unread.get(r.id); if (u) u.muted = e.target.checked; paintUnread(); re(); };
  if (r.kind !== "group") { if (q("#rLeave")) q("#rLeave").onclick = () => confirmBox(`Leave ${esc(r.name)}? You'll stay in ${esc(r.board || "the board")} and can rejoin the chat any time.`, "Leave chat", async () => { if (await call("leave_room", { r: r.id }, "You left " + r.name)) { S.unread.delete(r.id); paintUnread(); S.roomSettings = false; re(); } }); return; }
  const mute = q("#rMute"); if (mute) mute.onchange = async e => { await sb.from("room_members").update({ muted: e.target.checked }).eq("room_id", r.id).eq("user_id", S.uid); const u = S.unread.get(r.id); if (u) u.muted = e.target.checked; paintUnread(); re(); };
  q("#rLeave").onclick = () => confirmBox("Leave this group? You'll need someone to add you back.", "Leave", async () => { if (await call("leave_room", { r: r.id }, "You left " + r.name)) { S.room = null; S.roomSettings = false; re(); } });
  if (q("#rDelete")) q("#rDelete").onclick = () => confirmBox("Delete this group for everyone? All messages in it are deleted. This can't be undone.", "Delete group", async () => { if (await call("delete_group", { r: r.id }, r.name + " was deleted")) { S.room = null; S.roomSettings = false; re(); } });
  if (!isAdmin(r) && !(r.invites === "everyone")) return;
  if (q("#rAdd")) q("#rAdd").onclick = () => { const ids = [...document.querySelectorAll("#rAddBox input:checked")].map(i => i.value); if (!ids.length) { toast("Pick at least one person."); return; } call("add_members", { r: r.id, p_members: ids }, "Added to the group"); };
  if (!isAdmin(r)) return;
  q("#rNameSave").onclick = () => { const v = q("#rName").value.trim(), m = !v ? "Give the group a name." : check(v) || (new RegExp(PROF.source, "i").test(v) ? "Pick a name without swear words." : null); if (m) { toast(m); return; } call("update_group", { r: r.id, p_name: v, p_faces: null, p_invites: null, p_expiry: null }, "Group name saved"); };
  q("#rFaces").onchange = e => call("update_group", { r: r.id, p_name: null, p_faces: e.target.checked, p_invites: null, p_expiry: null });
  document.querySelectorAll("[data-inv]").forEach(b => b.onclick = () => call("update_group", { r: r.id, p_name: null, p_faces: null, p_invites: b.dataset.inv, p_expiry: null }));
  document.querySelectorAll("[data-exp]").forEach(b => b.onclick = () => call("update_group", { r: r.id, p_name: null, p_faces: null, p_invites: null, p_expiry: b.dataset.exp }));
  document.querySelectorAll("[data-mk]").forEach(b => b.onclick = () => call("set_admin", { r: r.id, u: b.dataset.mk, make: b.dataset.make === "true" }));
  const nm = id => esc(P(id).username);
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => call("remove_member", { r: r.id, u: b.dataset.rm }, nm(b.dataset.rm) + " was removed"));
  document.querySelectorAll("[data-sil]").forEach(b => b.onclick = () => call("set_silenced", { r: r.id, u: b.dataset.sil, p_on: b.dataset.on === "true" }));
  document.querySelectorAll("[data-ban]").forEach(b => b.onclick = () => confirmBox(`Block ${nm(b.dataset.ban)} from this group? They're removed and can't be added back until an admin unblocks them.`, "Block", () => call("ban_member", { r: r.id, u: b.dataset.ban }, nm(b.dataset.ban) + " is blocked from the group")));
  document.querySelectorAll("[data-unban]").forEach(b => b.onclick = () => call("unban_member", { r: r.id, u: b.dataset.unban }, "Unblocked. Someone can add them back now."));
  document.querySelectorAll("[data-own]").forEach(b => b.onclick = () => confirmBox(`Make ${nm(b.dataset.own)} the owner? You'll become an admin, and only they can choose admins or delete the group.`, "Make owner", () => call("transfer_owner", { r: r.id, u: b.dataset.own }, nm(b.dataset.own) + " is now the owner")));
}
function newGroupModal() {
  const mut = [...S.follows.out].filter(id => mutual(id) && !S.blocks.user.has(id));
  const close = modal(`<div class="pmhead"><h2>New group chat</h2><button class="btn small" id="pmX">Cancel</button></div>
   <input type="text" id="gName" placeholder="Group name, like Overnight Grocery Team" maxlength="40">
   <span class="setlabel">Add people</span><span class="fine" style="margin-top:-6px">Only people you follow each other with.</span>
   <div class="picklist">${mut.map(id => `<label class="pick">${AV(id, "sm")}<span class="mono">${esc(P(id).username)}</span><input type="checkbox" value="${id}"></label>`).join("") || '<span class="fine" style="padding:8px 0">Nobody yet. Follow people and have them follow you back, then you can add them.</span>'}</div>
   ${sw("gFaces", false, "Allow faces in photos", "Off by default. Faces get blurred unless you turn this on.")}
   <div class="warn" id="gW" hidden></div>
   <div class="row" style="justify-content:flex-end"><button class="btn primary" id="gGo">Create group</button></div>`);
  $("#gGo").onclick = async () => {
    const n = $("#gName").value.trim(), w = $("#gW"), picks = [...document.querySelectorAll(".picklist input:checked")].map(i => i.value);
    const m = !n ? "Give your group a name." : check(n) || (new RegExp(PROF.source, "i").test(n) ? "Pick a name without swear words." : null) || (!picks.length ? "Add at least one person." : null);
    if (m) { w.hidden = false; w.textContent = m; return; }
    busy($("#gGo"), true, "Creating…");
    const { data, error } = await sb.rpc("create_group", { p_name: n, p_members: picks, p_faces: $("#gFaces").checked });
    if (error) { busy($("#gGo"), false); w.hidden = false; w.textContent = errMsg(error); return; }
    S.room = data; S.roomSettings = false; close(); S.view = "chats"; render(); toast("Group created");
  };
}

/* ---------- messages (DMs) ---------- */
async function renderDMs() {
  await loadSocial();
  const mut = [...S.follows.out].filter(id => mutual(id) && !S.blocks.user.has(id));
  const followsYou = [...S.follows.in].filter(id => !S.follows.out.has(id) && !S.blocks.user.has(id));
  const waiting = [...S.follows.out].filter(id => !S.follows.in.has(id) && !S.blocks.user.has(id));
  const people = [...mut.map(id => [id, "mutual"]), ...followsYou.map(id => [id, "follows you"]), ...waiting.map(id => [id, "you follow"])];
  if (!S.dm || !people.some(([id]) => id === S.dm)) S.dm = (people[0] || [])[0] || null;
  const st = (people.find(([id]) => id === S.dm) || [])[1];
  let room = null;
  S.dmRoom = null;
  if (S.dm && st === "mutual") { const { data, error } = await sb.rpc("open_dm", { other: S.dm }); if (!error) { room = data; S.dmRoom = room; S.dmRooms = [{ id: room, kind: "dm" }]; await loadMessages(room); if (!S.unread.has(room)) await loadUnread(); if (S.unread.get(room)?.n) markRead(room); } }
  $("#main").innerHTML = `<div class="chatview"><div class="viewhead"><h1>Messages</h1><span class="muted" style="font-size:13px">1-on-1 chat opens when you follow each other.</span></div>
   ${people.length ? `<div class="card chatwrap"><div class="rooms">${people.map(([id, s]) => `<button class="room" data-dm="${id}" aria-current="${id === S.dm}"><b class="mono">${esc(P(id).username)}${(dmRoomOf(id) || [])[0] ? ubadge(dmRoomOf(id)[0], dmRoomOf(id)[1].n) : ""}</b>${s === "mutual" ? '<span class="mutual">✓ Mutual</span>' : `<span class="pending">${s}</span>`}</button>`).join("")}</div>
   <div class="thread"><div class="threadhead"><div><h2 class="mono" style="font-family:var(--f-mono);font-size:16px">${esc(P(S.dm).username)}</h2>${st === "mutual" ? '<span class="mutual">✓ You follow each other</span>' : ""}</div><div class="row"><button class="btn small" data-rpt='${esc(JSON.stringify({ kind: "account", name: P(S.dm).username }))}'>⚑ Report</button><button class="btn small" data-blk="${S.dm}">⊘ Block</button></div></div>
   ${st === "mutual" && room ? `<div class="msgs">${(S.msgs.get(room) || []).map(msgHTML).join("") || '<div class="sysmsg">Say hi. Only the two of you can see this.</div>'}</div>${sendBar("dm")}`
     : `<div class="lockpane"><b>${st === "follows you" ? "They follow you" : "Waiting on them to follow back"}</b><span>${st === "follows you" ? "Follow back to start a private chat." : "Once they follow you back, you can message each other."}</span>${st === "follows you" ? `<button class="btn primary" data-follow="${S.dm}">Follow back</button>` : ""}</div>`}
   </div></div>` : `<div class="card" style="padding:20px"><b>No one to message yet</b><p class="muted" style="margin:6px 0 0">Tap someone's username on a post or in a chat and follow them. Once they follow you back, you can message each other here.</p></div>`}</div>`;
  if (room) wireSend("dm", room, renderDMs, { blur: false, note: "Private message. Faces stay visible. Tap anything you want blurred." });
}
document.addEventListener("click", async e => {
  const d = e.target.closest("[data-dm]"); if (d) { S.dm = d.dataset.dm; renderDMs(); return; }
  const f = e.target.closest("[data-follow]"); if (f) { await follow(f.dataset.follow, true); if (S.view === "dms") renderDMs(); return; }
});
async function follow(id, on) {
  const { error } = on ? await sb.from("follows").insert({ followee: id }) : await sb.from("follows").delete().eq("follower", S.uid).eq("followee", id);
  if (error && !/duplicate/.test(error.message)) { toast(errMsg(error)); return; }
  on ? S.follows.out.add(id) : S.follows.out.delete(id);
  if (on && S.follows.in.has(id)) loadUnread();
  toast(on ? (S.follows.in.has(id) ? "You follow each other now. Say hi in Messages." : "Following. You can message once they follow you back.") : "Unfollowed");
}

/* ---------- followers & following ---------- */
async function followCounts(id) {
  const [a, b] = await Promise.all([
    sb.from("follows").select("follower", { count: "exact", head: true }).eq("followee", id),
    sb.from("follows").select("followee", { count: "exact", head: true }).eq("follower", id),
  ]);
  return { followers: a.count || 0, following: b.count || 0 };
}
function followListModal(tab) {
  const ids = [...(tab === "followers" ? S.follows.in : S.follows.out)].filter(id => S.profiles.has(id) && !S.blocks.user.has(id));
  const row = id => {
    const act = tab === "followers" ? (S.follows.out.has(id) ? '<span class="mutual">✓ Mutual</span>' : `<button class="btn small primary" data-fl="${id}" data-on="true">Follow back</button>`)
      : `${S.follows.in.has(id) ? '<span class="mutual">✓ Mutual</span>' : ""}<button class="btn small" data-fl="${id}" data-on="false">Unfollow</button>`;
    return `<div class="mem">${AV(id, "sm")}${UL(id)}<span style="flex:1"></span>${act}</div>`;
  };
  modal(`<div class="pmhead"><h2>${tab === "followers" ? "Followers" : "Following"}</h2><button class="btn small" id="pmX">Close</button></div>
   <div class="seg2"><button aria-selected="${tab === "followers"}" data-ftab="followers">Followers · ${S.follows.in.size}</button><button aria-selected="${tab === "following"}" data-ftab="following">Following · ${S.follows.out.size}</button></div>
   <div class="picklist">${ids.map(row).join("") || `<span class="fine" style="padding:8px 0">${tab === "followers" ? "Nobody follows you yet. Post and chat, and people will find you." : "You're not following anyone yet. Tap a username on a post or in a chat to follow them."}</span>`}</div>
   <span class="fine">When you follow each other, you can message and add each other to group chats.</span>`);
  document.querySelectorAll("[data-ftab]").forEach(b => b.onclick = () => followListModal(b.dataset.ftab));
  document.querySelectorAll("[data-fl]").forEach(b => b.onclick = async () => { await follow(b.dataset.fl, b.dataset.on === "true"); followListModal(tab); if (S.view === "settings") renderSettings(); if (S.view === "profile") renderProfile(); });
}

/* ---------- profiles, report & block ---------- */
function openUser(id) {
  const ov = $("#photoModal"); if (ov && !ov.hidden) { ov.hidden = true; ov.innerHTML = ""; }
  if (S.view !== "profile") S.prevView = S.view;
  S.profileId = id; S.pTab = "posts"; S.uPostsFor = null; go("profile");
}
const tagList = arr => (arr || []).map(t => `<span class="tag">${T(t)}</span>`).join("");
async function renderProfile() {
  const id = S.profileId || S.uid, p = P(id), me = isMe(id), blocked = S.blocks.user.has(id), fol = S.follows.out.has(id);
  if (S.uPostsFor !== id) await loadUserPosts(id);
  const c = await followCounts(id);
  if (S.view !== "profile" || (S.profileId || S.uid) !== id) return;
  const posts = blocked ? [] : S.uPosts.filter(x => !(S.hideLang && x.strong && !me)), photos = posts.filter(x => x.img_path), tab = S.pTab || "posts";
  const about = [["Interests", p.interests], ["Hobbies", p.hobbies], ["Things I like", p.likes]].filter(([, a]) => a && a.length);
  const stat = (n, label, list) => me && list ? `<button class="followstat" data-flist="${list}"><b class="mono">${n}</b><span>${label}</span></button>` : `<div class="followstat static"><b class="mono">${n}</b><span>${label}</span></div>`;
  $("#main").innerHTML = `<div class="col">
   <button class="act" id="pBack" style="align-self:flex-start">← Back</button>
   <div class="card profhead">
    <div class="row" style="gap:14px;flex-wrap:nowrap">${AV(id, "xl")}<div style="min-width:0"><div class="row" style="gap:6px"><b class="mono ${p.role === "owner" ? "oname" : ""}" style="font-size:20px;word-break:break-all">${esc(p.username)}</b>${OT(id)}</div>
     <div class="fine">${p.company ? esc(p.company) + " · " : ""}${me ? "This is you" : S.follows.in.has(id) && fol ? "You follow each other" : S.follows.in.has(id) ? "Follows you" : "Anonymous member"}${blocked ? " · blocked" : ""}${p.banned ? " · banned" : ""}</div></div></div>
    ${p.bio && !blocked ? `<p class="pbio">${T(p.bio)}</p>` : me ? '<p class="fine" style="margin:0">Add a short bio so people know what you do. Keep it vague enough that work can’t pick you out.</p>' : ""}
    <div class="row followrow">${stat(c.followers, "Followers", "followers")}${stat(c.following, "Following", "following")}${stat(posts.length, "Posts")}</div>
    <div class="row">${me ? '<button class="btn small primary" id="pEdit">Edit profile</button><button class="btn small" data-view="settings">Settings</button>'
      : blocked ? '<button class="btn small" id="uUnblk">Unblock</button>'
      : `<button class="btn small ${fol ? "" : "primary"}" id="uFollow">${fol ? "✓ Following" : "+ Follow"}</button>${mutual(id) ? '<button class="btn small" id="uMsg">Message</button>' : ""}<span style="flex:1"></span><button class="btn small" id="uRpt">⚑ Report</button><button class="btn small" id="uBlk">⊘ Block</button>`}</div>
    ${owner() && p.role !== "owner" ? `<div class="row ownerbox"><span class="fine" style="flex:1">Owner tools</span><button class="btn small" id="oBeta">${p.beta ? "Remove beta tester" : "Make beta tester"}</button><button class="btn small" id="oRem">Remove their posts</button><button class="btn small dangerbtn" id="oBan">${p.banned ? "Unban" : "Ban account"}</button></div>` : ""}
   </div>
   ${blocked ? "" : `<div class="card setcard"><span class="eyebrow">About</span>
    ${about.length ? about.map(([l, a]) => `<div class="psec"><span class="setlabel">${l}</span><div class="tags">${tagList(a)}</div></div>`).join("") : `<span class="fine">${me ? "Add your interests, hobbies, and things you like with Edit profile." : "Nothing here yet."}</span>`}</div>
   <div class="seg2" role="tablist"><button role="tab" aria-selected="${tab === "posts"}" data-ptab="posts">Posts · ${posts.length}</button><button role="tab" aria-selected="${tab === "photos"}" data-ptab="photos">Photos · ${photos.length}</button></div>
   ${tab === "photos" ? (photos.length ? `<div class="pgrid">${photos.map(x => `<div class="pcell">${img(x.img_path, "Photo posted by " + p.username)}</div>`).join("")}</div>` : `<div class="card" style="padding:20px"><span class="muted">${me ? "Photos you add to posts show up here." : "No photos yet."}</span></div>`)
     : (posts.map(postHTML).join("") || `<div class="card" style="padding:20px"><span class="muted">${me ? "You haven’t posted yet. Your posts show up here." : "No posts yet."}</span></div>`)}`}
  </div>`;
  $("#pBack").onclick = () => go(S.prevView && S.prevView !== "profile" ? S.prevView : "home");
  document.querySelectorAll("[data-ptab]").forEach(b => b.onclick = () => { S.pTab = b.dataset.ptab; renderProfile(); });
  document.querySelectorAll("[data-flist]").forEach(b => b.onclick = () => followListModal(b.dataset.flist));
  if ($("#pEdit")) $("#pEdit").onclick = editProfileModal;
  if ($("#uFollow")) $("#uFollow").onclick = async () => { await follow(id, !fol); renderProfile(); };
  if ($("#uMsg")) $("#uMsg").onclick = () => { S.dm = id; go("dms"); };
  if ($("#uRpt")) $("#uRpt").onclick = () => reportModal({ kind: "account", name: p.username });
  if ($("#uBlk")) $("#uBlk").onclick = () => confirmBlock(id);
  if ($("#uUnblk")) $("#uUnblk").onclick = async () => { await sb.from("blocks").delete().eq("kind", "user").eq("target", id); S.blocks.user.delete(id); renderProfile(); toast("Unblocked " + p.username); };
  if ($("#oBeta")) $("#oBeta").onclick = async () => { const on = !p.beta, { error } = await sb.rpc("set_beta", { u: id, on_: on }); if (error) { toast(errMsg(error)); return; } await loadProfiles(); renderProfile(); toast(on ? p.username + " is now a beta tester" : p.username + " is no longer a beta tester"); };
  if ($("#oRem")) $("#oRem").onclick = async () => { const { error } = await sb.rpc("remove_user_posts", { uname: p.username }); if (error) { toast(errMsg(error)); return; } S.feedLoaded = false; S.uPostsFor = null; renderProfile(); toast("Removed posts by " + p.username); };
  if ($("#oBan")) $("#oBan").onclick = async () => { const { error } = await sb.rpc("ban_user", { uname: p.username, do_ban: !p.banned }); if (error) { toast(errMsg(error)); return; } await loadProfiles(); S.feedLoaded = false; renderProfile(); toast(p.banned ? "Unbanned" : p.username + " is banned"); };
}
function editProfileModal() {
  const me = P(S.uid), j = a => (a || []).join(", ");
  const field = (id, label, val, ph) => `<span class="setlabel">${label}</span><input type="text" id="${id}" value="${esc(val)}" placeholder="${ph}" maxlength="400">`;
  const close = modal(`<div class="pmhead"><h2>Edit profile</h2><button class="btn small" id="pmX">Cancel</button></div>
   <span class="setlabel">Bio</span><textarea id="eBio" rows="3" maxlength="300" placeholder="Overnight stocker, 6 years in. Coffee runs on 3 hours of sleep." style="resize:vertical;border:1px solid var(--line);border-radius:6px;padding:8px 9px;background:var(--surface-2)">${esc(me.bio || "")}</textarea>
   ${field("eInt", "Interests", j(me.interests), "Cars, fishing, true crime")}
   ${field("eHob", "Hobbies", j(me.hobbies), "Gaming, lifting, woodworking")}
   ${field("eLike", "Things I like", j(me.likes), "Dr Pepper, country music, payday")}
   <span class="fine">Separate with commas. Up to 12 each. Everyone can see your profile, so skip anything that points to you, like your store number or real name.</span>
   <div class="warn" id="eW" hidden></div>
   <div class="row" style="justify-content:flex-end"><button class="btn primary" id="eSave">Save</button></div>`);
  const list = v => [...new Set(v.split(",").map(x => x.trim().replace(/\s+/g, " ")).filter(Boolean).map(x => x.slice(0, 30)))].slice(0, 12);
  $("#eSave").onclick = async () => {
    const bio = $("#eBio").value.trim(), interests = list($("#eInt").value), hobbies = list($("#eHob").value), likes = list($("#eLike").value), w = $("#eW");
    const m = [bio, ...interests, ...hobbies, ...likes].map(check).find(Boolean); if (m) { w.hidden = false; w.textContent = m; return; }
    busy($("#eSave"), true, "Saving…");
    const { error } = await sb.from("profiles").update({ bio, interests, hobbies, likes }).eq("id", S.uid);
    if (error) { busy($("#eSave"), false); w.hidden = false; w.textContent = errMsg(error); return; }
    Object.assign(me, { bio, interests, hobbies, likes }); close(); renderProfile(); toast("Profile saved");
  };
}
function confirmBlock(id) {
  const close = modal(`<div class="pmhead"><h2>Block ${esc(P(id).username)}?</h2><button class="btn small" id="pmX">Cancel</button></div>
   <ul class="rules"><li>They can't message you or add you to group chats.</li><li>Their posts, comments, photos, and messages are hidden from you.</li><li>They aren't told you blocked them.</li></ul>
   <div class="row" style="justify-content:flex-end"><button class="btn dangerbtn" id="bYes">Block</button></div>`);
  $("#bYes").onclick = async () => { const { error } = await sb.from("blocks").insert({ kind: "user", target: id }); if (error && !/duplicate/.test(error.message)) { toast(errMsg(error)); return; } S.blocks.user.add(id); close(); render(); toast("Blocked. Undo any time in Settings."); };
}
async function blockRoom(r) {
  if (r.kind === "group" || inRoom(r)) { const { error } = await sb.rpc("leave_room", { r: r.id }); if (error) { toast(errMsg(error)); return; } }
  await sb.from("blocks").insert({ kind: "room", target: r.id }); S.blocks.room.add(r.id); S.room = null; S.roomSettings = false; render(); toast("Blocked " + r.name);
}
async function blockBoard(b) { await sb.from("blocks").insert({ kind: "board", target: b }); S.blocks.board.add(b); if (S.joined.has(b)) await joinBoard(b, false); if (S.filter === b) S.filter = "All"; render(); toast("Blocked " + b); }
function reportModal(t) {
  const grp = t.kind === "board" ? "board" : (t.kind === "group" || t.kind === "room") ? "group" : "person";
  const close = modal(`<div class="pmhead"><h2>Report ${KIND_LABEL[t.kind]}</h2><button class="btn small" id="pmX">Cancel</button></div>
   <p style="margin:0;font-size:14px">Reporting <b class="mono">${esc(t.name)}</b>. What's going on?</p>
   <div class="reasons">${REASONS[grp].map(r => `<label class="reason"><input type="radio" name="rsn" value="${esc(r)}"><span>${esc(r)}</span></label>`).join("")}</div>
   <textarea id="rDet" rows="2" maxlength="1000" placeholder="Anything else moderators should know? (optional)" style="resize:vertical;border:1px solid var(--line);border-radius:6px;padding:8px 9px;background:var(--surface-2)"></textarea>
   <div class="warn" id="rW" hidden></div>
   <div class="row" style="justify-content:space-between"><span class="fine">Reports are anonymous.</span><button class="btn primary" id="rSend">Send report</button></div>`);
  $("#rSend").onclick = async () => {
    const pk = document.querySelector('input[name="rsn"]:checked'), det = $("#rDet").value.trim(), w = $("#rW");
    if (!pk) { w.hidden = false; w.textContent = "Pick a reason so the report goes to the right moderators."; return; }
    const m = check(det); if (m) { w.hidden = false; w.textContent = m; return; }
    const { error } = await sb.from("reports").insert({ kind: t.kind, target: t.name, reason: pk.value, details: (t.id ? `[post ${t.id}] ` : "") + det });
    if (error) { w.hidden = false; w.textContent = errMsg(error); return; }
    modal(`<div class="pmhead"><h2>Report sent</h2><button class="btn small" id="pmX">Done</button></div><span class="okchip" style="align-self:flex-start">✓ ${esc(pk.value)}</span>
     <p style="margin:0;font-size:14px">${pk.value === "Involves someone under 18" ? "Reports about minors jump to the front of the line." : "The Unbadged team will review it."} Nobody will know who sent this report.</p>`);
  };
}
document.addEventListener("click", e => {
  const rp = e.target.closest("[data-rpt]"); if (rp) { reportModal(JSON.parse(rp.dataset.rpt)); return; }
  const bk = e.target.closest("[data-blk]"); if (bk) { confirmBlock(bk.dataset.blk); return; }
  const bb = e.target.closest("[data-bboard]"); if (bb) { blockBoard(bb.dataset.bboard); return; }
});
document.addEventListener("click", async e => {
  const ub = e.target.closest("[data-unblock-board]");
  if (ub) { await sb.from("blocks").delete().eq("kind", "board").eq("target", ub.dataset.unblockBoard); S.blocks.board.delete(ub.dataset.unblockBoard); render(); return; }
  const uu = e.target.closest("[data-unblock-user]");
  if (uu) { await sb.from("blocks").delete().eq("kind", "user").eq("target", uu.dataset.unblockUser); S.blocks.user.delete(uu.dataset.unblockUser); render(); return; }
  const ur = e.target.closest("[data-unblock-room]");
  if (ur) { await sb.from("blocks").delete().eq("kind", "room").eq("target", ur.dataset.unblockRoom); S.blocks.room.delete(ur.dataset.unblockRoom); render(); toast("Unblocked. Ask a member to add you back to private groups."); return; }
});

/* ---------- feedback ---------- */
function feedbackModal(preset) {
  const close = modal(`<div class="pmhead"><h2>Send feedback</h2><button class="btn small" id="pmX">Cancel</button></div>
   <div class="chips">${["Idea", "Something's broken", "Confusing", "I love this"].map(t => `<button class="chip" data-fbt="${t}" aria-pressed="${(preset || "Idea") === t}">${t}</button>`).join("")}</div>
   <textarea id="fbTx" rows="4" maxlength="2000" placeholder="What should we know? Don't include your real name or anyone else's." style="resize:vertical;border:1px solid var(--line);border-radius:6px;padding:8px 9px;background:var(--surface-2)"></textarea>
   <div class="warn" id="fbW" hidden></div><div class="row" style="justify-content:flex-end"><button class="btn primary" id="fbGo">Send</button></div>`);
  let type = preset || "Idea";
  document.querySelectorAll("[data-fbt]").forEach(b => b.onclick = () => { type = b.dataset.fbt; document.querySelectorAll("[data-fbt]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
  $("#fbGo").onclick = async () => {
    const v = $("#fbTx").value.trim(), w = $("#fbW"); if (!v) { w.hidden = false; w.textContent = "Write a sentence or two first."; return; }
    const m = check(v); if (m) { w.hidden = false; w.textContent = m; return; }
    const { error } = await sb.from("feedback").insert({ type, body: v }); if (error) { w.hidden = false; w.textContent = errMsg(error); return; }
    close(); toast("Thanks. Your feedback went to the Unbadged team.");
  };
}

/* ---------- profile photo: pick, blur faces, crop to a circle, upload ---------- */
function cropModal(dataUrl, done) {
  const close = modal(`<div class="pmhead"><h2>Profile photo</h2><button class="btn small" id="pmX">Cancel</button></div>
   <p class="fine" style="margin:0">Drag to move. Use the slider to zoom.</p>
   <div class="cropbox"><canvas id="cropC" width="560" height="560" aria-label="Drag to position your photo"></canvas></div>
   <label class="row" style="gap:10px;font-size:13px">Zoom<input type="range" id="cropZ" min="1" max="4" step="0.01" value="1" style="flex:1"></label>
   <div class="row" style="justify-content:flex-end"><button class="btn primary" id="cropOk">Use this photo</button></div>`);
  const im = new Image();
  im.onload = () => {
    const cv = $("#cropC"), g = cv.getContext("2d"), N = cv.width, base = N / Math.min(im.width, im.height);
    let z = 1, ox = 0, oy = 0, drag = null;
    const fit = () => { const sc = base * z, w = im.width * sc, h = im.height * sc; ox = Math.min(0, Math.max(N - w, ox)); oy = Math.min(0, Math.max(N - h, oy)); };
    const draw = () => { fit(); const sc = base * z; g.fillStyle = "#000"; g.fillRect(0, 0, N, N); g.drawImage(im, ox, oy, im.width * sc, im.height * sc); };
    ox = (N - im.width * base) / 2; oy = (N - im.height * base) / 2; draw();
    cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY }; };
    cv.onpointermove = e => { if (!drag) return; const k = N / cv.getBoundingClientRect().width; ox += (e.clientX - drag.x) * k; oy += (e.clientY - drag.y) * k; drag = { x: e.clientX, y: e.clientY }; draw(); };
    cv.onpointerup = cv.onpointercancel = () => { drag = null; };
    $("#cropZ").oninput = e => { const nz = +e.target.value, c = N / 2; ox = c - (c - ox) * nz / z; oy = c - (c - oy) * nz / z; z = nz; draw(); };
    $("#cropOk").onclick = () => { const out = document.createElement("canvas"); out.width = out.height = 400; out.getContext("2d").drawImage(cv, 0, 0, 400, 400); const url = out.toDataURL("image/jpeg", .88); close(); done(url); };
  };
  im.src = dataUrl;
}
function pickProfilePhoto() {
  const close = modal(`<div class="pmhead"><h2>Profile photo</h2><button class="btn small" id="pmX">Cancel</button></div>
   <p style="margin:0;font-size:14px">Everyone on Unbadged can see your profile photo. Should faces in it be blurred?</p>
   <label class="reason"><input type="radio" name="pfBlur" value="1" checked><span><b>Blur faces</b> (recommended)<br><span class="fine">Keeps you anonymous. Faces are found and blurred before upload.</span></span></label>
   <label class="reason"><input type="radio" name="pfBlur" value="0"><span><b>Show my face</b><br><span class="fine">Your face will be visible to every member.</span></span></label>
   <div class="warn" id="pfWarn" hidden><b>Heads up:</b> anyone on Unbadged, including coworkers or managers who join, could recognize you, and they can screenshot it. That ties your posts and chats to you. You can switch back to a blurred photo or an icon any time, but screenshots can't be taken back.</div>
   <div class="row" style="justify-content:flex-end"><button class="btn primary" id="pfGo">Choose photo</button></div>`);
  const sync = () => { $("#pfWarn").hidden = document.querySelector('input[name="pfBlur"]:checked').value === "1"; };
  document.querySelectorAll('input[name="pfBlur"]').forEach(r => r.onchange = sync);
  $("#pfGo").onclick = () => { const blur = document.querySelector('input[name="pfBlur"]:checked').value === "1"; close(); choosePhotoFile(blur); };
}
function choosePhotoFile(blur) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => { const f = inp.files[0]; if (!f) return;
    processPhoto(f, blur ? { blur: true, note: "Your profile photo is seen by everyone, so faces are blurred to keep you anonymous." } : { blur: false, note: "You chose to show your face. Every member can see this photo." }, url => cropModal(url, async out => {
      try {
        const blob = await (await fetch(out)).blob(), me = P(S.uid), old = me.avatar_path, path = `${S.uid}/avatar-${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" }); if (error) throw error;
        const { error: e2 } = await sb.from("profiles").update({ avatar_path: path }).eq("id", S.uid); if (e2) throw e2;
        S.urls.set(path, out); me.avatar_path = path; if (old) sb.storage.from("photos").remove([old]);
        renderNav(); renderSettings(); toast("Profile photo updated");
      } catch (er) { toast(errMsg(er)); }
    }));
  };
  inp.click();
}
async function removeProfilePhoto() {
  const me = P(S.uid), old = me.avatar_path; if (!old) return;
  const { error } = await sb.from("profiles").update({ avatar_path: null }).eq("id", S.uid); if (error) { toast(errMsg(error)); return; }
  me.avatar_path = null; sb.storage.from("photos").remove([old]); renderNav(); renderSettings(); toast("Profile photo removed");
}

/* ---------- settings ---------- */
function avatarPicker(cur) { return `<div class="avgrid" role="radiogroup" aria-label="Avatar">${AV_GLY.map((g, i) => `<button class="avpick" role="radio" aria-checked="${cur === i}" data-av="${i}" title="${g[0]}" style="background:${AV_COL[i]}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${g[1]}"/></svg></button>`).join("")}</div>`; }
function renderSettings() {
  const me = P(S.uid), pol = [
    ["House rules", "18+ only. No sexual content. Vent about the job, not specific people. No threats, hate, or doxxing. Don't post company secrets."],
    ["Photo and face-blur policy", "Every photo has location data removed. Faces are found and blurred on your device before upload in public posts and public rooms. Private groups can allow faces. DMs leave faces visible. Profile photos blur faces unless you choose to show yours."],
    ["Privacy", "Unbadged never asks for your name, email, phone, or location. Pay Check entries are stored with no username. During the beta, private messages aren't end-to-end encrypted."],
  ];
  $("#main").innerHTML = `<div class="col">
   <div class="viewhead"><h1>Settings</h1></div>
   <div class="card setcard"><span class="eyebrow">Account</span>
    <div class="row" style="gap:12px"><span id="setAv">${AV(S.uid, "lg")}</span><div><b class="mono ${me.role === "owner" ? "oname" : ""}" style="font-size:17px">${esc(me.username)}</b>${OT(S.uid)}<div class="fine">18+ confirmed · ${me.role === "owner" ? "Owner" : me.beta ? "Official beta tester" : "Member"}${me.company ? " · " + esc(me.company) : ""}</div></div></div>
    <button class="btn small" data-user="${S.uid}" style="align-self:flex-start">View my profile</button>
    <div class="row followrow"><button class="followstat" data-flist="followers"><b class="mono">${S.follows.in.size}</b><span>Followers</span></button><button class="followstat" data-flist="following"><b class="mono">${S.follows.out.size}</b><span>Following</span></button></div>
    <span class="setlabel">Profile photo</span>
    <div class="row"><button class="btn small primary" id="sPhoto">${me.avatar_path ? "Change photo" : "Upload a photo"}</button>${me.avatar_path ? '<button class="btn small" id="sPhotoX">Remove photo</button>' : ""}</div>
    <span class="fine" style="margin-top:-4px">Any photo you want. Everyone can see it. Faces are blurred unless you choose to show yours. ${me.role === "owner" ? "It shows inside your gold founder ring." : "Remove it to go back to an icon."}</span>
    ${me.role === "owner" ? '<div class="ownerbox"><b>Founder look locked in.</b> The gold founder ring and FOUNDER tag are reserved for your account.</div><button class="btn small primary" data-view="owner" style="align-self:flex-start">Open Owner tools</button>' : `<span class="setlabel">${me.avatar_path ? "Icon (shows if you remove your photo)" : "Or pick an icon"}</span>${avatarPicker(me.avatar)}`}
    <span class="setlabel">Username</span>
    <div class="row"><input type="text" id="sName" value="${esc(me.username)}" maxlength="20" style="flex:1;min-width:0;font-family:var(--f-mono)"><button class="btn small primary" id="sSave">Save</button></div>
    <div class="warn" id="sW" hidden></div>
    <span class="setlabel">Company tag</span>
    <div class="row"><input type="text" id="sCo" value="${esc(me.company || "")}" maxlength="40" placeholder="Optional" style="flex:1;min-width:0"><button class="btn small" id="sCoSave">Save</button></div>
    <span class="setlabel">Recovery phrase</span>
    <div id="sRecBox"><p class="fine" style="margin:0">Unbadged never stores your phrase where anyone can read it, so it can't show it again. Lost it? Make a new one while you're signed in.</p><button class="btn small" id="sRecNew" style="margin-top:6px">Make a new recovery phrase</button></div>
   </div>
   ${me.beta && me.role !== "owner" ? `<div class="card setcard betacard"><span class="eyebrow" style="color:#b18cff">Beta tester</span>
    <div class="row" style="gap:12px">${BETA_AV("lg")}<div><b>You're an official Unbadged beta tester.</b><div class="fine">This look is only for testers. Turn either part off any time.</div></div></div>
    ${sw("sBetaAv", me.show_beta_av, "Show beta tester avatar", me.avatar_path ? "Your profile photo shows inside the beta ring." : "Replaces your icon with the beta avatar.")}
    ${sw("sBetaTag", me.show_beta_tag, "Show BETA TESTER tag", "Shows next to your username everywhere.")}</div>` : ""}
   <div class="card setcard"><span class="eyebrow">Appearance</span><span class="setlabel">Accent color</span>
    <div class="swatches">${ACCENTS.map(([n, c]) => `<button class="swatch" role="radio" aria-checked="${S.accent === c}" data-accent="${c}" title="${n}" style="background:${c}"><span>${n}</span></button>`).join("")}</div></div>
   <div class="card setcard"><span class="eyebrow">Devices</span>
    <div class="devrow"><span>📱 <b>This device</b></span><span class="okchip">Signed in now</span></div>
    ${S.linkCode && Date.now() < S.linkExp ? `<div class="linkbox"><div class="qr" id="qrBox"></div><span class="setlabel" style="text-align:center">Or type this code on the other device</span><div class="lcode mono">${S.linkCode}</div>
      <span class="fine" style="text-align:center">Expires in <b class="mono" id="lExp"></b>. Works once. Unbadged staff will never ask you for this code.</span><div class="row" style="justify-content:center"><button class="btn small" id="lNew">Get a new code</button><button class="btn small" id="lCancel">Done</button></div></div>`
      : `<p style="margin:0;font-size:14px">Sign in on a laptop, tablet, or new phone without typing your phrase.</p><button class="btn primary small" id="lMake" style="align-self:flex-start">Link another device</button>`}</div>
   <div class="card setcard"><span class="eyebrow">Notifications</span>
    <p style="margin:0;font-size:14px">New messages in your group chats and Messages show a count on those tabs and a pop-up inside the app.</p>
    ${"Notification" in window ? sw("sNotif", alertsOn(), "Phone and computer alerts", "Get an alert for new messages when Unbadged is in the background.") : '<span class="fine">This browser can\'t show alerts. On iPhone, open Unbadged in Safari, tap Share, then Add to Home Screen, and turn alerts on from the Home Screen app.</span>'}
    <div class="warn" id="sNotifW" hidden></div>
    <span class="fine">Alerts show while Unbadged is open or recently used. Alerts when the app is fully closed are coming later. Mute a single group in that group's settings.</span></div>
   <div class="card setcard"><span class="eyebrow">Content</span>
    ${sw("sProf", S.prof, "Profanity filter", "Blurs swear words. Tap a blurred word to see it.")}
    ${sw("sHide", S.hideLang, "Hide strong-language posts", "Posts marked strong language won't show in your feed.")}</div>
   <div class="card setcard"><span class="eyebrow">Blocked</span>
    ${S.blocks.user.size + S.blocks.board.size + S.blocks.room.size === 0 ? '<span class="fine">You haven’t blocked anyone. Tap any username to report or block them.</span>' :
      [...S.blocks.user].map(id => `<div class="mem">${AV(id, "sm")}<span class="mono">${esc(P(id).username)}</span><span class="shift">Account</span><span style="flex:1"></span><button class="act" data-unblock-user="${id}">Unblock</button></div>`).join("") +
      [...S.blocks.board].map(b => `<div class="mem"><span class="mono">${esc(b)}</span><span class="shift">Board</span><span style="flex:1"></span><button class="act" data-unblock-board="${esc(b)}">Unblock</button></div>`).join("") +
      [...S.blocks.room].map(r => `<div class="mem"><span>Chat room</span><span class="shift">Room</span><span style="flex:1"></span><button class="act" data-unblock-room="${esc(r)}">Unblock</button></div>`).join("")}</div>
   <div class="card setcard"><span class="eyebrow">Policies</span>
    <button class="btn small" data-view="terms" style="align-self:flex-start">Read the Closed Beta Terms</button>
    ${pol.map(([t, d]) => `<details><summary>${t}</summary><p>${d}</p></details>`).join("")}</div>
   <div class="card setcard"><span class="eyebrow">Help</span>
    <div class="row"><button class="btn small" id="sBug">Report a problem</button><button class="btn small" id="sFb">Send feedback</button></div>
    <span class="fine mono">Unbadged closed beta</span></div>
   <div class="card setcard"><span class="eyebrow" style="color:var(--danger)">Leave Unbadged</span>
    <div class="row"><button class="btn small" id="sOut">Log out</button><button class="btn small" id="sDel">Delete account</button></div>
    <div id="sDelBox" hidden><p style="margin:0;font-size:14px">This permanently deletes your username, posts, comments, photos, and messages. It can't be undone.</p><div class="row" style="margin-top:8px"><button class="btn small" id="sDelNo">Keep my account</button><button class="btn small dangerbtn" id="sDelYes">Delete everything</button></div></div></div>
  </div>`;
  document.querySelectorAll("[data-av]").forEach(b => b.onclick = async () => { const { error } = await sb.from("profiles").update({ avatar: +b.dataset.av }).eq("id", S.uid); if (error) { toast(errMsg(error)); return; } me.avatar = +b.dataset.av; renderNav(); renderSettings(); });
  $("#sSave").onclick = async () => {
    const v = $("#sName").value.trim(), w = $("#sW"), m = nameProblem(v, me.role === "owner"); if (m) { w.hidden = false; w.textContent = m; return; }
    const { error } = await sb.from("profiles").update({ username: v }).eq("id", S.uid);
    if (error) { w.hidden = false; w.textContent = /duplicate|unique/.test(error.message) ? "That username is taken. Try another." : errMsg(error); return; }
    me.username = v; renderNav(); renderSettings(); toast("Username changed. Sign in with your new username from now on.");
  };
  $("#sCoSave").onclick = async () => { const v = $("#sCo").value.trim(), m = check(v); if (m) { toast(m); return; } const { error } = await sb.from("profiles").update({ company: v }).eq("id", S.uid); if (error) { toast(errMsg(error)); return; } me.company = v; renderSettings(); toast(v ? "Company tag saved" : "Company tag removed"); };
  $("#sRecNew").onclick = async () => {
    const ph = newPhrase(); const btn = $("#sRecNew"); busy(btn, true);
    const { error } = await sb.auth.updateUser({ password: ph });
    if (error) { busy(btn, false); toast(errMsg(error)); return; }
    $("#sRecBox").innerHTML = `<div class="recovery">${ph.replace(/-/g, " ")}</div><p class="fine" style="margin:6px 0 0"><b>Your old phrase no longer works.</b> Write this one down now. It won't be shown again.</p>`;
  };
  document.querySelectorAll("[data-accent]").forEach(b => b.onclick = () => { setAccent(b.dataset.accent); sb.from("profiles").update({ accent: b.dataset.accent }).eq("id", S.uid); document.querySelectorAll("[data-accent]").forEach(x => x.setAttribute("aria-checked", x === b)); });
  const mk = async () => { const { data, error } = await sb.rpc("create_link_code"); if (error) { toast(errMsg(error)); return; } S.linkCode = data; S.linkExp = Date.now() + 5 * 60000; renderSettings(); };
  if ($("#lMake")) $("#lMake").onclick = mk; if ($("#lNew")) $("#lNew").onclick = mk;
  if ($("#lCancel")) $("#lCancel").onclick = () => { S.linkCode = null; renderSettings(); };
  if ($("#qrBox")) drawQR($("#qrBox"), location.origin + "/#link=" + S.linkCode.replace("-", ""));
  $("#sProf").onchange = e => { S.prof = e.target.checked; store.set("prof", S.prof); };
  document.querySelectorAll("[data-flist]").forEach(b => b.onclick = () => followListModal(b.dataset.flist));
  const betaSw = (id, col) => { const el = $(id); if (el) el.onchange = async e => { const v = e.target.checked; const { error } = await sb.from("profiles").update({ [col]: v }).eq("id", S.uid); if (error) { toast(errMsg(error)); e.target.checked = !v; return; } me[col] = v; renderNav(); renderSettings(); }; };
  betaSw("#sBetaAv", "show_beta_av"); betaSw("#sBetaTag", "show_beta_tag");
  $("#sPhoto").onclick = pickProfilePhoto; if ($("#sPhotoX")) $("#sPhotoX").onclick = removeProfilePhoto;
  const sn = $("#sNotif"); if (sn) sn.onchange = async e => {
    const w = $("#sNotifW"); w.hidden = true;
    if (!e.target.checked) { S.notify = false; store.set("notify", false); return; }
    let perm = Notification.permission; if (perm === "default") { try { perm = await Notification.requestPermission(); } catch (er) {} }
    if (perm !== "granted") { e.target.checked = false; S.notify = false; store.set("notify", false); w.hidden = false; w.textContent = "Alerts are blocked for Unbadged in this browser. Allow notifications for this site in your browser or phone settings, then try again."; return; }
    S.notify = true; store.set("notify", true); toast("Alerts are on");
  };
  $("#sHide").onchange = e => { S.hideLang = e.target.checked; store.set("hideLang", S.hideLang); };
  $("#sBug").onclick = () => feedbackModal("Something's broken"); $("#sFb").onclick = () => feedbackModal();
  $("#sOut").onclick = async () => { await sb.auth.signOut(); location.hash = ""; location.reload(); };
  $("#sDel").onclick = () => { $("#sDelBox").hidden = false; }; $("#sDelNo").onclick = () => { $("#sDelBox").hidden = true; };
  $("#sDelYes").onclick = async () => {
    busy($("#sDelYes"), true, "Deleting…");
    const { error } = await sb.functions.invoke("delete-account", { body: {} });
    if (error) { busy($("#sDelYes"), false); toast(await fnError(error)); return; }
    await sb.auth.signOut(); location.reload();
  };
}
setInterval(() => { const e = $("#lExp"); if (!e || !S.linkExp) return; const s = Math.max(0, Math.round((S.linkExp - Date.now()) / 1000)); e.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; if (s === 0 && S.view === "settings") { S.linkCode = null; renderSettings(); } }, 1000);

/* ---------- terms ---------- */
function renderTerms() {
  $("#main").innerHTML = `<div class="col terms"><button class="act" data-view="settings" style="align-self:flex-start">← Settings</button>${TERMS_HTML}</div>`;
}

/* ---------- owner tools ---------- */
function betaRowsHTML() {
  const q = (S.betaQ || "").toLowerCase();
  const list = [...S.profiles.values()].filter(p => p.role !== "owner" && (!q || p.username.toLowerCase().includes(q))).sort((a, b) => (b.beta - a.beta) || a.username.localeCompare(b.username));
  return list.map(p => `<div class="mem">${AV(p.id, "sm")}${UL(p.id)}${p.banned ? '<span class="r18">Banned</span>' : ""}<span style="flex:1"></span><button class="btn small ${p.beta ? "" : "primary"}" data-obeta="${p.id}" data-on="${!p.beta}">${p.beta ? "Remove" : "Make beta tester"}</button></div>`).join("") || '<span class="fine">No members match.</span>';
}
function betaOwnerHTML() {
  const n = [...S.profiles.values()].filter(p => p.beta && p.role !== "owner").length;
  return `<div class="card setcard"><span class="eyebrow" style="color:#b18cff">Beta testers · ${n}</span>
   <div class="row" style="gap:12px">${BETA_AV("lg")}<p style="margin:0;font-size:14px">Beta testers get this avatar and a ${BTAG()} tag that nobody else can get. They can hide either one in their Settings.</p></div>
   <input type="text" id="obQ" placeholder="Search usernames" value="${esc(S.betaQ || "")}">
   <div id="obList">${betaRowsHTML()}</div></div>`;
}
function wireBetaOwner() {
  const q = $("#obQ"); q.oninput = () => { S.betaQ = q.value; $("#obList").innerHTML = betaRowsHTML(); };
  $("#obList").onclick = async e => { const b = e.target.closest("[data-obeta]"); if (!b) return; const on = b.dataset.on === "true", name = P(b.dataset.obeta).username;
    busy(b, true, "…"); const { error } = await sb.rpc("set_beta", { u: b.dataset.obeta, on_: on }); if (error) { busy(b, false); toast(errMsg(error)); return; }
    await loadProfiles(); renderOwner(); toast(on ? name + " is now a beta tester" : name + " is no longer a beta tester"); };
}
async function renderOwner() {
  if (!owner()) return go("home");
  const tab = S.otab || "reports";
  if (tab === "beta") await loadProfiles();
  const [{ data: st }, rep, inv, fb] = await Promise.all([
    sb.rpc("owner_stats"),
    tab === "reports" ? sb.from("reports").select("*").order("created_at", { ascending: false }).limit(100) : { data: [] },
    tab === "invites" ? sb.rpc("list_invites") : { data: [] },
    tab === "feedback" ? sb.from("feedback").select("*").order("created_at", { ascending: false }).limit(100) : { data: [] },
  ]);
  const s = st || {}, reports = rep.data || [], invites = inv.data || [], feed = fb.data || [];
  $("#main").innerHTML = `<div class="col" style="max-width:860px">
   <div class="viewhead"><div><span class="eyebrow" style="color:#ffc83d">Only you can see this</span><h1>Owner tools</h1></div></div>
   <div class="ostats"><div class="card"><b class="mono">${s.open_reports ?? 0}</b><span>open reports</span></div><div class="card"><b class="mono">${s.unused_invites ?? 0}</b><span>unused invites</span></div><div class="card"><b class="mono">${s.members ?? 0}</b><span>members</span></div><div class="card"><b class="mono">${s.feedback ?? 0}</b><span>feedback notes</span></div></div>
   <div class="seg4" style="grid-template-columns:repeat(4,1fr)"><button aria-selected="${tab === "reports"}" data-otab="reports">Reports</button><button aria-selected="${tab === "beta"}" data-otab="beta">Beta testers</button><button aria-selected="${tab === "invites"}" data-otab="invites">Invite codes</button><button aria-selected="${tab === "feedback"}" data-otab="feedback">Feedback</button></div>
   ${tab === "reports" ? (reports.map(r => `<div class="card rq ${r.status}"><div class="row" style="justify-content:space-between"><span><span class="shift">${esc(KIND_LABEL[r.kind] || r.kind)}</span> <b class="mono">${esc(r.target)}</b></span><span class="fine">${ago(r.created_at)} ago · from ${esc(P(r.reporter).username)}</span></div>
     <div><b>${esc(r.reason)}</b>${r.details ? `<div class="muted" style="font-size:14px">${esc(r.details)}</div>` : ""}</div>
     ${r.status === "open" ? `<div class="row"><button class="btn small" data-odis="${r.id}">Dismiss</button>${["account", "post", "message"].includes(r.kind) ? `<button class="btn small" data-orem="${r.id}" data-name="${esc(r.target)}">Remove their posts</button><button class="btn small dangerbtn" data-oban="${r.id}" data-name="${esc(r.target)}">Ban account</button>` : r.kind === "board" ? `<button class="btn small dangerbtn" data-olockr="${r.id}" data-name="${esc(r.target)}">Lock board</button>` : ""}</div>` : `<span class="fine">✓ ${esc(r.status)}</span>`}</div>`).join("") || '<div class="card" style="padding:16px"><span class="muted">No reports. Nice.</span></div>')
    : tab === "beta" ? betaOwnerHTML()
    : tab === "invites" ? `<div class="card setcard ownercard"><span class="eyebrow" style="color:#ffc83d">Beta invite codes</span>
      <p style="margin:0;font-size:14px">Each code lets one person join. Send it to them; once they sign up with it, it's used up.</p>
      <div class="row"><label class="fine" for="ocN">How many</label><select id="ocN">${[1, 3, 5, 10, 25].map(n => `<option>${n}</option>`).join("")}</select><input type="text" id="ocNote" placeholder="Note to yourself, like 'Jake from work'" maxlength="40" style="flex:1;min-width:160px"><button class="btn small primary" id="ocGo">Create codes</button></div>
      ${invites.length ? `<div style="overflow-x:auto"><table class="wt codes"><thead><tr><th>Code</th><th>Status</th><th></th></tr></thead><tbody>${invites.map(c => `<tr><td class="mono"><b>${esc(c.code)}</b>${c.note ? `<div class="fine">${esc(c.note)}</div>` : ""}</td><td>${c.status === "unused" ? '<span class="okchip">Unused</span>' : c.status === "used" ? `<span class="shift">Used</span><div class="fine">by ${esc(c.used_by || "deleted account")}</div>` : '<span class="r18">CANCELLED</span>'}</td><td>${c.status === "unused" ? `${navigator.share ? `<button class="act" data-share="${esc(c.code)}">Share</button>` : ""}<button class="act" data-cpy="${esc(c.code)}">Copy invite</button><button class="act" data-ccl="${esc(c.code)}">Cancel</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : '<span class="fine">No codes yet.</span>'}</div>`
    : (feed.map(f => `<div class="card rq"><div class="row" style="justify-content:space-between"><span class="shift">${esc(f.type)}</span><span class="fine">${ago(f.created_at)} ago · from ${esc(P(f.user_id).username)}</span></div><div style="font-size:14px">${esc(f.body)}</div></div>`).join("") || '<div class="card" style="padding:16px"><span class="muted">No feedback yet.</span></div>')}
  </div>`;
  document.querySelectorAll("[data-otab]").forEach(b => b.onclick = () => { S.otab = b.dataset.otab; renderOwner(); });
  if (tab === "beta") wireBetaOwner();
  const act = async (fn, args, msg, id, status) => { const { error } = await sb.rpc(fn, args); if (error) { toast(errMsg(error)); return; } if (id) await sb.rpc("resolve_report", { p_id: +id, p_status: status }); if (msg) toast(msg); await loadProfiles(); S.feedLoaded = false; renderOwner(); };
  document.querySelectorAll("[data-odis]").forEach(b => b.onclick = () => act("resolve_report", { p_id: +b.dataset.odis, p_status: "dismissed" }));
  document.querySelectorAll("[data-orem]").forEach(b => b.onclick = () => act("remove_user_posts", { uname: b.dataset.name }, "Removed posts by " + b.dataset.name, b.dataset.orem, "posts removed"));
  document.querySelectorAll("[data-oban]").forEach(b => b.onclick = () => act("ban_user", { uname: b.dataset.name, do_ban: true }, b.dataset.name + " is banned", b.dataset.oban, "account banned"));
  document.querySelectorAll("[data-olockr]").forEach(b => b.onclick = () => act("lock_board", { b: b.dataset.name, do_lock: true }, b.dataset.name + " is locked", b.dataset.olockr, "board locked"));
  if ($("#ocGo")) $("#ocGo").onclick = async () => { const note = $("#ocNote").value.trim(), m = check(note); if (m) { toast(m); return; } const { error } = await sb.rpc("create_invites", { n: +$("#ocN").value, p_note: note }); if (error) { toast(errMsg(error)); return; } renderOwner(); toast("Invite codes created"); };
  document.querySelectorAll("[data-cpy]").forEach(b => b.onclick = () => { const c = b.dataset.cpy, txt = `You're invited to the Unbadged beta, an anonymous app for people who work. Tap to join (your invite code is already filled in): ${location.origin}/#invite=${c}  Code: ${c}`; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast("Invite message copied. Paste it in a text."), () => toast("Select the code and copy it by hand.")); else toast("Select the code and copy it by hand."); });
  document.querySelectorAll("[data-share]").forEach(b => b.onclick = async () => { const c = b.dataset.share; try { await navigator.share({ title: "Join Unbadged", text: "You're invited to the Unbadged beta, an anonymous app for people who work. Your invite code is already filled in:", url: `${location.origin}/#invite=${c}` }); } catch (e) {} });
  document.querySelectorAll("[data-ccl]").forEach(b => b.onclick = async () => { await sb.rpc("cancel_invite", { p_code: b.dataset.ccl }); renderOwner(); toast("Invite cancelled"); });
}

/* ---------- radio: stations play straight from each broadcaster; the "radio" server function only finds them ---------- */
const GENRE_LIST = [["rock", "Rock"], ["country", "Country"], ["rap", "Rap"], ["metal", "Heavy Metal"], ["pop", "Pop"]];
const R = { genre: store.get("radioGenre", "rock"), lists: new Map(), now: null, state: "idle", errors: new Set() };
const radioAudio = new Audio(); radioAudio.preload = "none";
const radioFavs = () => store.get("radioFavs", []);
const isFav = id => radioFavs().some(f => f.id === id);
function toggleFav(st) { const f = radioFavs(), i = f.findIndex(x => x.id === st.id); if (i >= 0) f.splice(i, 1); else f.unshift({ id: st.id, name: st.name, url: st.url, icon: st.icon, where: st.where, kbps: st.kbps }); store.set("radioFavs", f.slice(0, 30)); }
async function loadStations(g) {
  if (R.lists.has(g)) return R.lists.get(g);
  const { data, error } = await sb.functions.invoke("radio", { body: { genre: g } });
  if (error || !data || !data.stations) throw new Error((data && data.error) || "Couldn't load stations. Try again in a minute.");
  R.lists.set(g, data.stations); return data.stations;
}
const initials = n => (String(n).replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/).filter(w => w.length > 1 && !/^(the|fm|am|radio|of|and)$/i.test(w)).slice(0, 2).map(w => w[0]).join("") || "♪").toUpperCase();
const stIcon = (st, cls = "") => `<span class="sticon ${cls}"><b>${esc(initials(st.name))}</b>${st.icon ? `<img src="${esc(st.icon)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span>`;
function playStation(st) {
  if (R.now && R.now.id === st.id && R.state !== "idle") { if (R.state === "playing" || R.state === "loading") { R.switching = false; radioAudio.pause(); R.state = "paused"; paintRadio(); } else resumeRadio(); return; }
  R.now = st; R.state = "loading"; R.errors.delete(st.id); R.switching = true;
  radioAudio.src = st.url; radioAudio.play().catch(() => {});
  sb.functions.invoke("radio", { body: { click: st.id } }).catch(() => {});
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: st.name, artist: "Break Room Radio", album: "Unbadged", artwork: st.icon ? [{ src: st.icon, sizes: "512x512" }] : [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }] });
      navigator.mediaSession.setActionHandler("play", resumeRadio);
      navigator.mediaSession.setActionHandler("pause", () => { R.switching = false; radioAudio.pause(); });
      navigator.mediaSession.setActionHandler("stop", stopRadio);
    } catch (e) {}
  }
  paintRadio();
}
function resumeRadio() { if (!R.now) return; R.state = "loading"; R.switching = true; radioAudio.src = R.now.url; radioAudio.play().catch(() => {}); paintRadio(); } // reconnect so live radio isn't behind
function stopRadio() { radioAudio.pause(); radioAudio.removeAttribute("src"); radioAudio.load(); R.now = null; R.state = "idle"; paintRadio(); }
radioAudio.addEventListener("playing", () => { R.switching = false; R.state = "playing"; paintRadio(); });
radioAudio.addEventListener("waiting", () => { if (R.now) { R.state = "loading"; paintRadio(); } });
radioAudio.addEventListener("pause", () => { if (R.switching && radioAudio.readyState < 3) return; R.switching = false; if (R.now && R.state !== "idle") { R.state = "paused"; paintRadio(); } });
radioAudio.addEventListener("error", () => { R.switching = false; if (!R.now || !radioAudio.getAttribute("src")) return; R.errors.add(R.now.id); toast(`${R.now.name} isn't working right now. Try another station.`); R.now = null; R.state = "idle"; paintRadio(); });
const PLAY_I = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>', PAUSE_I = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
function paintRadio() {
  let bar = $("#rplayer");
  if (!bar) { bar = document.createElement("div"); bar.id = "rplayer"; bar.className = "rplayer"; document.body.appendChild(bar); }
  document.body.classList.toggle("hasplayer", !!R.now);
  if (!R.now) { bar.hidden = true; } else {
    const st = R.now, live = R.state === "playing", tabs = $("#tabs");
    bar.hidden = false; bar.style.bottom = (tabs && getComputedStyle(tabs).display !== "none" ? tabs.offsetHeight : 0) + "px";
    bar.innerHTML = `${stIcon(st, "sm")}<button class="rpinfo" id="rpGo"><b>${esc(st.name)}</b><span>${live ? EQ + "LIVE" : R.state === "loading" ? "Tuning in…" : "Paused"} · Break Room Radio</span></button>
     <button class="rpbtn" id="rpPlay" aria-label="${live || R.state === "loading" ? "Pause" : "Play"}">${live || R.state === "loading" ? PAUSE_I : PLAY_I}</button><button class="rpx" id="rpStop" aria-label="Stop radio">✕</button>`;
    $("#rpPlay").onclick = () => playStation(st); $("#rpStop").onclick = stopRadio; $("#rpGo").onclick = () => go("radio");
  }
  document.querySelectorAll("[data-st]").forEach(el => { const on = R.now && R.now.id === el.dataset.st; el.classList.toggle("on", !!on); const s = el.querySelector(".ststate"); if (s) s.innerHTML = on ? (R.state === "playing" ? EQ + "Playing" : R.state === "loading" ? "Tuning in…" : "Paused") : R.errors.has(el.dataset.st) ? "Not working" : ""; });
}
async function renderRadio() {
  const g = R.genre, favs = radioFavs();
  $("#main").innerHTML = `<div class="col">
   <div class="viewhead"><div><h1>Break Room Radio</h1><span class="muted" style="font-size:13px">Free live stations. Keeps playing while you use the rest of the app.</span></div></div>
   <div class="chips">${favs.length ? `<button class="chip" data-genre="saved" aria-pressed="${g === "saved"}">★ Saved</button>` : ""}${GENRE_LIST.map(([k, l]) => `<button class="chip" data-genre="${k}" aria-pressed="${g === k}">${l}</button>`).join("")}</div>
   <div id="stList"><div class="card" style="padding:20px"><span class="muted">Finding stations…</span></div></div>
   <p class="fine">Stations stream straight from the broadcasters, found through the free <a href="https://www.radio-browser.info" target="_blank" rel="noopener">Radio Browser</a> directory. Unbadged doesn't run them or control what they play, and some may have ads or explicit lyrics. Streaming uses your data, so use Wi-Fi when you can.</p>
  </div>`;
  document.querySelectorAll("[data-genre]").forEach(b => b.onclick = () => { R.genre = b.dataset.genre; store.set("radioGenre", R.genre); renderRadio(); });
  let list;
  try { list = g === "saved" ? radioFavs() : await loadStations(g); }
  catch (e) { if (S.view === "radio" && R.genre === g) $("#stList").innerHTML = `<div class="card" style="padding:20px"><b>Couldn't load stations</b><p class="muted" style="margin:6px 0 0">${esc(e.message)}</p><button class="btn small" id="stRetry" style="margin-top:10px">Try again</button></div>`; const r = $("#stRetry"); if (r) r.onclick = renderRadio; return; }
  if (S.view !== "radio" || R.genre !== g) return;
  $("#stList").innerHTML = list.length ? `<div class="stgrid">${list.map(st => `<div class="stcard" data-st="${st.id}"><button class="stplay" data-play="${st.id}" aria-label="Play ${esc(st.name)}">${stIcon(st)}<span class="stmeta"><b>${esc(st.name)}</b><span>${esc([st.where, st.kbps ? st.kbps + " kbps" : ""].filter(Boolean).join(" · "))}</span><span class="ststate"></span></span></button><button class="stfav" data-fav="${st.id}" aria-label="${isFav(st.id) ? "Remove from saved" : "Save station"}" aria-pressed="${isFav(st.id)}">${isFav(st.id) ? "★" : "☆"}</button></div>`).join("")}</div>`
    : `<div class="card" style="padding:20px"><span class="muted">${g === "saved" ? "Tap ☆ on any station to save it here." : "No stations found right now. Try another genre."}</span></div>`;
  const byId = id => list.find(x => x.id === id);
  document.querySelectorAll("[data-play]").forEach(b => b.onclick = () => playStation(byId(b.dataset.play)));
  document.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => { const st = byId(b.dataset.fav); toggleFav(st); if (R.genre === "saved" && !radioFavs().length) R.genre = "rock"; renderRadio(); toast(isFav(st.id) ? "Saved " + st.name : "Removed from saved"); });
  paintRadio();
}
window.addEventListener("resize", () => { if (R.now) paintRadio(); });

/* ---------- right rail ---------- */
function breakHTML() {
  return `<div class="card brk"><span class="eyebrow">On break?</span><div class="clock mono clk">${S.brkEnd ? "" : "15:00"}</div>
   <div class="row">${S.brkEnd ? `<button class="btn small" data-brk="0">End break</button>` : `<button class="btn small primary" data-brk="15">15 min</button><button class="btn small primary" data-brk="30">30 min</button>`}</div>
   <span class="fine"><button class="act" data-view="chats">Join a chat room</button></span></div>`;
}
function tick() { if (!S.brkEnd) return; const s = Math.max(0, Math.round((S.brkEnd - Date.now()) / 1000)); const t = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; document.querySelectorAll(".clk").forEach(c => c.textContent = t); if (s === 0) { S.brkEnd = null; drawRail(); toast("Break's over. Clock back in."); } }
setInterval(tick, 1000);
function drawRail() {
  $("#rail").innerHTML = breakHTML() + `<div class="card soon"><span class="eyebrow">Coming after beta</span>
   <ul class="soonlist"><li><b>Photo feed</b><span>swipe through everyone's photos</span></li><li><b>Stocks</b><span>watch the companies you work for</span></li><li><b>Jobs</b><span>real pay on every listing</span></li><li><b>Headlines</b><span>news about your company</span></li></ul>
   <button class="btn small" id="soonFb">Tell us what you want first</button></div>`;
  const mb = $("#mobBrk"); if (mb) mb.innerHTML = breakHTML();
  tick(); $("#soonFb").onclick = () => feedbackModal();
}
document.addEventListener("click", e => { const b = e.target.closest("[data-brk]"); if (b) { const m = +b.dataset.brk; S.brkEnd = m ? Date.now() + m * 60000 : null; drawRail(); } });

/* ---------- sign up ---------- */
let step = 1, signup = {};
function renderOnb() {
  const o = $("#onb"); o.hidden = false;
  const bar = `<div class="steps">${[1, 2, 3].map(i => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>`;
  const card = `<div class="timecard"><span>UNBADGED · TIME CARD</span><span>STEP ${step}/3</span></div>`;
  if (step === 1) {
    signup.username = signup.username || newHandle(); signup.phrase = signup.phrase || newPhrase(); signup.avatar = signup.avatar ?? Math.floor(Math.random() * 10);
    o.innerHTML = `<div class="card onb">${card}${bar}<h2>Clock in anonymously</h2>
    <div class="invitebox"><span class="setlabel">Invite code</span><span class="fine" style="margin:0">Unbadged is in closed beta. You need a one-time invite code to join.</span>
    <input type="text" id="invIn" placeholder="UB-XXXX-XXXX-XXXX" maxlength="17" autocomplete="off" value="${esc(signup.invite || "")}" style="font-family:var(--f-mono);letter-spacing:.08em;text-transform:uppercase"></div>
    <p>No email, no phone number, no real name. Pick an avatar and a username, or keep the random one.</p>
    ${avatarPicker(signup.avatar)}
    <div class="row"><input type="text" id="hIn" value="${esc(signup.username)}" maxlength="20" aria-label="Username" style="flex:1;min-width:0;font-family:var(--f-mono)"><button class="btn small" id="reroll">Random</button></div>
    <div class="warn" id="hW" hidden></div>
    <p class="fine" style="margin:0">Don't use your real name or anything people at work would recognize.</p>
    <p class="fine">This recovery phrase is your password and the only way back into your account. Write it down or screenshot it now. We can't reset it because we don't know who you are.</p>
    <div class="recovery">${esc(signup.phrase.replace(/-/g, " "))}</div>
    <button class="btn primary" id="n1">I saved it, continue</button>
    <p class="fine" style="margin:0;text-align:center">Already have an account? <button class="act" id="toLogin">Sign in</button></p></div>`;
    document.querySelectorAll("[data-av]").forEach(b => b.onclick = () => { signup.avatar = +b.dataset.av; document.querySelectorAll("[data-av]").forEach(x => x.setAttribute("aria-checked", x === b)); });
    const inv = $("#invIn"); inv.oninput = () => { let v = inv.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (v.startsWith("UB")) v = v.slice(2); v = v.slice(0, 12); inv.value = v ? ("UB-" + v.match(/.{1,4}/g).join("-")) : ""; signup.invite = inv.value; };
    $("#toLogin").onclick = () => renderLogin("phrase");
    $("#reroll").onclick = () => { signup.username = newHandle(); $("#hIn").value = signup.username; $("#hW").hidden = true; };
    $("#n1").onclick = () => {
      const w = $("#hW"), fail = m => { w.hidden = false; w.textContent = m; };
      signup.invite = inv.value.trim(); if (signup.invite.replace(/[^A-Z0-9]/g, "").length !== 14) return fail("Enter your invite code. It looks like UB-XXXX-XXXX-XXXX.");
      const v = $("#hIn").value.trim(), m = nameProblem(v, true); if (m) return fail(m);
      signup.username = v; step = 2; renderOnb();
    };
  }
  if (step === 2) {
    o.innerHTML = `<div class="card onb">${card}${bar}<h2>House rules</h2>
    <ul class="rules"><li><b>18 and older only.</b> No exceptions.</li><li><b>No sexual content of any kind.</b></li><li><b>Vent about the job, not people.</b> No real names, phone numbers, or addresses.</li><li><b>No threats, no hate.</b> Report anything that crosses the line.</li><li><b>Don't post company secrets.</b> Talking about pay and working conditions is fine.</li></ul>
    <label class="toggle" style="font-size:14px"><input type="checkbox" id="is18"> I'm 18 or older, and I agree to the house rules and the <button class="act" id="readTerms" style="padding:0">Closed Beta Terms</button></label>
    <div class="row"><button class="btn" id="b2">Back</button><button class="btn primary" id="n2" disabled style="flex:1">Continue</button></div></div>`;
    $("#is18").onchange = e => $("#n2").disabled = !e.target.checked;
    $("#readTerms").onclick = e => { e.preventDefault(); const c = modal(`<div class="pmhead"><span></span><button class="btn small" id="pmX">Close</button></div><div class="terms" style="max-height:60vh;overflow:auto">${TERMS_HTML}</div>`); };
    $("#b2").onclick = () => { step = 1; renderOnb(); }; $("#n2").onclick = () => { step = 3; renderOnb(); };
  }
  if (step === 3) {
    o.innerHTML = `<div class="card onb">${card}${bar}<h2>Where do you work?</h2>
    <p>Optional. It shows as a tag on your posts so people at the same company can find you. It's never paired with a store number or location.</p>
    <input type="text" id="coIn" placeholder="Company, like Walmart or Amazon" maxlength="40" value="${esc(signup.company || "")}">
    <div class="warn" id="cW" hidden></div>
    <div class="row"><button class="btn" id="b3">Back</button><button class="btn primary" id="n3" style="flex:1">Clock in</button></div></div>`;
    $("#b3").onclick = () => { step = 2; renderOnb(); };
    $("#n3").onclick = async () => {
      const w = $("#cW"), btn = $("#n3"), co = $("#coIn").value.trim(), m = check(co); if (m) { w.hidden = false; w.textContent = m; return; }
      signup.company = co; busy(btn, true, "Creating your account…");
      const { data, error } = await sb.functions.invoke("signup", { body: { invite: signup.invite, username: signup.username, password: signup.phrase, avatar: signup.avatar, company: co } });
      if (error) { busy(btn, false); const msg = await fnError(error); w.hidden = false; w.textContent = msg; if (/invite|username|name/i.test(msg)) { w.textContent = msg + " Go back to step 1 to fix it."; } return; }
      const si = await sb.auth.signInWithPassword({ email: data.email, password: signup.phrase });
      if (si.error) { busy(btn, false); w.hidden = false; w.textContent = errMsg(si.error); return; }
      o.hidden = true; signup = {}; toast("You're clocked in. Welcome to Unbadged.");
      await boot();
    };
  }
}

/* ---------- sign in ---------- */
function renderLogin(tab) {
  const o = $("#onb"); o.hidden = false; S.loginTab = tab || S.loginTab || "phrase"; const t = S.loginTab;
  o.innerHTML = `<div class="card onb"><div class="timecard"><span>UNBADGED · SIGN IN</span><span>NO EMAIL NEEDED</span></div>
   <h2>Welcome back</h2>
   <div class="seg2" role="tablist"><button role="tab" aria-selected="${t === "phrase"}" data-ltab="phrase">Recovery phrase</button><button role="tab" aria-selected="${t === "code"}" data-ltab="code">Device code</button></div>
   ${t === "phrase" ? `<p>Enter your username and your six-word recovery phrase.</p>
     <input type="text" id="lUser" placeholder="Username" autocomplete="username" style="font-family:var(--f-mono)">
     <textarea id="lPhrase" rows="2" placeholder="six words, like maple cart river orbit lantern pallet" autocomplete="current-password" style="resize:none;font-family:var(--f-mono);border:1px solid var(--line);border-radius:6px;padding:8px 9px;background:var(--surface-2)"></textarea>`
    : `<p>On a device where you're signed in, open <b>Settings → Devices → Link another device</b>. Scan the QR code with this device's camera, or type the code shown under it.</p>
     <input type="text" id="lCodeIn" placeholder="XXXX-XXXX" maxlength="9" autocomplete="one-time-code" value="${esc(S.pendingLink || "")}" style="font-family:var(--f-mono);font-size:22px;letter-spacing:.12em;text-align:center;text-transform:uppercase">`}
   <div class="warn" id="lW" hidden></div>
   <button class="btn primary" id="lGo">Sign in</button>
   <p class="fine" style="margin:0">New here? <button class="act" id="lNewAcct">Create an account with an invite code</button></p></div>`;
  o.querySelectorAll("[data-ltab]").forEach(b => b.onclick = () => renderLogin(b.dataset.ltab));
  const w = $("#lW"), fail = m => { w.hidden = false; w.textContent = m; }, btn = $("#lGo");
  const done = async () => { o.hidden = true; S.pendingLink = null; location.hash = ""; toast("Signed in"); await boot(); };
  if (t === "phrase") {
    btn.onclick = async () => {
      const u = $("#lUser").value.trim(), p = normPhrase($("#lPhrase").value);
      if (!u || !p) return fail("Enter your username and all six words.");
      if (p.split("-").length !== 6) return fail("Your recovery phrase has six words. Check that none are missing.");
      busy(btn, true, "Signing in…");
      const { data: email } = await sb.rpc("login_email", { uname: u });
      const r = email ? await sb.auth.signInWithPassword({ email, password: p }) : { error: true };
      busy(btn, false);
      if (r.error) return fail("That username and recovery phrase don't match. Check the spelling and word order.");
      done();
    };
  } else {
    const inp = $("#lCodeIn"); inp.oninput = () => { let v = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8); inp.value = v.length > 4 ? v.slice(0, 4) + "-" + v.slice(4) : v; };
    btn.onclick = async () => {
      const v = inp.value.toUpperCase(); if (v.replace("-", "").length !== 8) return fail("Codes are 8 characters, like K7QM-2XRP.");
      busy(btn, true, "Signing in…");
      const { data, error } = await sb.functions.invoke("link-device", { body: { code: v } });
      if (error) { busy(btn, false); return fail(await fnError(error)); }
      const r = await sb.auth.verifyOtp({ token_hash: data.token_hash, type: "email" });
      busy(btn, false); if (r.error) return fail("That code didn't work. Get a new one on your other device.");
      done();
    };
  }
  $("#lNewAcct").onclick = () => { step = 1; renderOnb(); };
}

/* ---------- live updates ---------- */
let live = null, feedTimer = null;
function startLive() {
  if (live) return;
  live = sb.channel("ub-live")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async payload => {
      const m = payload.new;
      if (m.user_id && !S.profiles.has(m.user_id)) await loadProfiles();
      const viewing = !document.hidden && ((S.view === "chats" && S.room === m.room_id && !S.roomSettings) || (S.view === "dms" && S.dmRoom === m.room_id));
      const list = S.msgs.get(m.room_id);
      if (list && !list.some(x => x.id === m.id)) {
        await signUrls([m.img_path]); list.push(m);
        if ((S.view === "chats" && S.room === m.room_id && !S.roomSettings) || (S.view === "dms" && S.dmRoom === m.room_id)) { const box = document.querySelector(".msgs"); if (box) { box.insertAdjacentHTML("beforeend", msgHTML(m)); box.scrollTop = box.scrollHeight; } }
      }
      if (m.system || isMe(m.user_id) || S.blocks.user.has(m.user_id)) return;
      let u = S.unread.get(m.room_id);
      if (!u) { await loadUnread(); u = S.unread.get(m.room_id); if (!u) return; } // public rooms don't notify
      else if (!viewing) u.n++;
      if (viewing) { markRead(m.room_id); return; }
      paintUnread();
      if (!u.muted) notifyNew(m, u);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "follows", filter: `followee=eq.${S.uid}` }, async payload => {
      const f = payload.new; if (S.follows.in.has(f.follower)) return;
      if (!S.profiles.has(f.follower)) await loadProfiles();
      S.follows.in.add(f.follower); if (S.blocks.user.has(f.follower)) return;
      toast(S.follows.out.has(f.follower) ? `${P(f.follower).username} followed you back. You can message each other now.` : `${P(f.follower).username} followed you`);
      if (S.follows.out.has(f.follower)) loadUnread();
      if (S.view === "settings") renderSettings();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => {
      clearTimeout(feedTimer); feedTimer = setTimeout(async () => { await loadProfiles(); await loadFeed(); if (S.view === "home" && !document.activeElement?.matches("textarea,input")) renderHome(); }, 800);
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, () => {
      clearTimeout(feedTimer); feedTimer = setTimeout(async () => { await loadFeed(); if (S.view === "home" && !document.activeElement?.matches("textarea,input")) renderHome(); }, 800);
    })
    .subscribe();
}

/* ---------- render & boot ---------- */
async function render() {
  renderNav();
  const views = { home: renderHome, pay: renderPay, boards: renderBoards, chats: renderChats, dms: renderDMs, settings: renderSettings, owner: renderOwner, terms: renderTerms, profile: renderProfile, radio: renderRadio };
  try { await (views[S.view] || renderHome)(); } catch (e) { console.error(e); toast("Couldn't load that. Check your connection and try again."); }
  drawRail();
}
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const m = location.hash.match(/link=([A-Z0-9]{8})/i);
    if (m) { S.pendingLink = m[1].toUpperCase().slice(0, 4) + "-" + m[1].toUpperCase().slice(4); renderLogin("code"); }
    else if (/invite=/i.test(location.hash)) { const c = (location.hash.match(/invite=([A-Z0-9-]+)/i) || [])[1] || ""; const v = c.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^UB/, "").slice(0, 12); signup.invite = v ? "UB-" + v.match(/.{1,4}/g).join("-") : ""; step = 1; renderOnb(); }
    else { step = 1; renderOnb(); }
    return;
  }
  S.uid = session.user.id;
  await loadProfiles();
  if (!S.profiles.has(S.uid)) { await sb.auth.signOut(); step = 1; renderOnb(); return; }
  const me = P(S.uid); if (me.accent && store.get("accent", null) === null) setAccent(me.accent);
  if (me.banned) { $("#main").innerHTML = `<div class="col"><div class="card" style="padding:20px"><b>This account has been banned</b><p class="muted">It broke the house rules. If you think this is a mistake, contact the email in the Closed Beta Terms.</p></div></div>`; renderNav(); return; }
  await Promise.all([loadSocial(), loadBoards(), loadUnread()]);
  $("#onb").hidden = true;
  S.feedLoaded = false; await render(); paintUnread(); startLive();
}
boot();
