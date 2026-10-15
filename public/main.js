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
};
const store = {
  get(k, d) { try { const v = localStorage.getItem("ub-" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("ub-" + k, JSON.stringify(v)); } catch (e) {} },
};
S.prof = store.get("prof", true); S.hideLang = store.get("hideLang", false);

/* ---------- small helpers ---------- */
const P = id => S.profiles.get(id) || { id, username: "Someone", avatar: 0, role: "member", banned: false };
const isMe = id => id === S.uid;
const owner = () => P(S.uid).role === "owner";
const OT = id => P(id).role === "owner" ? FTAG() : "";
function AV(id, size = "") {
  const p = P(id); if (p.role === "owner") return OWNER_AV(size);
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
const img = (path, alt) => path ? `<img src="${S.urls.get(path) || ""}" alt="${esc(alt)}" loading="lazy">` : "";

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
      runningMode: "IMAGE", minDetectionConfidence: 0.35,
    });
  } catch (e) { faceDet = false; }
  return faceDet;
}
async function findFaces(cv) {
  const fd = await getFaceDetector(); if (!fd) return null;
  const out = [];
  const add = (dets, ox, oy, s) => dets.forEach(d => { const b = d.boundingBox; out.push({ x: ox + b.originX / s, y: oy + b.originY / s, w: b.width / s, h: b.height / s }); });
  try {
    add(fd.detect(cv).detections, 0, 0, 1);
    // also scan four overlapping tiles so small faces in group photos get caught
    const W = cv.width, H = cv.height, tw = Math.round(W * 0.6), th = Math.round(H * 0.6);
    for (const [ox, oy] of [[0, 0], [W - tw, 0], [0, H - th], [W - tw, H - th]]) {
      const t = document.createElement("canvas"); t.width = tw; t.height = th; t.getContext("2d").drawImage(cv, ox, oy, tw, th, 0, 0, tw, th);
      add(fd.detect(t).detections, ox, oy, 1);
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
  const { data } = await sb.from("profiles").select("id,username,avatar,role,banned,company");
  S.profiles = new Map((data || []).map(p => [p.id, p]));
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
  const { data } = await sb.from("boards").select("*").order("sort");
  S.boards = data || [];
  const saved = store.get("joined:" + S.uid, null);
  if (saved) S.joined = new Set(saved);
  else {
    const me = P(S.uid), co = S.boards.find(b => b.id.toLowerCase() === ("b/" + (me.company || "").replace(/\s+/g, "")).toLowerCase());
    S.joined = new Set([...(co ? [co.id] : []), "b/NightShift", "b/Retail"]);
    store.set("joined:" + S.uid, [...S.joined]);
  }
}
async function loadFeed() {
  const { data: posts } = await sb.from("posts").select("id,user_id,board,title,body,strong,img_path,created_at").order("created_at", { ascending: false }).limit(100);
  const list = posts || [], ids = list.map(p => p.id);
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
  S.posts = list;
  await signUrls(list.map(p => p.img_path));
}
async function loadShift() {
  const [r, m] = await Promise.all([sb.rpc("shift_results"), sb.from("shift_answers").select("choice").eq("day", chicagoDay()).maybeSingle()]);
  const counts = [0, 0, 0, 0]; (r.data || []).forEach(x => counts[x.choice] = Number(x.n));
  S.shift = { counts, mine: m.data ? m.data.choice : null };
}

/* ---------- nav ---------- */
const NAV = [["home", "Home", ICON.home], ["pay", "Pay Check", ICON.pay], ["boards", "Boards", ICON.boards], ["chats", "Chats", ICON.chat], ["dms", "Messages", ICON.dm]];
function renderNav() {
  const b = ([id, label, ic]) => `<button class="navbtn" data-view="${id}" ${S.view === id ? 'aria-current="page"' : ""}>${ic}<span>${label}</span></button>`;
  $("#navMain").innerHTML = (owner() ? [...NAV, ["owner", "Owner tools", ICON.plus]] : NAV).map(b).join("");
  $("#tabs").innerHTML = (owner() ? [...NAV, ["owner", "Owner", ICON.plus]] : NAV).map(b).join("");
  $("#myBoards").innerHTML = [...S.joined].filter(x => !S.blocks.board.has(x)).map(x => `<button class="boardlink" data-board="${esc(x)}">${esc(x)}</button>`).join("");
  const me = P(S.uid);
  $("#meHandle").textContent = me.username; $("#meHandle").classList.toggle("oname", me.role === "owner");
  $("#meTag").innerHTML = OT(S.uid); $("#meAv").innerHTML = AV(S.uid, "sm"); $("#meCog").innerHTML = COG;
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
    const p = S.posts.find(x => x.id == v.closest(".post").dataset.id), n = +v.dataset.vote;
    const res = p.my === n ? await sb.from("votes").delete().eq("post_id", p.id).eq("user_id", S.uid) : await sb.from("votes").upsert({ post_id: p.id, user_id: S.uid, value: n });
    if (res.error) { toast(errMsg(res.error)); return; }
    p.score += (p.my === n ? -n : n - p.my); p.my = p.my === n ? 0 : n; renderHome(); return;
  }
  const c = e.target.closest("[data-cmt]"); if (c) { const el = $("#c" + c.dataset.cmt); el.hidden = !el.hidden; S.openC = el.hidden ? null : +c.dataset.cmt; return; }
  const rp = e.target.closest("[data-reply]");
  if (rp) {
    const id = +rp.dataset.reply, inp = $("#ci" + id), w = $("#cw" + id), m = check(inp.value);
    if (m) { w.hidden = false; w.textContent = m; return; } if (!inp.value.trim()) return;
    busy(rp, true, "…"); const { error } = await sb.from("comments").insert({ post_id: id, body: inp.value.trim() });
    if (error) { busy(rp, false); toast(errMsg(error)); return; }
    S.openC = id; await loadFeed(); renderHome(); return;
  }
  const dp = e.target.closest("[data-delpost]");
  if (dp) { const { error } = await sb.from("posts").delete().eq("id", +dp.dataset.delpost); if (error) { toast(errMsg(error)); return; } await loadFeed(); renderHome(); toast("Post deleted"); return; }
  const orm = e.target.closest("[data-oremove]");
  if (orm) { const { error } = await sb.rpc("remove_post", { p_id: +orm.dataset.oremove }); if (error) { toast(errMsg(error)); return; } await loadFeed(); renderHome(); toast("Post removed for everyone"); return; }
});

