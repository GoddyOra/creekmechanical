# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

creekmechanical.com — a static Astro site. Zero-budget: no paid services,
no server compute. It will grow into a platform of browser-only mechanical
engineering / CAD tools (calculators, reference data, a WASM STEP/IGES
viewer, a CAD compatibility checker). Full rationale and the 11-stage
roadmap live in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## Commands

- `npm install` — install dependencies
- `npm run dev` — local dev server at `localhost:4321` (runs `predev` first — copies the WASM binary, see Viewer engine below)
- `npm run build` — production build to `./dist/`; run this before saying a change is done (runs `prebuild` first, same copy step)
- `npm run preview` — preview the production build locally

## Current architecture status

Stages 0–6 of `docs/BUILD_PLAN.md` are built: a base layout, the positioning
pages (About, Privacy, Terms, Contact), the calculator engine (10
calculators), the reference data library (8 tables), the STEP/IGES
viewer/converter, and the CAD compatibility checker. `/guides/` and
`/services/` are still "coming soon" placeholders. There is no parametric
part generator, tolerance stack-up tool, or content collections yet. Don't
assume any of that is already wired up.

### Calculator engine (Stage 3)

- `src/lib/calculators/units.ts` — unit "kinds" (length, force, torque,
  stress, etc.), each with metric/imperial symbols and SI conversion
  functions. `kind: 'none'` fields (counts, ratios, RPM, select options) are
  identical in both systems.
- `src/lib/calculators/formulas.ts` — one pure `compute(inputsSI) => {
  results, steps }` function per calculator, keyed by slug. Always takes and
  returns SI base units; `steps` are human-readable worked-formula strings.
- `src/lib/calculators/registry.ts` — the field/result metadata (labels,
  unit kind, defaults) for each calculator. Pure data, no functions — it's
  serialized into the page as JSON.
- `src/components/Calculator.astro` — the reusable widget every calculator
  page uses. Renders the static form/result markup server-side, embeds its
  config as JSON in `data-*` attributes on the root element, and hydrates
  with a single bundled `<script>` that reads those attributes, imports
  `formulas.ts`/`units.ts`, and wires up live recompute, the metric/imperial
  toggle, and the permalink.
- `src/pages/calculators/[slug].astro` — one dynamic route (`getStaticPaths`
  over the registry) rather than 10 bespoke page files.

**Do not use `define:vars` on the Calculator script.** It forces Astro to
inline the script and strips Vite's module bundling, which breaks the
`import` statements this component relies on (confirmed by inspecting the
build output — the imports were left unresolved inside a non-module IIFE).
Pass data from the server to the client script via `data-*` attributes and
`JSON.parse`, as this component already does.

Adding an 11th calculator: add one entry to `registry.ts` and one
`compute()` function to `formulas.ts` (add any new unit kind to `units.ts`
if needed) — no new page or component code required.

### Reference data library (Stage 4)

- `src/lib/reference/tables.ts` — one `ReferenceTableDef` per table (pure
  data: columns, rows, an `intro`, and a `sourceNote` disclaimer). All
  values are typical/representative figures compiled from common published
  engineering references, not pulled from a live current standard —
  `sourceNote` says so on every page and must stay accurate to that.
- `src/components/ReferenceTable.astro` — the reusable sortable/filterable
  table widget (click a header to sort, type to filter, copy visible rows
  as TSV, print/save as PDF via `window.print()`). No imports, so unlike
  Calculator.astro it's safe to leave Astro to inline it.
- `src/pages/reference/[slug].astro` — one dynamic route over the registry.

Adding a table: add one entry to `tables.ts` — no new page or component
code required.

### Viewer engine (Stage 5)

The first real npm dependencies in this repo: `occt-import-js` (WASM CAD
kernel — `ReadStepFile`/`ReadIgesFile`/`ReadBrepFile`, confirmed against the
actually-installed version by running real test fixtures through it
directly with Node, not just trusting its README — the README on GitHub
`main` describes a newer unpublished API surface) and `three` (rendering).

- `scripts/copy-wasm-assets.mjs` — copies `occt-import-js.wasm` (7.3 MB)
  from `node_modules` into `public/wasm/` before every dev/build (`predev`/
  `prebuild` npm lifecycle scripts). **Not committed to git** — always
  sourced fresh from whatever version is installed. If you ever see
  `public/wasm/` missing, run `npm run build` or `npm run dev` once, or
  `node scripts/copy-wasm-assets.mjs` directly.
- `src/lib/viewer/occt-types.ts`, `occt-import-js.d.ts` — hand-written types
  for occt-import-js (it ships none). Verified against the real installed
  module's runtime shape, not assumed from docs.
- `src/lib/viewer/parse-worker.ts` — a Web Worker (`new Worker(new URL(...),
  { type: 'module' })`), spawned lazily only when the user selects a file.
  Loads the OCCT WASM module once via `locateFile: () => '/wasm/occt-import-js.wasm'`
  and caches it across subsequent files in the same session.
