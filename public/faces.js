/* Unbadged face finding. Runs on the device before a photo is uploaded; the photo never leaves the phone unblurred.

   Three detectors vote on every face:
   1. SSD MobileNet (trained on WIDER FACE, which is full of masks, hats, glasses, beards, side views and crowds).
      Hosted on our own site, so ad blockers and outside servers can't stop it.
   2. Tiny Face Detector: a different, lighter model. When it agrees with SSD, that's strong evidence.
   3. MediaPipe BlazeFace: gives eye, nose and mouth points, used to check the shape really is a face.
      Downloaded from a CDN; if that's blocked, the others still work.
   Then a body-pose model (MoveNet) finds the people in the photo and where their nose, eyes and ears are.
   A face on a real person's head needs little evidence (so masks, hoods and tiny faces still get caught).
   A "face" with no person under it (a headlight, a grille, a cat, a pattern) needs two detectors to be very sure.
   Each runs on the whole photo and on zoomed-in tiles so small and far-away faces still get found.
   A spot is only blurred when one detector is very sure, or two agree. */
const FACE_BASE = ((document.currentScript && document.currentScript.src) || location.href).split(/[?#]/)[0].replace(/[^/]*$/, "") + "vendor/face-api/";
const FACE_LOG = [];
let mpDet = null, faDet = null;
const withTimeout = (p, ms, what) => { let done = false; p.then(() => { done = true; }, () => { done = true; }); return Promise.race([p, new Promise(r => setTimeout(() => { if (!done) FACE_LOG.push(what + " timed out"); r(false); }, ms))]); };
const once = f => { let p = null; return (...a) => p || (p = f(...a)); }; // download each model only once, even if asked twice

const getMP = once(async function () {
  for (const host of ["https://cdn.jsdelivr.net/npm", "https://unpkg.com"]) {
    try {
      const V = host + "/@mediapipe/tasks-vision@0.10.14";
      const vision = await import(V + "/vision_bundle.mjs");
      const files = await vision.FilesetResolver.forVisionTasks(V + "/wasm");
      mpDet = await vision.FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite" },
        runningMode: "IMAGE", minDetectionConfidence: 0.3, minSuppressionThreshold: 0.3,
      });
      return mpDet;
    } catch (e) { FACE_LOG.push("BlazeFace from " + host + ": " + (e && e.message || e)); }
  }
  return (mpDet = false);
});
const getFA = once(async function () {
  for (const base of [FACE_BASE, "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/"]) {
    try {
      const fa = await import(base.replace(/\/$/, "") + (base === FACE_BASE ? "/face-api.esm.js" : "/dist/face-api.esm.js"));
      try { await fa.tf.setBackend("webgl"); } catch (e) {}
      await fa.tf.ready();
      const m = base === FACE_BASE ? base + "model" : base + "model";
      await Promise.all([fa.nets.ssdMobilenetv1.loadFromUri(m), fa.nets.tinyFaceDetector.loadFromUri(m), fa.nets.faceLandmark68Net.loadFromUri(m)]);
      return (faDet = fa);
    } catch (e) { FACE_LOG.push("face-api from " + base + ": " + (e && e.message || e)); }
  }
  return (faDet = false);
});
let poseNet = null;
const getPose = once(async function (fa) {
  try { poseNet = await fa.tf.loadGraphModel(FACE_BASE + "model/movenet-multipose.json"); } catch (e) { FACE_LOG.push("MoveNet: " + (e && e.message || e)); poseNet = false; }
  return poseNet;
});
// people in one region of the photo: head points (nose, eyes, ears) in full-photo pixels
async function findPeople(fa, net, src, ox, oy, tw, th) {
  const S = Math.max(tw, th), c = document.createElement("canvas"); c.width = c.height = 256;
  c.getContext("2d").drawImage(src, ox, oy, tw, th, 0, 0, tw * 256 / S, th * 256 / S);
  const t = fa.tf.tidy(() => fa.tf.browser.fromPixels(c).toInt().expandDims(0));
  let out; try { out = net.execute(t); } catch (e) { out = await net.executeAsync(t); }
  const rows = (await out.array())[0]; fa.tf.dispose([t, out]);
  return rows.filter(r => r[55] >= 0.2).map(r => ({ score: r[55], kp: Array.from({ length: 17 }, (_, k) => ({ y: oy + r[3 * k] * S, x: ox + r[3 * k + 1] * S, s: r[3 * k + 2] })) }));
}
function warmFaces() { getFA().then(fa => fa && getPose(fa)); getMP(); } // start downloading as soon as someone picks a photo