/* ---------- pay check ---------- */
async function renderPay() {
  const { data } = await sb.rpc("wage_stats"); S.wages = new Map((data || []).map(r => [r.role_key, r]));
  const cat = S.payCat || "All", q = (S.payQ || "").toLowerCase();
  const rows = WAGES.map((w, i) => [w, i]).filter(([w]) => (cat === "All" || w.cat === cat) && (!q || wLabel(w).toLowerCase().includes(q)));
  $("#main").innerHTML = `<div class="col">
   <div class="viewhead"><h1>Pay Check</h1><span class="muted" style="font-size:13px">Real pay, shared anonymously by members</span></div>
   <div class="card composer">
    <div class="row"><select id="pRole" aria-label="Your job" style="flex:1;min-width:200px">${WAGE_CATS.map(c => `<optgroup label="${c}">${WAGES.map((w, i) => [w, i]).filter(([w]) => w.cat === c).map(([w, i]) => `<option value="${i}">${esc(wLabel(w))}</option>`).join("")}</optgroup>`).join("")}</select>
    <input type="text" id="pRate" inputmode="decimal" placeholder="Your hourly pay, like 16.40" style="flex:1;min-width:140px"><button class="btn primary" id="pGo">Share and compare</button></div>
    <p class="fine" style="margin:0">Your pay is saved with no username attached. A range shows once 3 people in a job have shared during the beta.</p>
   </div>
   <div id="pOut"></div>
   <div class="viewhead" style="margin-top:6px"><h2 style="font-size:22px">Reported pay by job</h2><input type="text" id="pSearch" placeholder="Search jobs, like welder" value="${esc(S.payQ || "")}" style="min-width:0;flex:0 1 220px"></div>
   <div class="chips">${["All", ...WAGE_CATS].map(c => `<button class="chip" data-pcat="${c}" aria-pressed="${cat === c}">${c}</button>`).join("")}</div>
   <div class="card" style="overflow-x:auto"><table class="wt"><thead><tr><th>Job</th><th>Low</th><th>Median</th><th>High</th><th>Reports</th></tr></thead><tbody>
   ${rows.map(([w]) => { const s = S.wages.get(wLabel(w)); return `<tr><td>${esc(wLabel(w))}<div class="fine">${esc(w.cat)}</div></td>${s ? `<td class="mono">$${(+s.lo).toFixed(2)}</td><td class="mono"><b>$${(+s.med).toFixed(2)}</b></td><td class="mono">$${(+s.hi).toFixed(2)}</td><td class="mono">${s.n}</td>` : `<td colspan="4" class="fine">Not enough reports yet</td>`}</tr>`; }).join("")}
   </tbody></table></div>
   <p class="fine">Low and high are the 10th and 90th percentile of what members shared.</p>
  </div>`;
  document.querySelectorAll("[data-pcat]").forEach(b => b.onclick = () => { S.payCat = b.dataset.pcat; renderPay(); });
  const ps = $("#pSearch"); ps.oninput = () => { S.payQ = ps.value; const pos = ps.selectionStart; renderPay().then(() => { const n = $("#pSearch"); n.focus(); n.setSelectionRange(pos, pos); }); };
  $("#pGo").onclick = async () => {
    const w = WAGES[$("#pRole").value], key = wLabel(w), r = parseFloat($("#pRate").value.replace(/[$,]/g, ""));
    if (!(r > 5 && r < 300)) { $("#pOut").innerHTML = `<div class="warn">Enter your hourly pay as a number, like 16.40.</div>`; return; }
    const shared = store.get("wages:" + S.uid, []);
    if (!shared.includes(key)) { const { error } = await sb.from("wages").insert({ role_key: key, rate: r }); if (error) { toast(errMsg(error)); return; } shared.push(key); store.set("wages:" + S.uid, shared); }
    const { data } = await sb.rpc("wage_stats"); S.wages = new Map((data || []).map(x => [x.role_key, x]));
    const s = S.wages.get(key);
    if (!s) { $("#pOut").innerHTML = `<div class="card result"><span class="eyebrow">${esc(key)}</span><h3 class="srq">Thanks, your pay was added</h3><p class="fine" style="margin:0">A range shows once at least 3 people in this job have shared. Invite a coworker to add theirs.</p></div>`; return; }
    const lo = +s.lo, med = +s.med, hi = +s.hi, span = Math.max(.01, hi - lo), pos = Math.max(0, Math.min(100, (r - lo) / span * 100)), diff = r - med;
    const verdict = diff >= 0.25 ? ["ok", "You're above the median"] : diff <= -0.25 ? ["bad", "You're below the median"] : ["mid", "You're right at the median"];
    $("#pOut").innerHTML = `<div class="card result"><span class="eyebrow">${esc(key)} · ${s.n} reports</span><h3 class="srq ${verdict[0]}">${verdict[1]}${Math.abs(diff) >= .25 ? ` by $${Math.abs(diff).toFixed(2)}/hr` : ""}</h3>
     <div class="range"><i style="left:${pos}%"></i></div><div class="row mono" style="justify-content:space-between"><span>$${lo.toFixed(2)}</span><span>median $${med.toFixed(2)}</span><span>$${hi.toFixed(2)}</span></div>
     <p class="fine" style="margin:0">That's about $${Math.abs(diff * 2080).toLocaleString(undefined, { maximumFractionDigits: 0 })} a year at full time.</p></div>`;
    renderPayTableOnly();
  };
}
function renderPayTableOnly() {}

