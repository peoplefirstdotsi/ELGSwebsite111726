# Emmanuel Lutheran Global Seminary: home page rebuild

A scroll-driven rebuild of the www.elgs.org home page: one continuous pass
through a sanctuary in eight scenes, with the giving panel present throughout.

It is a static site. Serve the repository root with any static file server:

```bash
npx serve .
```

- `index.html`, `site.css`, `site.js`: the page.
- `scrollcraft.js`, `scrollcraft.css`: the scroll engine (MIT, from
  github.com/nateherkai/scroll-craft). Not edited for this project.
- `assets/`: scene clips, posters, fonts and the seal.
- `tools/render.py`: renders the camera moves from the source photographs.
  `tools/interact.mjs`: the interaction test.
- `docs/REPORT.md`: what was built, what was verified, the photo shot list and
  the items to settle before launch. `docs/BRIEF.md`: the brief.

Status: a draft for review. See "Open before launch" in `docs/REPORT.md`.