// is this BlazeFace detection shaped like a real face? (eyes level-ish, mouth a sensible distance below them, nose in between)
function mpGeometryOK(d, iw, ih) {
  const k = d.keypoints, b = d.boundingBox; if (!k || k.length < 4) return true;
  const px = i => ({ x: k[i].x * iw, y: k[i].y * ih });
  const re = px(0), le = px(1), nose = px(2), mouth = px(3), eyeY = (re.y + le.y) / 2, eyeD = Math.hypot(re.x - le.x, re.y - le.y);
  if (eyeD < b.width * 0.18 || eyeD > b.width * 0.85) return false;
  const mx = (re.x + le.x) / 2, down = Math.hypot(mouth.x - mx, mouth.y - eyeY);
  if (down < eyeD * 0.35 || down > eyeD * 2.2) return false;
  if (Math.hypot(nose.x - mx, nose.y - eyeY) > down * 1.15) return false;
  return true;
}
const iou = (a, b) => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)), i = ix * iy; return i / (a.w * a.h + b.w * b.h - i || 1); };
const contains = (a, b) => { const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return ix * iy / Math.min(a.w * a.h, b.w * b.h); };

// turn every raw detection into the final list of faces. Pure, so it can be tested on its own.
// people: list of { score, kp[17] } from MoveNet, or null if the pose model isn't available.
function fuseFaces(cands, W, H, people) {
  const ok = cands.filter(c => { const ar = c.w / c.h; return c.w >= 10 && c.h >= 10 && ar > 0.45 && ar < 2 && c.w * c.h < W * H * 0.95; });
  ok.sort((a, b) => b.s - a.s);
  const groups = [];
  ok.forEach(c => { const g = groups.find(g => iou(g.lead, c) > 0.3 || contains(g.lead, c) > 0.7); if (g) g.items.push(c); else groups.push({ lead: c, items: [c] }); });
  // head points we trust: nose, eyes and ears of anyone MoveNet is fairly sure is a person
  const heads = (people || []).filter(p => p.score >= 0.2).map(p => p.kp.slice(0, 5).filter(k => k.s >= 0.25));
  const onAPerson = b => { const m = Math.max(b.w, b.h) * 0.25, x0 = b.x - m, y0 = b.y - m, x1 = b.x + b.w + m, y1 = b.y + b.h + m; return heads.some(h => h.filter(k => k.x >= x0 && k.x <= x1 && k.y >= y0 && k.y <= y1).length >= 2); };
  const faces = [];
  groups.forEach(g => {
    const best = (src, f = () => true) => Math.max(0, ...g.items.filter(c => c.src === src && f(c)).map(c => c.s));
    const ssd = best("ssd"), tiny = best("tiny"), mpGeo = best("mp", c => c.geo), mpAny = best("mp");
    const views = src => new Set(g.items.filter(c => c.src === src).map(c => c.view)).size;
    let isFace;
    if (people && onAPerson(g.lead))      // it's on someone's head: any detector seeing a face is enough (masks, hoods, small faces)
      isFace = ssd >= 0.3 || tiny >= 0.35 || mpGeo >= 0.4 || mpAny >= 0.5;
    else if (people)                       // no person found here: only blur when two different detectors agree it's a face
      isFace = (ssd >= 0.9 && (tiny >= 0.6 || mpGeo >= 0.6)) || (ssd >= 0.55 && tiny >= 0.55) || (tiny >= 0.9 && mpGeo >= 0.6);
    else                                   // pose model unavailable: voting rules
      isFace = ssd >= 0.5 || mpGeo >= 0.62 || (tiny >= 0.75 && (ssd >= 0.3 || mpAny >= 0.3)) || (ssd >= 0.3 && (tiny >= 0.3 || mpGeo >= 0.3)) ||
        (ssd >= 0.4 && mpAny >= 0.3) || (ssd >= 0.42 && views("ssd") >= 2) || (mpGeo >= 0.45 && views("mp") >= 2);
    if (!isFace) return;
    // average the strongest boxes (weighted by confidence). SSD boxes first: they include the forehead.
    const pool = g.items.filter(c => c.src === "ssd").length ? g.items.filter(c => c.src === "ssd") : g.items;
    const top = pool.slice(0, 4), sw = top.reduce((a, c) => a + c.s, 0) || 1, avg = k => top.reduce((a, c) => a + c[k] * c.s, 0) / sw;
    faces.push({ x: avg("x"), y: avg("y"), w: avg("w"), h: avg("h"), s: Math.max(ssd, tiny, mpAny) });
  });
  // faces the detectors missed but the pose model sees clearly: nose and both eyes visible, facing the camera
  (people || []).forEach(p => {
    if (p.score < 0.3) return;
    const [n, le, re, lr, rr] = p.kp; if (n.s < 0.4 || le.s < 0.35 || re.s < 0.35) return;
    const eyeD = Math.hypot(le.x - re.x, le.y - re.y), earD = lr.s >= 0.3 && rr.s >= 0.3 ? Math.hypot(lr.x - rr.x, lr.y - rr.y) : 0;
    const size = Math.max(eyeD * 3.2, earD * 1.5, Math.hypot(n.x - (le.x + re.x) / 2, n.y - (le.y + re.y) / 2) * 6, 14);
    const cx = (n.x + le.x + re.x) / 3, cy = (n.y * 2 + le.y + re.y) / 4;
    const b = { x: cx - size / 2, y: cy - size * 0.45, w: size, h: size, s: (n.s + le.s + re.s) / 3, pose: true };
    if (!faces.some(f => contains(f, b) > 0.3 || iou(f, b) > 0.2)) faces.push(b);
  });
  // one box per face: drop a weaker box that overlaps a stronger one or whose center sits inside it
  const centerIn = (f, o) => { const cx = f.x + f.w / 2, cy = f.y + f.h / 2; return cx > o.x && cx < o.x + o.w && cy > o.y && cy < o.y + o.h; };
  const ranked = faces.sort((a, b) => (a.pose ? 1 : 0) - (b.pose ? 1 : 0) || b.s - a.s), keep = []; // detector boxes before pose-only boxes, strongest first
  ranked.forEach(f => { if (!keep.some(o => iou(o, f) > 0.15 || centerIn(f, o) || centerIn(o, f))) keep.push(f); });
  return keep;
}

