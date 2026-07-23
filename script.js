/* =========================================================================
   MACHINAUT STUDIOS LLC — Slop Foundry
   1) Mobile nav toggle (accessible)
   2) The "slop deployed" counter (ticks up forever, respects reduced motion)
   3) The Complaint Shredder — rasterize the user's text to a canvas, wipe the
      real <textarea> value the instant we snapshot it (so the text is GENUINELY
      gone, not faked), then shred the snapshot into falling paper strips.
   No libraries. No build step. Drops straight onto GitHub Pages.
   ========================================================================= */
(function () {
  "use strict";

  /* ----------------------------------------------------------------- NAV */
  const nav = document.querySelector(".nav");
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("nav-menu");

  if (nav && toggle && menu) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    // Close after picking a destination
    menu.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setOpen(false))
    );
    // Escape closes and returns focus to the toggle
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    // Click outside closes
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("is-open") && !nav.contains(e.target)) setOpen(false);
    });
  }

  /* ------------------------------------------------------------ SLOP COUNTER
     The factory's "units deployed" readout. Ticks up at an absurd rate so the
     mass-production gag keeps paying off. Static (no ticking) for reduced motion. */
  const slopEl = document.getElementById("slopCount");
  if (slopEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let n = parseInt(slopEl.textContent.replace(/[^0-9]/g, ""), 10) || 4208117;
    const fmt = (v) => v.toLocaleString("en-US");
    let acc = 0;
    let last = 0;
    const tickCounter = (t) => {
      if (!last) last = t;
      acc += Math.min(120, t - last); // clamp so a backgrounded tab can't leap
      last = t;
      if (acc >= 90) {
        n += 1 + Math.floor(Math.random() * 6);
        slopEl.textContent = fmt(n);
        acc = 0;
      }
      requestAnimationFrame(tickCounter);
    };
    requestAnimationFrame(tickCounter);
  }

  /* ------------------------------------------------------------- SHREDDER */
  const form = document.getElementById("complaintForm");
  const ta = document.getElementById("complaint-input");
  const fx = document.getElementById("shredFx");
  const mouth = document.querySelector(".shredder-mouth");
  const btn = document.getElementById("shredBtn");
  const statusEl = document.getElementById("shredStatus");

  if (!form || !ta || !fx || !btn) return;

  const ctx = fx.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const SHRED_MESSAGES = [
    "COMPLAINT DEPLOYED TO /dev/null. Zero downtime. Thank you for the paper.",
    "Your feedback has been generated into 1,400 small rectangles. Resolution: total.",
    "Shipped straight to production and immediately shredded. Our fastest pipeline yet.",
    "The model has eaten your concern and reports that it was, quote, 'delicious slop.'",
    "Ticket #00000 auto-closed. Satisfaction: assumed. Confetti: deployed.",
  ];
  const EMPTY_MESSAGES = [
    "THE SHREDDER AWAITS INPUT. It will not deploy an empty grievance. It has standards.",
    "NOTHING TO SHRED. The GPU hums, disappointed but professional.",
    "ERROR 0: grievance not found. The shredder is, frankly, bored.",
  ];

  const GRAVITY = 1500; // px / s^2
  const FEED_MS = 200; // lock-step "feed into the mouth" beat
  const FEED_DROP = 7; // px the page eases down during the feed beat

  let busy = false;
  let rafId = null;
  let pick = 0; // rotate messages so it never feels random-but-repeaty

  const announce = (text, empty) => {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle("is-empty", !!empty);
  };

  // Clear the status once the user starts a fresh grievance.
  ta.addEventListener("input", () => {
    if (statusEl && statusEl.textContent && !busy) announce("");
  });

  /* Manual word-wrap so the canvas snapshot matches the textarea's wrapping
     without fragile html2canvas/foreignObject hacks (which break on iOS). */
  function wrapText(c, text, maxW) {
    const out = [];
    text.split("\n").forEach((para) => {
      if (para === "") { out.push(""); return; }
      let line = "";
      para.split(/(\s+)/).forEach((token) => {
        if (token === "") return;
        const test = line + token;
        if (c.measureText(test).width > maxW && line.trim() !== "") {
          out.push(line.replace(/\s+$/, ""));
          // A single token wider than the line? break it by character.
          if (c.measureText(token).width > maxW) {
            let chunk = "";
            for (const ch of token) {
              if (c.measureText(chunk + ch).width > maxW && chunk) {
                out.push(chunk);
                chunk = ch;
              } else {
                chunk += ch;
              }
            }
            line = chunk;
          } else {
            line = token.replace(/^\s+/, "");
          }
        } else {
          line = test;
        }
      });
      out.push(line.replace(/\s+$/, ""));
    });
    return out;
  }

  async function shred() {
    if (busy) return;

    // Pre-check before arming the machine — never shred an empty page.
    if (!ta.value.trim()) {
      announce(EMPTY_MESSAGES[pick++ % EMPTY_MESSAGES.length], true);
      return;
    }

    busy = true;
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    announce("");

    // Make sure the brand fonts are rasterized BEFORE we snapshot/destroy, so
    // the snapshot is faithful. The await happens here, NOT between capturing
    // the text and clearing it — otherwise text typed during the await would be
    // wiped without ever being shredded.
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) { /* non-fatal */ }
    }

    // The user may have cleared the field while fonts were loading.
    if (!ta.value.trim()) {
      busy = false;
      btn.disabled = false;
      btn.removeAttribute("aria-disabled");
      announce(EMPTY_MESSAGES[pick++ % EMPTY_MESSAGES.length], true);
      return;
    }

    // Measure the textarea exactly as it sits right now (orientation-safe).
    const rect = ta.getBoundingClientRect();
    const cs = getComputedStyle(ta);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(1, Math.round(rect.width));
    const boxH = Math.max(1, Math.round(rect.height));
    // Capture the FULL content, including text scrolled out of the visible box,
    // but cap it so a pathologically long grievance can't allocate a huge canvas.
    const capH = Math.round((window.innerHeight || 800) * 2);
    const contentH = Math.min(Math.max(boxH, Math.ceil(ta.scrollHeight)), capH);
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padT = parseFloat(cs.paddingTop) || 0;
    const fontSize = parseFloat(cs.fontSize) || 16;
    let lineH = parseFloat(cs.lineHeight);
    if (!lineH || Number.isNaN(lineH)) lineH = fontSize * 1.55;

    // Snapshot and destroy SYNCHRONOUSLY — no await between these.
    const saved = ta.value;

    // Offscreen source: the faithful snapshot of the typed grievance.
    const src = document.createElement("canvas");
    src.width = cssW * dpr;
    src.height = contentH * dpr;
    const sctx = src.getContext("2d");
    sctx.scale(dpr, dpr);
    // Fill with the textarea's actual (opaque, dark) field colour so the shredded
    // strips match the terminal field they came from.
    const fieldBg = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)"
      ? cs.backgroundColor
      : "#0b0918";
    sctx.fillStyle = fieldBg;
    sctx.fillRect(0, 0, cssW, contentH);
    sctx.fillStyle = cs.color || "#1A1A14";
    sctx.textBaseline = "top";
    sctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
    wrapText(sctx, saved, cssW - padL - padR).forEach((line, i) => {
      sctx.fillText(line, padL, padT + i * lineH);
    });

    // ---- DESTROY NOW: the real value is gone before a single strip falls. ----
    ta.value = "";
    ta.style.visibility = "hidden";

    // Visible overlay canvas, sized to sit exactly over the textarea (growing
    // downward past the box for overflowed text, which simply falls further).
    fx.width = cssW * dpr;
    fx.height = contentH * dpr;
    fx.style.width = cssW + "px";
    fx.style.height = contentH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // work in CSS px
    fx.classList.add("active");
    if (mouth) mouth.classList.add("active");

    // End the effect cleanly if the layout reflows mid-shred (resize / rotate)
    // rather than leaving a stale, mis-sized overlay.
    const onReflow = () => finish();
    window.addEventListener("resize", onReflow, { once: true });
    window.addEventListener("orientationchange", onReflow, { once: true });

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("orientationchange", onReflow);
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      ctx.clearRect(0, 0, cssW, contentH);
      fx.classList.remove("active");
      fx.style.transition = "";
      fx.style.opacity = "";
      if (mouth) mouth.classList.remove("active");
      ta.style.visibility = "visible";
      btn.disabled = false;
      btn.removeAttribute("aria-disabled");
      // Disabling the button dropped focus to <body>; restore it for keyboard
      // users so Tab order doesn't reset to the top of the page.
      if (document.activeElement === document.body) {
        try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }
      }
      announce(SHRED_MESSAGES[pick++ % SHRED_MESSAGES.length]);
      busy = false;
    }

    // Reduced motion: no physics — just a quick, obvious wipe.
    if (reduce.matches) {
      ctx.clearRect(0, 0, cssW, contentH);
      ctx.drawImage(src, 0, 0, cssW, contentH);
      fx.style.transition = "opacity .28s linear";
      requestAnimationFrame(() => { fx.style.opacity = "0"; });
      window.setTimeout(finish, 320);
      return;
    }

    // Build the vertical strips.
    const N = Math.max(14, Math.min(40, Math.round(cssW / 14)));
    const stripW = cssW / N;
    const strips = [];
    for (let i = 0; i < N; i++) {
      strips.push({
        srcX: i * stripW,
        x: i * stripW,
        y: 0,
        vx: (Math.random() - 0.5) * 46, // gentle sideways drift, px/s
        vy: 0,
        rot: 0,
        vrot: (Math.random() - 0.5) * 1.8, // rad/s
        delay: i * 8 + Math.random() * 70, // ms cascade after the feed beat
      });
    }

    const drawStrip = (s, visY, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      const cx = s.x + stripW / 2;
      const cy = visY + contentH / 2;
      ctx.translate(cx, cy);
      ctx.rotate(s.rot);
      ctx.translate(-cx, -cy);
      ctx.drawImage(
        src,
        s.srcX * dpr, 0, stripW * dpr, contentH * dpr,
        s.x, visY, stripW, contentH
      );
      ctx.restore();
    };

    // Drive everything from an internal clock advanced by a CLAMPED dt, so a
    // backgrounded/throttled tab can't collapse the feed beat or the per-strip
    // cascade onto a single catch-up frame.
    let prevT = 0;
    let clock = 0;
    let started = false;
    const frame = (t) => {
      if (done) return;
      if (!started) { started = true; prevT = t; }
      const dtMs = Math.min(33, t - prevT);
      prevT = t;
      clock += dtMs;
      const dt = dtMs / 1000;

      ctx.clearRect(0, 0, cssW, contentH);

      // Phase 1 — the feed: every strip eases down a few px in lock-step.
      if (clock < FEED_MS) {
        const k = clock / FEED_MS;
        for (const s of strips) drawStrip(s, k * FEED_DROP, 1);
        rafId = requestAnimationFrame(frame);
        return;
      }

      // Phase 2 — free-fall with per-strip stagger.
      const fall = clock - FEED_MS;
      let alive = 0;
      for (const s of strips) {
        if (fall - s.delay <= 0) {
          drawStrip(s, FEED_DROP, 1); // held at the teeth, waiting its turn
          alive++;
          continue;
        }
        s.vy += GRAVITY * dt;
        s.y += s.vy * dt;
        s.x += s.vx * dt;
        s.rot += s.vrot * dt;
        const visY = FEED_DROP + s.y;
        const alpha = Math.max(0, 1 - visY / (contentH * 1.5));
        if (visY < contentH * 1.8 && alpha > 0) {
          drawStrip(s, visY, alpha);
          alive++;
        }
      }

      if (alive > 0) rafId = requestAnimationFrame(frame);
      else finish();
    };

    rafId = requestAnimationFrame(frame);
  }

  // Submit via button or Enter — always shred, never actually send anything.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    shred();
  });
})();
