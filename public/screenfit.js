/* Screen fit for phones. Same measuring approach as Firefly Dash:
   - width from the layout width, height from the visual viewport (tracks browser toolbars)
   - iPhone home-screen apps with a translucent status bar report the page short by the status bar
     (measured on an iPhone 15 Pro: innerHeight 852, visualViewport 852, clientHeight 793), so take the real height
   - safe areas (notch, home bar, rounded corners) read through a probe element
   - re-measure on every rotate, resize, toolbar change and app switch, plus a few late checks for phones that report late
   Chat-app additions:
   - the on-screen keyboard doesn't shrink the whole app (open chats still follow the keyboard via --vvh)
   - --fixgap tells fixed bars how far the true bottom of the screen sits below the browser's reported bottom
   Hidden readout: tap the Unbadged logo 5 times quickly to see the numbers. */
(function () {
  const UA = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(UA);
  const root = document.documentElement;
  const SF = window.SCREENFIT = { w: 0, h: 0, ins: { t: 0, r: 0, b: 0, l: 0 }, gap: 0, kb: false, standalone: false, landscape: false, ios, android, full: {} };

  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  (document.body || root).appendChild(probe);
  // the box fixed bars are pinned to (the browser's reported viewport); on the iPhone home-screen bug it's shorter than the screen
  const icb = document.createElement("div");
  icb.style.cssText = "position:fixed;top:0;bottom:0;left:0;width:0;visibility:hidden;pointer-events:none";
  (document.body || root).appendChild(icb);
  const readInsets = () => { const cs = getComputedStyle(probe); return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 }; };
  const isStandalone = () => navigator.standalone === true || !!(window.matchMedia && matchMedia("(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)").matches);
  const typing = () => { const a = document.activeElement; if (!a) return false; if (a.tagName === "TEXTAREA" || a.isContentEditable) return true; return a.tagName === "INPUT" && !/^(checkbox|radio|button|submit|reset|file|range|color|image)$/i.test(a.type); };

  function measure() {
    const vv = window.visualViewport;
    let w = Math.max(1, root.clientWidth || window.innerWidth);
    let h = Math.max(1, vv ? vv.height : window.innerHeight);
    if (ios && isStandalone()) h = Math.max(h, window.innerHeight || 0);
    if (vv && Math.abs(vv.width - w) > 2 && vv.scale <= 1.01) w = vv.width;
    const standalone = isStandalone(), landscape = w > h;
    if (ios && standalone) {
      const sLong = Math.max(screen.width, screen.height), sShort = Math.min(screen.width, screen.height);
      const sh = landscape ? sShort : sLong, sw = landscape ? sLong : sShort, gap = sh - h;
      if (gap > 0 && gap <= 80 && Math.abs(sw - w) < 4) h = sh;
    }
    // keyboard: while typing, a big drop in height is the keyboard, not a new screen size. Keep the full height.
    const key = Math.round(w) + (landscape ? "L" : "P"), full = SF.full[key] || 0;
    SF.kb = ios && typing() && full > 0 && h < full - 100; // iPhones pan the page for the keyboard; Android resizes it, so follow Android
    if (SF.kb) h = full; else SF.full[key] = Math.max(h, typing() ? full : 0) || h;
    SF.w = Math.round(w); SF.h = Math.round(h); SF.standalone = standalone; SF.landscape = landscape;
    SF.ins = readInsets();
    SF.gap = Math.max(0, SF.h - (icb.offsetHeight || SF.h));
    if (SF.gap > 120) SF.gap = 0; // only ever a status-bar-sized correction
  }
  function apply() {
    root.style.setProperty("--app-w", SF.w + "px");
    root.style.setProperty("--app-h", SF.h + "px");
    root.style.setProperty("--fixgap", SF.gap + "px");
    root.classList.toggle("standalone", SF.standalone);
    root.classList.toggle("kbopen", SF.kb);
    const d = document.getElementById("fitdiag"); if (d && !d.hidden) d.textContent = diagText();
  }
  let queued = false, last = "";
  function refit() {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      queued = false; measure();
      const now = [SF.w, SF.h, SF.gap, SF.kb, SF.standalone].join("|");
      if (now !== last) { last = now; apply(); if (typeof paintRadio === "function" && document.getElementById("rplayer")) { try { paintRadio(); } catch (e) {} } }
    });
  }
  window.refitScreen = refit;
  measure(); apply(); last = [SF.w, SF.h, SF.gap, SF.kb, SF.standalone].join("|");
  ["resize", "orientationchange", "pageshow", "focus"].forEach(e => window.addEventListener(e, refit));
  if (window.visualViewport) { visualViewport.addEventListener("resize", refit); visualViewport.addEventListener("scroll", refit); }
  document.addEventListener("fullscreenchange", refit);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refit(); });
  document.addEventListener("focusin", refit); document.addEventListener("focusout", () => setTimeout(refit, 60));
  try { matchMedia("(display-mode: standalone)").addEventListener("change", refit); } catch (e) {}
  try { if (window.ResizeObserver) new ResizeObserver(refit).observe(root); } catch (e) {}
  [120, 450, 1000, 2000].forEach(t => setTimeout(refit, t)); // some phones report their final size late

  // hidden readout: tap the logo 5 times within 2.5 seconds
  function diagText() {
    const vv = window.visualViewport, n = v => v === undefined || v === null ? "-" : Math.round(v * 10) / 10;
    const app = document.querySelector(".app"), tabs = document.getElementById("tabs"), r = el => el ? Math.round(el.getBoundingClientRect().bottom) : "-";
    return [
      "Unbadged screen fit",
      "standalone " + SF.standalone + "  ios " + SF.ios + "  android " + SF.android + "  keyboard " + SF.kb,
      "innerW x innerH   " + innerWidth + " x " + innerHeight,
      "clientW x clientH " + root.clientWidth + " x " + root.clientHeight + "  fixed box h " + icb.offsetHeight,
      "visualViewport    " + (vv ? n(vv.width) + " x " + n(vv.height) + " (scale " + n(vv.scale) + ")" : "none"),
      "screen            " + screen.width + " x " + screen.height + "  dpr " + (window.devicePixelRatio || 1),
      "safe insets t/r/b/l " + [SF.ins.t, SF.ins.r, SF.ins.b, SF.ins.l].map(n).join(" / "),
      "measured          " + SF.w + " x " + SF.h + "  bottom fix " + SF.gap,
      "app bottom / tabs bottom " + r(app) + " / " + r(tabs),
      "(tap the logo 5x to close)",
    ].join("\n");
  }
  let taps = [];
  document.addEventListener("click", e => {
    if (!e.target.closest(".topbar .logo")) return;
    const t = performance.now(); taps = taps.filter(x => t - x < 2500); taps.push(t);
    if (taps.length < 5) return; taps = [];
    let d = document.getElementById("fitdiag");
    if (!d) { d = document.createElement("pre"); d.id = "fitdiag"; d.hidden = true; d.addEventListener("click", () => { d.hidden = true; }); document.body.appendChild(d); }
    d.hidden = !d.hidden; if (!d.hidden) d.textContent = diagText();
  });
})();