async function findFaces(src) {
  const [fa, mp] = await Promise.all([withTimeout(getFA(), 30000, "face-api"), withTimeout(getMP(), 20000, "BlazeFace")]);
  if (!fa && !mp) { console.warn("Face detection unavailable:", FACE_LOG); return null; }
  const net = fa ? await withTimeout(getPose(fa), 30000, "MoveNet") : false;
  const W = src.width, H = src.height, cands = [], people = [];
  const views = [["full", 0, 0, W, H]];
  const grid = (n, f) => { const tw = Math.round(W * f), th = Math.round(H * f); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) views.push([`${n}:${i}${j}`, Math.round((W - tw) * i / (n - 1)), Math.round((H - th) * j / (n - 1)), tw, th]); };
  grid(2, 0.6);
  if (Math.max(W, H) >= 900) grid(3, 0.42);
  const deadline = performance.now() + (findFaces.budget || 20000); // slow devices: always check the whole photo, then zoom in while time allows
  for (const [view, ox, oy, tw, th] of views) {
    if (view !== "full" && performance.now() > deadline) { FACE_LOG.push("stopped zooming at " + view); break; }
    const up = Math.min(2, Math.max(1, 640 / Math.max(tw, th)));
    const t = document.createElement("canvas"); t.width = Math.round(tw * up); t.height = Math.round(th * up);
    t.getContext("2d").drawImage(src, ox, oy, tw, th, 0, 0, t.width, t.height);
    const back = (x, y, w, h) => ({ x: ox + x / up, y: oy + y / up, w: w / up, h: h / up });
    if (mp) try { mp.detect(t).detections.forEach(d => { const b = d.boundingBox, s = d.categories && d.categories[0] ? d.categories[0].score : 0; cands.push({ ...back(b.originX, b.originY, b.width, b.height), s, src: "mp", view, geo: mpGeometryOK(d, t.width, t.height) }); }); } catch (e) {}
    if (fa && !view.startsWith("3:")) { // the heavier models skip the finest tiles to stay quick on phones
      try { (await fa.detectAllFaces(t, new fa.SsdMobilenetv1Options({ minConfidence: 0.3, maxResults: 100 }))).forEach(d => cands.push({ ...back(d.box.x, d.box.y, d.box.width, d.box.height), s: d.score, src: "ssd", view })); } catch (e) {}
      if (net) try { people.push(...await findPeople(fa, net, src, ox, oy, tw, th)); } catch (e) { FACE_LOG.push("MoveNet run: " + (e && e.message || e)); }
      try { (await fa.detectAllFaces(t, new fa.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.3 }))).forEach(d => cands.push({ ...back(d.box.x, d.box.y, d.box.width, d.box.height), s: d.score, src: "tiny", view })); } catch (e) {}
    }
  }
  findFaces.last = cands; findFaces.people = people;
  const faces = fuseFaces(cands, W, H, net ? people : null);
  if (fa) await fitFaces(fa, src, faces);
  return faces;
}
// Fit the blur to each face. A landmark model marks 68 points on the face (jawline, brows, eyes, nose, mouth, chin).
// The square spans exactly from ear to ear and from hairline to chin, so big faces get big squares and small faces small ones.
async function fitFaces(fa, src, faces) {
  for (const f of faces) {
    try {
      const side = Math.max(f.w, f.h) * 1.35, cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      const c = document.createElement("canvas"); c.width = c.height = 112; // the landmark model's own input size
      c.getContext("2d").drawImage(src, cx - side / 2, cy - side / 2, side, side, 0, 0, 112, 112);
      const lm = await fa.nets.faceLandmark68Net.detectLandmarks(c);
      const P = (Array.isArray(lm) ? lm[0] : lm).positions.map(p => ({ x: cx - side / 2 + p.x / 112 * side, y: cy - side / 2 + p.y / 112 * side }));
      const jaw = P.slice(0, 17), brows = P.slice(17, 27), xs = jaw.map(p => p.x), browY = Math.min(...brows.map(p => p.y)), chinY = Math.max(...P.slice(5, 12).map(p => p.y));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = browY - (chinY - browY) * 0.42, y1 = chinY + (chinY - browY) * 0.08; // hairline sits ~40% of brow-to-chin above the brows; a little room under the chin
      const w = x1 - x0, h = y1 - y0;
      // sanity check against the detector's box: a wild answer (blurry crop, odd angle) falls back to the box
      const okSize = w > f.w * 0.55 && w < f.w * 1.7 && h > f.h * 0.6 && h < f.h * 1.9, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const okPlace = Math.abs(mx - cx) < f.w * 0.35 && Math.abs(my - cy) < f.h * 0.4;
      if (okSize && okPlace) f.fit = { cx: mx, cy: my, side: Math.max(w, h) * 1.08 };
    } catch (e) {}
  }
}
// the square that gets pixelated: the fitted face when we have one, otherwise sized from the detector's box
function faceSquare(b, W, H) {
  // fallback numbers are the median fit measured on real test photos (1.3x the detector box, nudged up 3%)
  const cx = b.fit ? b.fit.cx : b.x + b.w / 2, cy = b.fit ? b.fit.cy : b.y + b.h / 2 - b.h * 0.03;
  const s = Math.min(b.fit ? b.fit.side : Math.max(b.w, b.h) * 1.3, W, H);
  const x = Math.max(0, Math.min(W - s, cx - s / 2)), y = Math.max(0, Math.min(H - s, cy - s / 2));
  return { x, y, w: s, h: s };
}