/* ---------- boards ---------- */
function renderBoards() {
  $("#main").innerHTML = `<div class="col" style="max-width:900px">
   <div class="viewhead"><h1>Boards</h1><span class="muted" style="font-size:13px">Join your company, your industry, or anyone's.</span></div>
   <div class="row"><input type="text" id="bsearch" placeholder="Search companies and industries" style="flex:1;min-width:0"></div>
   <div class="boards" id="blist"></div>
   <p class="fine">Want a board for your company? Ask in Settings → Send feedback.</p></div>`;
  const draw = q => {
    $("#blist").innerHTML = S.boards.filter(b => b.id.toLowerCase().includes(q.toLowerCase())).map(b => `<div class="card bcard"><span class="k">${esc(b.kind)}${b.locked ? " · 🔒 locked" : ""}</span><h3>${esc(b.id)}</h3><p class="muted" style="margin:0;font-size:14px">${esc(b.description)}</p>
     <div class="row"><button class="btn small ${S.joined.has(b.id) ? "" : "primary"}" data-join="${esc(b.id)}">${S.joined.has(b.id) ? "Joined" : "Join"}</button><button class="btn small" data-board="${esc(b.id)}">View</button></div>
     <div class="row">${S.blocks.board.has(b.id) ? `<span class="fine">⊘ Blocked</span><button class="act" data-unblock-board="${esc(b.id)}">Unblock</button>` : `<button class="act" data-rpt='${esc(JSON.stringify({ kind: "board", name: b.id }))}'>⚑ Report</button><button class="act" data-bboard="${esc(b.id)}">⊘ Block board</button>`}${owner() ? `<button class="act" data-olock="${esc(b.id)}" data-lock="${!b.locked}">${b.locked ? "Unlock" : "Lock"} (owner)</button>` : ""}</div></div>`).join("");
  };
  draw(""); $("#bsearch").oninput = e => draw(e.target.value);
}
document.addEventListener("click", async e => {
  const j = e.target.closest("[data-join]");
  if (j) { const id = j.dataset.join; S.joined.has(id) ? S.joined.delete(id) : S.joined.add(id); store.set("joined:" + S.uid, [...S.joined]); renderNav(); renderBoards(); return; }
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
    const { error } = await sb.from("messages").insert({ room_id: roomId, body: body || "", img_path: img_path || null });
    if (error) { toast(errMsg(error)); return false; } await loadMessages(roomId); redraw(); return true;
  };
  const go = async () => { const m = check(inp.value); if (m) { w.hidden = false; w.textContent = m; return; } w.hidden = true; const v = inp.value.trim(); if (!v) return; inp.value = ""; if (!await send(v)) inp.value = v; };
  $("#" + id + "S").onclick = go; inp.onkeydown = e => { if (e.key === "Enter") go(); };
  $("#" + id + "F").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) processPhoto(f, pctx, async url => { try { const p = await uploadPhoto(url); if (await send("", p)) toast("Photo sent"); } catch (er) { toast(errMsg(er)); } }); };
  const box = document.querySelector(".msgs"); if (box) box.scrollTop = box.scrollHeight;
}
async function loadRooms() {
  const { data } = await sb.from("rooms").select("*").in("kind", ["public", "group"]).order("created_at");
  S.rooms = (data || []).filter(r => !S.blocks.room.has(r.id));
  const { data: mem } = await sb.from("room_members").select("room_id,user_id,role,muted");
  S.members = new Map(); (mem || []).forEach(m => { if (!S.members.has(m.room_id)) S.members.set(m.room_id, []); S.members.get(m.room_id).push(m); });
}
const myMember = r => (S.members.get(r.id) || []).find(m => isMe(m.user_id));
const isAdmin = r => r.kind === "group" && (myMember(r) || {}).role === "admin";
const roomSub = r => r.kind === "group" ? `Private group · ${(S.members.get(r.id) || []).length} members${(myMember(r) || {}).muted ? " · muted" : ""}` : (r.board ? r.board + " · public room" : "Public room");
async function renderChats() {
  await loadRooms();
  if (!S.room || !S.rooms.find(r => r.id === S.room)) S.room = (S.rooms[0] || {}).id;
  const r = S.rooms.find(x => x.id === S.room);
  if (!r) { $("#main").innerHTML = `<div class="col"><h1>Group chats</h1><p class="muted">No rooms yet.</p></div>`; return; }
  if (!S.roomSettings) await loadMessages(r.id);
  $("#main").innerHTML = `<div class="chatview"><div class="viewhead"><h1>Group chats</h1><button class="btn small primary" id="newGroup">+ New group chat</button></div>
   <div class="card chatwrap"><div class="rooms">${S.rooms.map(x => `<button class="room" data-room="${x.id}" aria-current="${x.id === S.room}"><b>${x.kind === "group" ? "🔒 " : ""}${esc(x.name)}</b><small>${esc(roomSub(x))}</small></button>`).join("")}</div>
   <div class="thread"><div class="threadhead"><div><h2>${esc(r.name)}</h2><span class="muted mono">${esc(roomSub(r))}</span></div>
    <button class="btn small" id="roomGear">${COG.replace("<svg", '<svg width="16" height="16" style="vertical-align:-3px"')} ${S.roomSettings ? "Back to chat" : "Settings"}</button></div>
   ${S.roomSettings ? roomSettingsHTML(r) : `<div class="msgs">${(S.msgs.get(r.id) || []).map(msgHTML).join("") || '<div class="sysmsg">No messages in the last few days. Say something.</div>'}</div>${sendBar("room")}`}
   </div></div></div>`;
  $("#newGroup").onclick = newGroupModal;
  $("#roomGear").onclick = () => { S.roomSettings = !S.roomSettings; renderChats(); };
  const cur = document.querySelector('.room[aria-current="true"]'); if (cur) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
  if (S.roomSettings) return wireRoomSettings(r);
  const pctx = r.kind === "group" && r.allow_faces ? { blur: false, note: "This group allows faces. Only its members can see photos." } : { blur: true, note: r.kind === "group" ? "Faces are blurred in this group. An admin can allow faces in settings." : "Public room. Faces are always blurred." };
  wireSend("room", r.id, renderChats, pctx);
}
document.addEventListener("click", e => { const r = e.target.closest("[data-room]"); if (r) { S.room = r.dataset.room; S.roomSettings = false; renderChats(); } });

