/* =========================================================================
   MACHINAUT STUDIOS LLC — vibe-coded, shipped at temperature 1.0
   1) Mobile nav toggle (accessible)
   2) The units-deployed counter (ticks up forever, respects reduced motion)
   3) The Motion Kit — scroll reveals, offscreen stage pausing, telemetry
   The home page carries its own inline script; this file is the shared one
   every other page loads.
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

  /* --------------------------------------------------------- SHIP COUNTER
     The factory's "units deployed" readout. Ticks up at an absurd rate so the
     mass-production gag keeps paying off. Static (no ticking) for reduced motion. */
  const shipEl = document.getElementById("shipCount");
  if (shipEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let n = parseInt(shipEl.textContent.replace(/[^0-9]/g, ""), 10) || 4208117;
    const fmt = (v) => v.toLocaleString("en-US");
    let acc = 0;
    let last = 0;
    const tickCounter = (t) => {
      if (!last) last = t;
      acc += Math.min(120, t - last); // clamp so a backgrounded tab can't leap
      last = t;
      if (acc >= 90) {
        n += 1 + Math.floor(Math.random() * 6);
        shipEl.textContent = fmt(n);
        acc = 0;
      }
      requestAnimationFrame(tickCounter);
    };
    requestAnimationFrame(tickCounter);
  }

  /* ------------------------------------------------------------ MOTION KIT
     Site-wide sugar, opt-in, and entirely absent for anyone who asked for
     less motion:
       1. Panels still below the fold rise into place as you scroll to them.
          Only offscreen elements get tagged, so nothing already on screen
          can blink out while this script boots.
       2. Animated .stage housings idle until they scroll into view, so a
          page full of contraptions only ever animates the one being looked
          at.
       3. The studio's telemetry readouts wander like a real dashboard. */
  const wantsMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (wantsMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-motion");

    const fold = window.innerHeight * 0.85;
    const pending = [];
    document
      .querySelectorAll(
        ".section__head, .section__lead, .cell, .product-banner, .stage, .stage-static," +
          " .telemetry, .factory__stage, .factory__static, .factory__readout, .complaint"
      )
      .forEach((el) => {
        if (el.getBoundingClientRect().top < fold) return; // already in view — leave it alone
        el.setAttribute("data-reveal", "");
        pending.push(el);
      });

    // Cards in a grid arrive one after another rather than all at once.
    document.querySelectorAll(".grid").forEach((grid) => {
      let i = 0;
      grid.querySelectorAll(":scope > .cell[data-reveal]").forEach((cell) => {
        cell.style.setProperty("--i", i++);
      });
    });

    let observed = false;
    const revealIO = new IntersectionObserver(
      (entries, obs) => {
        observed = true;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target); // it only needs to arrive once
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    pending.forEach((el) => revealIO.observe(el));

    /* Braces to go with the belt. A real browser reports on every observed
       target within a frame or two; anything that never reports (headless
       captures, embedded webviews, a future bug) must not be allowed to
       leave the page sitting there invisible. */
    setTimeout(() => {
      if (!observed) pending.forEach((el) => el.classList.add("is-in"));
    }, 2500);

    const stages = document.querySelectorAll(".stage");
    if (stages.length) {
      const liveIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => entry.target.classList.toggle("is-live", entry.isIntersecting));
        },
        { rootMargin: "140px 0px" }
      );
      stages.forEach((stage) => liveIO.observe(stage));
    }
  }

  /* Studio dashboard: numbers that wander enough to look load-bearing.
     Each readout declares its own range in the markup. */
  const telemetry = document.querySelectorAll("[data-tele]");
  if (telemetry.length && wantsMotion) {
    const roll = () => {
      telemetry.forEach((el) => {
        const min = parseFloat(el.dataset.min);
        const max = parseFloat(el.dataset.max);
        const dec = parseInt(el.dataset.dec || "0", 10);
        const v = min + Math.random() * (max - min);
        el.textContent = (dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US")) +
          (el.dataset.suffix || "");
      });
    };
    roll();
    setInterval(roll, 1600);
  }
})();
