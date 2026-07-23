# Machinaut Studios LLC — website

The official landing page for **Machinaut Studios LLC** — an AI-driven game studio
building AI slop bigger, better, faster, and sloppier than ever. The machines make it.
We just push deploy.

Live site: <https://machinautstudios.github.io>

## What's in here

A static, dependency-free site for GitHub Pages.

| File          | Purpose                                                              |
| ------------- | ------------------------------------------------------------------- |
| `index.html`  | Page structure, copy, and the animated "Slop Factory" conveyor       |
| `styles.css`  | "Slop Foundry" neon-arcade theme — synthwave grid, chrome type, fully responsive |
| `script.js`   | Mobile nav + the slop-deployed counter + the Complaint Shredder      |
| `favicon.svg` | Neon arcade mark with a blinking deploy pixel                        |
| `.nojekyll`   | Tells GitHub Pages to serve the files as-is (skip Jekyll)           |

No build step, no frameworks, no npm. Plain HTML/CSS/JS.

## The Complaint Shredder

The marquee feature. Type a complaint, press **DEPLOY TO THE VOID**, and watch it
become confetti:

1. The typed text is rasterized to an offscreen `<canvas>` (matching the textarea's
   font, color, padding, and word-wrapping).
2. The real `<textarea>` value is set to `""` **the instant the snapshot is taken** —
   so the text is genuinely destroyed, not merely hidden.
3. The snapshot is sliced into vertical paper strips that feed through a shredder
   "mouth" and fall away with gravity, drift, spin, and fade — a vanilla
   `requestAnimationFrame` physics loop.
4. A deadpan status line confirms the destruction.

Nothing is ever sent anywhere. There is no backend. The complaint box is a paper
shredder cosplaying as a contact form.

### Accessibility

- Respects `prefers-reduced-motion` (swaps the particle physics for a quick fade).
- The Submit control is a real `<button>`; the form works with the keyboard / Enter.
- Destruction is announced via an `aria-live` status region for screen readers.
- Visible focus rings throughout; color pairings target WCAG AA.

## Local preview

It's static, so just open `index.html` — or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Hosted with **GitHub Pages** from this repo (`machinautstudios.github.io`). Pushing to
the default branch publishes the site. The machine stays warm.

## License

Copyright © 2026 Machinaut Studios LLC. All rights reserved. This is proprietary
software/content, not open source — see [`LICENSE`](LICENSE) for terms.