function roomSettingsHTML(r) {
  const mem = myMember(r) || {};
  if (r.kind !== "group") return `<div class="rset">
   <div class="rsec"><span class="eyebrow">About this room</span><p style="margin:0;font-size:14px">Public room run by Unbadged. Everyone can read and post. Faces are always blurred and the house rules apply. Messages older than 7 days are hidden.</p></div>
   <div class="rsec"><div class="row"><button class="btn small" id="rReport">⚑ Report room</button><button class="btn small" id="rBlock">⊘ Block room</button></div><div id="rConfirm" hidden></div></div></div>`;
  const adm = isAdmin(r), lock = adm ? "" : "disabled", ro = adm ? "" : '<span class="fine">Only admins can change this.</span>';
  const people = (S.members.get(r.id) || []).map(m => `<div class="mem">${AV(m.user_id, "sm")}${UL(m.user_id)}${isMe(m.user_id) ? " (you)" : ""}${m.role === "admin" ? '<span class="shift">Admin</span>' : ""}<span style="flex:1"></span>
    ${adm && !isMe(m.user_id) ? `<button class="act" data-mk="${m.user_id}" data-make="${m.role !== "admin"}">${m.role === "admin" ? "Remove admin" : "Make admin"}</button><button class="act" data-rm="${m.user_id}">Remove</button>` : ""}</div>`).join("");
  const canAdd = adm || r.invites === "everyone";
  const addable = [...S.follows.out].filter(id => mutual(id) && !(S.members.get(r.id) || []).some(m => m.user_id === id) && !S.blocks.user.has(id));
  return `<div class="rset">
   <div class="rsec"><span class="eyebrow">Group name</span>
    <div class="row"><input type="text" id="rName" value="${esc(r.name)}" maxlength="40" ${lock} style="flex:1;min-width:0"><button class="btn small" id="rNameSave" ${lock}>Save</button></div>${ro}</div>
   <div class="rsec"><span class="eyebrow">Members · ${(S.members.get(r.id) || []).length}</span>${people}
    ${canAdd ? (addable.length ? `<details id="rAddBox"><summary>Add people</summary><p class="fine">You can add people you follow each other with.</p>${addable.map(id => `<label class="pick">${AV(id, "sm")}<span class="mono">${esc(P(id).username)}</span><input type="checkbox" value="${id}"></label>`).join("")}<button class="btn small primary" id="rAdd">Add to group</button></details>` : '<span class="fine">To add someone, follow each other first.</span>') : '<span class="fine">Only admins can add people to this group.</span>'}</div>
   <div class="rsec"><span class="eyebrow">Photos</span>${sw("rFaces", r.allow_faces, "Allow faces in photos", "Off: faces are blurred automatically. On: photos post as-is, visible only to members. Everyone gets notified when this changes.")}${ro}</div>
   <div class="rsec"><span class="eyebrow">Who can add people</span>
    <div class="seg2"><button aria-selected="${r.invites === "admins"}" data-inv="admins" ${lock}>Admins only</button><button aria-selected="${r.invites === "everyone"}" data-inv="everyone" ${lock}>All members</button></div>${ro}</div>
   <div class="rsec"><span class="eyebrow">Disappearing messages</span>
    <div class="seg4">${["Off", "24 hours", "7 days", "30 days"].map(o => `<button aria-selected="${r.expiry === o}" data-exp="${o}" ${lock}>${o}</button>`).join("")}</div>
    <span class="fine">${r.expiry === "Off" ? "Messages stay until someone deletes them." : `Messages older than ${r.expiry} are hidden.`}</span>${ro}</div>
   <div class="rsec">${sw("rMute", mem.muted, "Mute notifications", "Just for you.")}</div>
   <div class="rsec"><div class="row"><button class="btn small" id="rReport">⚑ Report group</button><button class="btn small" id="rLeave">Leave group</button><button class="btn small" id="rBlock">⊘ Leave and block</button>${adm ? '<button class="btn small" id="rDelete">Delete group</button>' : ""}</div>
    <div id="rConfirm" hidden></div></div></div>`;
}
function wireRoomSettings(r) {
  const re = () => renderChats(), q = id => $(id);
  const call = async (fn, args, msg) => { const { error } = await sb.rpc(fn, args); if (error) { toast(errMsg(error)); return false; } if (msg) toast(msg); await re(); return true; };
  const confirmBox = (msg, yes, act) => { const c = q("#rConfirm"); c.hidden = false; c.innerHTML = `<p style="margin:8px 0;font-size:14px">${msg}</p><div class="row"><button class="btn small" id="rNo">Cancel</button><button class="btn small dangerbtn" id="rYes">${yes}</button></div>`; q("#rNo").onclick = () => { c.hidden = true; }; q("#rYes").onclick = act; };
  q("#rReport").onclick = () => reportModal({ kind: r.kind === "group" ? "group" : "room", name: r.name, roomId: r.id });
  q("#rBlock").onclick = () => confirmBox(r.kind === "group" ? "Leave and block this group? Nobody can add you back. Unblock it in Settings any time." : "Block this room? It disappears from your chats list.", r.kind === "group" ? "Leave and block" : "Block room", () => blockRoom(r));
  if (r.kind !== "group") return;
  const mute = q("#rMute"); if (mute) mute.onchange = async e => { await sb.from("room_members").update({ muted: e.target.checked }).eq("room_id", r.id).eq("user_id", S.uid); re(); };
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
  document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => call("remove_member", { r: r.id, u: b.dataset.rm }));
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
  if (S.dm && st === "mutual") { const { data, error } = await sb.rpc("open_dm", { other: S.dm }); if (!error) { room = data; S.dmRooms = [{ id: room, kind: "dm" }]; await loadMessages(room); } }
  $("#main").innerHTML = `<div class="chatview"><div class="viewhead"><h1>Messages</h1><span class="muted" style="font-size:13px">1-on-1 chat opens when you follow each other.</span></div>
   ${people.length ? `<div class="card chatwrap"><div class="rooms">${people.map(([id, s]) => `<button class="room" data-dm="${id}" aria-current="${id === S.dm}"><b class="mono">${esc(P(id).username)}</b>${s === "mutual" ? '<span class="mutual">✓ Mutual</span>' : `<span class="pending">${s}</span>`}</button>`).join("")}</div>
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
  toast(on ? (S.follows.in.has(id) ? "You follow each other now. Say hi in Messages." : "Following. You can message once they follow you back.") : "Unfollowed");
}