- `src/lib/viewer/mesh-utils.ts` — builds a `THREE.Group` from occt-import-js's
  mesh JSON (mirrors the library's own official three.js example) and
  computes bounding boxes. Geometry coordinates are in **millimeters**
  (`linearUnit: 'millimeter'` is set in the worker) — don't assume meters.
- `src/lib/viewer/zip.ts` — a minimal hand-rolled ZIP writer (store method
  only, no compression) — no dependency needed since 3MF export just needs
  a valid ZIP container, not compression. Verified with real `unzip -t`.
- `src/lib/viewer/threemf.ts` — builds a 3MF package (`[Content_Types].xml`
  + `_rels/.rels` + `3D/3dmodel.model`) via `zip.ts`. three.js has no 3MF
  exporter, which is why this exists; it does have STL/OBJ exporters
  (`three/addons/exporters/{STL,OBJ}Exporter.js`), used directly.
- `src/lib/viewer/registry.ts` — 5 landing pages (one general viewer +
  4 conversion-pair pages: STEP→STL, IGES→STL, STEP→OBJ, BREP→STL) all
  rendering the same `<Viewer>` engine; format is detected from the
  selected file's own extension (`format.ts`), not restricted by which
  landing page you're on.
- `src/components/Viewer.astro` — the widget. three.js scene (camera,
  renderer, `OrbitControls`) initializes eagerly on page load (cheap, no
  WASM); the worker/WASM kernel only spins up on file selection.
- `src/pages/tools/[slug].astro` — one dynamic route over the registry.

### CAD compatibility checker (Stage 6)

Reuses `parse-worker.ts` unchanged (no new dependencies) — the worker now
also returns `root` (the assembly tree), not just `meshes`, since the Stage
5 Viewer never needed it. This is the highest-stakes tool on the site: it
tells a visitor authoritatively "your file has a problem," so a false
positive is worse than a normal bug. Every non-trivial algorithm here was
verified against real geometry (synthetic known-good/known-broken cases
plus real multi-part assemblies) before being written — see git history
for the specifics if you're touching this code.

- `src/lib/checker/mesh-analysis.ts` — manifoldness/orientation/sliver
  checks. **The critical thing to know before touching this file**:
  occt-import-js does not share vertices between adjacent faces (a 6-face
  cube comes back with 24 vertices, not 8). Edge-adjacency analysis keyed
  by raw vertex *index* will misreport every inter-face boundary as "open"
  on every valid watertight solid. `weldVertices()` (position-based, at an
  adaptive tolerance = `max(1e-6, boundingBoxDiagonal × 1e-5)`) must run
  before any edge-adjacency check. If you ever see this tool reporting open
  edges on files that are obviously fine, this is the first thing to check.
- `src/lib/checker/units-scan.ts` — reads the *declared* unit straight from
  the file's raw bytes (regex over STEP's `SI_UNIT`/`CONVERSION_BASED_UNIT`
  entities, or IGES's Hollerith-encoded Global Section) since occt-import-js
  only lets you *request* an output unit, never tells you what was declared.
  **Also non-obvious**: a `CONVERSION_BASED_UNIT` (e.g. INCH) is defined
  relative to a plain `SI_UNIT` (e.g. millimeter) that sits right next to it
  in the file as its conversion basis — that basis unit is not an
  independently-used unit, and counting it as one produces a false "mixed
  units" positive on every inch-based file. The code checks for
  `CONVERSION_BASED_UNIT` first and skips the `SI_UNIT` check in the same
  window for exactly this reason.
- `src/lib/checker/report.ts` — walks the assembly tree, runs
  `mesh-analysis.ts` over every mesh, combines with the units scan, and
  generates the plain-language findings (each flagged with `cta: true` when
  it should carry a "we can fix this for you" link to `/services/`, per the
  doc). Also formats the downloadable plain-text report.
- `src/components/Checker.astro` — deliberately has **no `three` import** —
  this page only needs the WASM kernel + analysis code, so its bundle
  (~10 KB) is a small fraction of the Viewer pages' (~550 KB, mostly
  three.js). Keep it that way; don't pull in the viewer for a "preview" —
  link to `/tools/step-iges-viewer/` instead if a 3D view is wanted.
- Known limitation, by design not by bug: a multi-file STEP assembly that
  references sibling part files by external link (rather than embedding
  everything in one file) parses to an empty tree — occt-import-js only
  ever sees the one file it's given. The report says so rather than
  claiming "0 parts" as if that were meaningful.

## Hard constraints

- All CAD processing runs client-side via WASM. Never add a server-side
  file-processing route — Cloudflare Pages Functions cap at 10ms CPU.
- Never upload user files anywhere. "Files never leave your browser" is a
  product promise, not marketing copy.
- Keep any single deployed file under 25 MiB (Cloudflare Pages limit). The
  occt-import-js WASM binary is 7.3 MB and is self-hosted from `/public` —
  comfortably under the cap, confirmed by measuring the actual file. Only
  fall back to serving a `.wasm` from jsDelivr's CDN if a future dependency
  swap ever produces one that actually exceeds 25 MiB.
- No new dependencies without asking. Check bundle impact first.

## Conventions

- Tool pages: static HTML shell + one hydrated island. Never a full-page island.
- Every calculator uses the shared `<Calculator>` component in `src/components/`.
- Lazy-load the OCCT kernel only after the user selects a file — the three.js
  scene itself can initialize eagerly (no WASM cost), only the worker/kernel
  waits for a file.
- Run `npm run build` before saying a change is done.
- Routes are folders with `index.astro` (e.g. `src/pages/about/index.astro`), not flat files.
- Every tool/calculator page should eventually link to at least one guide, and every guide back to at least one tool — this internal-linking loop is what makes the site rankable. Not enforced yet since no guide content exists.
- Every calculator's unit kind must round-trip: converting a value metric→imperial→metric must return the original number (see `convertDisplay` in `units.ts`). Verify new kinds with a quick round-trip check before shipping.
- Don't trust a dependency's README for its exact API surface — verify against the actually-installed version (e.g. by running it directly with Node) before writing code against it. occt-import-js's published README describes a newer API than what's on npm.