/* ---------- profiles, report & block ---------- */
function openUser(id) {
  const p = P(id), blocked = S.blocks.user.has(id), fol = S.follows.out.has(id);
  const close = modal(`<div class="pmhead"><h2>Profile</h2><button class="btn small" id="pmX">Close</button></div>
   <div class="row" style="gap:12px">${AV(id, "lg")}<div><b class="mono ${p.role === "owner" ? "oname" : ""}" style="font-size:17px">${esc(p.username)}</b>${OT(id)}<div class="fine">${p.company ? esc(p.company) + " · " : ""}${S.follows.in.has(id) ? "Follows you" : "Anonymous member"}${blocked ? " · blocked" : ""}</div></div></div>
   <div class="row">${blocked ? "" : `<button class="btn small ${fol ? "" : "primary"}" id="uFollow">${fol ? "✓ Following" : "+ Follow"}</button>${mutual(id) ? '<button class="btn small" id="uMsg">Message</button>' : ""}`}
   <span style="flex:1"></span><button class="btn small" id="uRpt">⚑ Report</button>${blocked ? '<button class="btn small" id="uUnblk">Unblock</button>' : '<button class="btn small" id="uBlk">⊘ Block</button>'}</div>
   ${owner() && p.role !== "owner" ? `<div class="row ownerbox"><span class="fine" style="flex:1">Owner tools</span><button class="btn small" id="oRem">Remove their posts</button><button class="btn small dangerbtn" id="oBan">${p.banned ? "Unban" : "Ban account"}</button></div>` : ""}`);
  if ($("#uFollow")) $("#uFollow").onclick = async () => { await follow(id, !fol); close(); openUser(id); };
  if ($("#uMsg")) $("#uMsg").onclick = () => { close(); S.dm = id; go("dms"); };
  $("#uRpt").onclick = () => reportModal({ kind: "account", name: p.username });
  if ($("#uBlk")) $("#uBlk").onclick = () => confirmBlock(id);
  if ($("#uUnblk")) $("#uUnblk").onclick = async () => { await sb.from("blocks").delete().eq("kind", "user").eq("target", id); S.blocks.user.delete(id); close(); render(); toast("Unblocked " + p.username); };
  if ($("#oRem")) $("#oRem").onclick = async () => { const { error } = await sb.rpc("remove_user_posts", { uname: p.username }); if (error) { toast(errMsg(error)); return; } S.feedLoaded = false; close(); render(); toast("Removed posts by " + p.username); };
  if ($("#oBan")) $("#oBan").onclick = async () => { const { error } = await sb.rpc("ban_user", { uname: p.username, do_ban: !p.banned }); if (error) { toast(errMsg(error)); return; } await loadProfiles(); S.feedLoaded = false; close(); render(); toast(p.banned ? "Unbanned" : p.username + " is banned"); };
}
function confirmBlock(id) {
  const close = modal(`<div class="pmhead"><h2>Block ${esc(P(id).username)}?</h2><button class="btn small" id="pmX">Cancel</button></div>
   <ul class="rules"><li>They can't message you or add you to group chats.</li><li>Their posts, comments, photos, and messages are hidden from you.</li><li>They aren't told you blocked them.</li></ul>
   <div class="row" style="justify-content:flex-end"><button class="btn dangerbtn" id="bYes">Block</button></div>`);
  $("#bYes").onclick = async () => { const { error } = await sb.from("blocks").insert({ kind: "user", target: id }); if (error && !/duplicate/.test(error.message)) { toast(errMsg(error)); return; } S.blocks.user.add(id); close(); render(); toast("Blocked. Undo any time in Settings."); };
}
async function blockRoom(r) {
  if (r.kind === "group") { const { error } = await sb.rpc("leave_room", { r: r.id }); if (error) { toast(errMsg(error)); return; } }
  await sb.from("blocks").insert({ kind: "room", target: r.id }); S.blocks.room.add(r.id); S.room = null; S.roomSettings = false; render(); toast("Blocked " + r.name);
}
async function blockBoard(b) { await sb.from("blocks").insert({ kind: "board", target: b }); S.blocks.board.add(b); S.joined.delete(b); store.set("joined:" + S.uid, [...S.joined]); if (S.filter === b) S.filter = "All"; render(); toast("Blocked " + b); }
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

/* ---------- settings ---------- */
function avatarPicker(cur) { return `<div class="avgrid" role="radiogroup" aria-label="Avatar">${AV_GLY.map((g, i) => `<button class="avpick" role="radio" aria-checked="${cur === i}" data-av="${i}" title="${g[0]}" style="background:${AV_COL[i]}"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${g[1]}"/></svg></button>`).join("")}</div>`; }
function renderSettings() {
  const me = P(S.uid), pol = [
    ["House rules", "18+ only. No sexual content. Vent about the job, not specific people. No threats, hate, or doxxing. Don't post company secrets."],
    ["Photo and face-blur policy", "Every photo has location data removed. Faces are found and blurred on your device before upload in public posts and public rooms. Private groups can allow faces. DMs leave faces visible."],
    ["Privacy", "Unbadged never asks for your name, email, phone, or location. Pay Check entries are stored with no username. During the beta, private messages aren't end-to-end encrypted."],
  ];
  $("#main").innerHTML = `<div class="col">
   <div class="viewhead"><h1>Settings</h1></div>
   <div class="card setcard"><span class="eyebrow">Account</span>
    <div class="row" style="gap:12px"><span id="setAv">${AV(S.uid, "lg")}</span><div><b class="mono ${me.role === "owner" ? "oname" : ""}" style="font-size:17px">${esc(me.username)}</b>${OT(S.uid)}<div class="fine">18+ confirmed · ${me.role === "owner" ? "Owner" : "Beta tester"}${me.company ? " · " + esc(me.company) : ""}</div></div></div>
    ${me.role === "owner" ? '<div class="ownerbox"><b>Founder look locked in.</b> The gold crown avatar and FOUNDER tag are reserved for your account.</div><button class="btn small primary" data-view="owner" style="align-self:flex-start">Open Owner tools</button>' : `<span class="setlabel">Avatar</span>${avatarPicker(me.avatar)}`}
    <span class="setlabel">Username</span>
    <div class="row"><input type="text" id="sName" value="${esc(me.username)}" maxlength="20" style="flex:1;min-width:0;font-family:var(--f-mono)"><button class="btn small primary" id="sSave">Save</button></div>
    <div class="warn" id="sW" hidden></div>
    <span class="setlabel">Company tag</span>
    <div class="row"><input type="text" id="sCo" value="${esc(me.company || "")}" maxlength="40" placeholder="Optional" style="flex:1;min-width:0"><button class="btn small" id="sCoSave">Save</button></div>
    <span class="setlabel">Recovery phrase</span>
    <div id="sRecBox"><p class="fine" style="margin:0">Unbadged never stores your phrase where anyone can read it, so it can't show it again. Lost it? Make a new one while you're signed in.</p><button class="btn small" id="sRecNew" style="margin-top:6px">Make a new recovery phrase</button></div>
   </div>
   <div class="card setcard"><span class="eyebrow">Appearance</span><span class="setlabel">Accent color</span>
    <div class="swatches">${ACCENTS.map(([n, c]) => `<button class="swatch" role="radio" aria-checked="${S.accent === c}" data-accent="${c}" title="${n}" style="background:${c}"><span>${n}</span></button>`).join("")}</div></div>
   <div class="card setcard"><span class="eyebrow">Devices</span>
    <div class="devrow"><span>📱 <b>This device</b></span><span class="okchip">Signed in now</span></div>
    ${S.linkCode && Date.now() < S.linkExp ? `<div class="linkbox"><div class="qr" id="qrBox"></div><span class="setlabel" style="text-align:center">Or type this code on the other device</span><div class="lcode mono">${S.linkCode}</div>
      <span class="fine" style="text-align:center">Expires in <b class="mono" id="lExp"></b>. Works once. Unbadged staff will never ask you for this code.</span><div class="row" style="justify-content:center"><button class="btn small" id="lNew">Get a new code</button><button class="btn small" id="lCancel">Done</button></div></div>`
      : `<p style="margin:0;font-size:14px">Sign in on a laptop, tablet, or new phone without typing your phrase.</p><button class="btn primary small" id="lMake" style="align-self:flex-start">Link another device</button>`}</div>
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
async function renderOwner() {
  if (!owner()) return go("home");
  const tab = S.otab || "reports";
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
   <div class="seg4" style="grid-template-columns:repeat(3,1fr)"><button aria-selected="${tab === "reports"}" data-otab="reports">Reports</button><button aria-selected="${tab === "invites"}" data-otab="invites">Invite codes</button><button aria-selected="${tab === "feedback"}" data-otab="feedback">Feedback</button></div>
   ${tab === "reports" ? (reports.map(r => `<div class="card rq ${r.status}"><div class="row" style="justify-content:space-between"><span><span class="shift">${esc(KIND_LABEL[r.kind] || r.kind)}</span> <b class="mono">${esc(r.target)}</b></span><span class="fine">${ago(r.created_at)} ago · from ${esc(P(r.reporter).username)}</span></div>
     <div><b>${esc(r.reason)}</b>${r.details ? `<div class="muted" style="font-size:14px">${esc(r.details)}</div>` : ""}</div>
     ${r.status === "open" ? `<div class="row"><button class="btn small" data-odis="${r.id}">Dismiss</button>${["account", "post", "message"].includes(r.kind) ? `<button class="btn small" data-orem="${r.id}" data-name="${esc(r.target)}">Remove their posts</button><button class="btn small dangerbtn" data-oban="${r.id}" data-name="${esc(r.target)}">Ban account</button>` : r.kind === "board" ? `<button class="btn small dangerbtn" data-olockr="${r.id}" data-name="${esc(r.target)}">Lock board</button>` : ""}</div>` : `<span class="fine">✓ ${esc(r.status)}</span>`}</div>`).join("") || '<div class="card" style="padding:16px"><span class="muted">No reports. Nice.</span></div>')
    : tab === "invites" ? `<div class="card setcard ownercard"><span class="eyebrow" style="color:#ffc83d">Beta invite codes</span>
      <p style="margin:0;font-size:14px">Each code lets one person join. Send it to them; once they sign up with it, it's used up.</p>
      <div class="row"><label class="fine" for="ocN">How many</label><select id="ocN">${[1, 3, 5, 10, 25].map(n => `<option>${n}</option>`).join("")}</select><input type="text" id="ocNote" placeholder="Note to yourself, like 'Jake from work'" maxlength="40" style="flex:1;min-width:160px"><button class="btn small primary" id="ocGo">Create codes</button></div>
      ${invites.length ? `<div style="overflow-x:auto"><table class="wt codes"><thead><tr><th>Code</th><th>Status</th><th></th></tr></thead><tbody>${invites.map(c => `<tr><td class="mono"><b>${esc(c.code)}</b>${c.note ? `<div class="fine">${esc(c.note)}</div>` : ""}</td><td>${c.status === "unused" ? '<span class="okchip">Unused</span>' : c.status === "used" ? `<span class="shift">Used</span><div class="fine">by ${esc(c.used_by || "deleted account")}</div>` : '<span class="r18">CANCELLED</span>'}</td><td>${c.status === "unused" ? `<button class="act" data-cpy="${esc(c.code)}">Copy</button><button class="act" data-ccl="${esc(c.code)}">Cancel</button>` : ""}</td></tr>`).join("")}</tbody></table></div>` : '<span class="fine">No codes yet.</span>'}</div>`
    : (feed.map(f => `<div class="card rq"><div class="row" style="justify-content:space-between"><span class="shift">${esc(f.type)}</span><span class="fine">${ago(f.created_at)} ago · from ${esc(P(f.user_id).username)}</span></div><div style="font-size:14px">${esc(f.body)}</div></div>`).join("") || '<div class="card" style="padding:16px"><span class="muted">No feedback yet.</span></div>')}
  </div>`;
  document.querySelectorAll("[data-otab]").forEach(b => b.onclick = () => { S.otab = b.dataset.otab; renderOwner(); });
  const act = async (fn, args, msg, id, status) => { const { error } = await sb.rpc(fn, args); if (error) { toast(errMsg(error)); return; } if (id) await sb.rpc("resolve_report", { p_id: +id, p_status: status }); if (msg) toast(msg); await loadProfiles(); S.feedLoaded = false; renderOwner(); };
  document.querySelectorAll("[data-odis]").forEach(b => b.onclick = () => act("resolve_report", { p_id: +b.dataset.odis, p_status: "dismissed" }));
  document.querySelectorAll("[data-orem]").forEach(b => b.onclick = () => act("remove_user_posts", { uname: b.dataset.name }, "Removed posts by " + b.dataset.name, b.dataset.orem, "posts removed"));
  document.querySelectorAll("[data-oban]").forEach(b => b.onclick = () => act("ban_user", { uname: b.dataset.name, do_ban: true }, b.dataset.name + " is banned", b.dataset.oban, "account banned"));
  document.querySelectorAll("[data-olockr]").forEach(b => b.onclick = () => act("lock_board", { b: b.dataset.name, do_lock: true }, b.dataset.name + " is locked", b.dataset.olockr, "board locked"));
  if ($("#ocGo")) $("#ocGo").onclick = async () => { const note = $("#ocNote").value.trim(), m = check(note); if (m) { toast(m); return; } const { error } = await sb.rpc("create_invites", { n: +$("#ocN").value, p_note: note }); if (error) { toast(errMsg(error)); return; } renderOwner(); toast("Invite codes created"); };
  document.querySelectorAll("[data-cpy]").forEach(b => b.onclick = () => { const c = b.dataset.cpy; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(() => toast("Copied " + c), () => toast("Select the code and copy it by hand.")); else toast("Select the code and copy it by hand."); });
  document.querySelectorAll("[data-ccl]").forEach(b => b.onclick = async () => { await sb.rpc("cancel_invite", { p_code: b.dataset.ccl }); renderOwner(); toast("Invite cancelled"); });
}

/* ---------- right rail ---------- */
function breakHTML() {
  return `<div class="card brk"><span class="eyebrow">On break?</span><div class="clock mono" id="clk">${S.brkEnd ? "" : "15:00"}</div>
   <div class="row">${S.brkEnd ? `<button class="btn small" data-brk="0">End break</button>` : `<button class="btn small primary" data-brk="15">15 min</button><button class="btn small primary" data-brk="30">30 min</button>`}</div>
   <span class="fine"><button class="act" data-view="chats">Join a chat room</button></span></div>`;
}
function tick() { const c = $("#clk"); if (!S.brkEnd || !c) return; const s = Math.max(0, Math.round((S.brkEnd - Date.now()) / 1000)); c.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; if (s === 0) { S.brkEnd = null; drawRail(); toast("Break's over. Clock back in."); } }
setInterval(tick, 1000);
function drawRail() {
  $("#rail").innerHTML = breakHTML() + `<div class="card soon"><span class="eyebrow">Coming after beta</span>
   <ul class="soonlist"><li><b>Photo feed</b><span>swipe through everyone's photos</span></li><li><b>Stocks</b><span>watch the companies you work for</span></li><li><b>Jobs</b><span>real pay on every listing</span></li><li><b>Headlines</b><span>news about your company</span></li></ul>
   <button class="btn small" id="soonFb">Tell us what you want first</button></div>`;
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
      const m = payload.new; if (!S.msgs.has(m.room_id)) return;
      const list = S.msgs.get(m.room_id); if (list.some(x => x.id === m.id)) return;
      if (m.user_id && !S.profiles.has(m.user_id)) await loadProfiles();
      await signUrls([m.img_path]); list.push(m);
      if ((S.view === "chats" && S.room === m.room_id && !S.roomSettings) || S.view === "dms") { const box = document.querySelector(".msgs"); if (box) { box.insertAdjacentHTML("beforeend", msgHTML(m)); box.scrollTop = box.scrollHeight; } }
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
  const views = { home: renderHome, pay: renderPay, boards: renderBoards, chats: renderChats, dms: renderDMs, settings: renderSettings, owner: renderOwner, terms: renderTerms };
  try { await (views[S.view] || renderHome)(); } catch (e) { console.error(e); toast("Couldn't load that. Check your connection and try again."); }
  drawRail();
}
async function boot() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const m = location.hash.match(/link=([A-Z0-9]{8})/i);
    if (m) { S.pendingLink = m[1].toUpperCase().slice(0, 4) + "-" + m[1].toUpperCase().slice(4); renderLogin("code"); }
    else { step = 1; renderOnb(); }
    return;
  }
  S.uid = session.user.id;
  await loadProfiles();
  if (!S.profiles.has(S.uid)) { await sb.auth.signOut(); step = 1; renderOnb(); return; }
  const me = P(S.uid); if (me.accent && store.get("accent", null) === null) setAccent(me.accent);
  if (me.banned) { $("#main").innerHTML = `<div class="col"><div class="card" style="padding:20px"><b>This account has been banned</b><p class="muted">It broke the house rules. If you think this is a mistake, contact the email in the Closed Beta Terms.</p></div></div>`; renderNav(); return; }
  await Promise.all([loadSocial(), loadBoards()]);
  $("#onb").hidden = true;
  S.feedLoaded = false; await render(); startLive();
}
boot();
