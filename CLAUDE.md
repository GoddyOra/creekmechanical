# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

creekmechanical.com — a static Astro site. Zero-budget: no paid services,
no server compute. It will grow into a platform of browser-only mechanical
engineering / CAD tools (calculators, reference data, a WASM STEP/IGES
viewer, a CAD compatibility checker, a parametric part generator). Full
rationale and the 11-stage roadmap live in
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

## Commands

- `npm install` — install dependencies
- `npm run dev` — local dev server at `localhost:4321` (runs `predev` first — copies the WASM binary, see Viewer engine below)
- `npm run build` — production build to `./dist/`; run this before saying a change is done (runs `prebuild` first, same copy step)
- `npm run preview` — preview the production build locally

## Current architecture status

Stages 0–8 of `docs/BUILD_PLAN.md` are built: a base layout, the positioning
pages (About, Privacy, Terms, Contact), the calculator engine (11
calculators), the reference data library (8 tables), the STEP/IGES
viewer/converter, the CAD compatibility checker, the parametric part
generator (6 generators), and the tolerance stack-up / GD&T tools. This
was the last stage the original 11-stage roadmap scoped as pure product
build-out — Stage 9 onward (SEO/schema, the freelance funnel, authority
building) is a different kind of work, and hasn't formally started, but
`/guides/` is no longer a placeholder: it now runs on a real Astro content
collection with a first batch of 10 published guides (see below).
`/services/` is still "coming soon." Don't assume anything beyond what's
listed here is already wired up.

### Guides content collection

- `src/content.config.ts` — the `guides` collection schema: `title`,
  `description`, `targetKeyword`, `author` (defaults to `'Creek Mechanical'`
  — **TODO(user): set a real byline** once you decide on one; it's used as
  portfolio evidence, so it matters here more than on the rest of the site),
  `publishDate`, optional `updatedDate`, and `funnelsTo` (an array of
  `{href, label}` tool links rendered as a "Try it yourself" callout at the
  bottom of the guide).
- `src/content/guides/*.md` — one Markdown file per guide. Body content
  starts at `##` (H2), never `#` — the page template renders the
  frontmatter `title` as the H1 separately, so a Markdown `#` would create
  a duplicate, SEO-confusing heading.
- `src/pages/guides/[slug].astro` — one dynamic route over the collection
  (`getCollection('guides')` + `render(entry)`), wrapping the rendered
  Markdown in the same `.prose` styling used by About/Privacy/Terms.
- `src/pages/guides/index.astro` — lists all guides, newest first.
- **The internal-linking loop is closed, not just documented**: every
  guide's `funnelsTo` points at a real tool/calculator/reference page, and
  every one of those pages was updated with a matching "Related guide"
  link back (`relatedGuide`/`relatedGuides` fields added to
  `CalculatorDef`, `ReferenceTableDef`, and `ViewerToolDef` for the
  registry-driven pages; the standalone generator/checker/stack-up pages
  got their footnote paragraphs edited directly). When adding a new guide,
  close the loop the same way — don't just add the outbound link and leave
  the tool page pointing nowhere back.

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

Adding another calculator: add one entry to `registry.ts` and one
`compute()` function to `formulas.ts` (add any new unit kind to `units.ts`
if needed) — no new page or component code required. Currently 11
calculators, the 11th being `true-position` (Stage 8's GD&T true position
& bonus tolerance calculator — added here rather than as its own tool page
since it's a fixed-field calculation that fits this engine exactly).

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

### Parametric part generator (Stage 7)

Second real dependency: `@jscad/modeling` (CSG/geometry construction only —
no JSCAD renderer or serializer packages; rendering reuses the existing
three.js scene, STL export reuses `STLExporter` already used by the
Viewer). Six generators: spur/helical gear, sprocket, flange,
L-bracket/mounting-plate, enclosure, standard fasteners.

**Two non-obvious `@jscad/modeling` gotchas, both confirmed empirically and
both real bugs caught during development — know these before touching any
generator code:**

1. A `geom3` shape's raw `.polygons` does **not** reflect pending
   `translate`/`rotate` transforms — they live in a separate `.transforms`
   matrix and are only applied by `geometries.geom3.toPolygons()`. Boolean
   op results (`union`/`subtract`) *do* bake the transform in, so this only
   bites on a bare transform as the last step. **Always extract final
   geometry via `toPolygons()`, never raw `.polygons`** (`jscad-utils.ts`'s
   `geom3ToThreeGeometry` already does this correctly — reuse it, don't
   re-read `.polygons` directly in new code). Boolean operations themselves
   *do* correctly resolve a pending transform on their input operands —
   verified separately — so it's safe to pass a freshly-translated shape
   straight into `union`/`subtract`.
2. `primitives.cylinder`/`cuboid`/etc. are centered at their `center`
   option (default the origin) — i.e. a cylinder of `height: h` spans
   `[-h/2, h/2]` by default. `extrudeLinear` and the custom twisted
   extrusion in `gear.ts` instead span **`[0, height]`**. Mixing the two
   without accounting for this silently misaligns bore holes and bolt
   patterns (caught exactly this way while building the gear generator's
   bore hole — see git history). Every generator that cuts a hole out of
   an extruded body passes an explicit `center: [x, y, thickness/2]` (or
   uses `boltCircleHoles`'s `centerZ` option) to compensate.

Files:
- `src/lib/generators/jscad-utils.ts` — `geom3ToThreeGeometry()` (the
  `toPolygons()`-safe conversion, fan-triangulating each polygon — valid
  since JSCAD's CSG output faces are always convex) and `boltCircleHoles()`
  (shared N-holes-on-a-circle helper used by flange/l-bracket).
- `src/lib/generators/gear.ts` — the involute tooth profile (derived from
  first principles and verified — numerically and by rendering to SVG and
  visually inspecting it, at both a normal and a low-tooth-count case —
  before being trusted). Helical twist deliberately does **not** use
  `extrudeHelical` (that sweeps a profile *around* the Z axis at an offset
  radius — built for coil/screw-thread shapes, confirmed the wrong tool by
  checking its z-range on a test case) — uses `extrudeFromSlices` with a
  manual rotate+translate slice callback instead.
- `src/lib/generators/sprocket.ts` — **a functional approximation, not an
  ANSI B29.1/ISO 606 certified profile** (says so in the registry's
  `notice` field, shown on the page). Exact pitch diameter, smooth
  radius-vs-angle profile rather than a literal seating-curve arc
  construction — an earlier hand-connected-arcs attempt produced a
  self-intersecting mess; the smooth parametrization is what actually
  shipped, and is guaranteed non-self-intersecting by construction.
- `src/lib/generators/{flange,bracket,enclosure,fastener}.ts` — more
  straightforward extrude/boolean shapes. `fastener.ts` is a **simplified,
  unthreaded** hex bolt/nut (smooth shank/bore) — says so in its `notice`.
- `src/lib/generators/registry.ts` — field metadata (same shape as
  `CalculatorField`), plus an optional `notice` shown prominently on the
  page for the sprocket/fastener scope disclaimers above.
- `src/lib/generators/generate.ts` — slug → `generate()` function lookup,
  mirroring `formulas.ts`'s pattern from the calculator engine.
- `src/lib/viewer/scene-setup.ts` — three.js camera/renderer/controls/
  lights/resize/animation-loop, extracted from `Viewer.astro` so
  `Generator.astro` doesn't duplicate it. `Viewer.astro` now imports this
  too rather than defining its own copy.
- `src/components/Generator.astro` — the shared widget: parameter form →
  `generate(params)` → `geom3ToThreeGeometry()` → live preview, "Download
  STL" (`STLExporter`, reused from Stage 5), and a permalink (same URL-params
  pattern as `Calculator.astro`).
- Six pages under `src/pages/tools/*-generator/` — each its own dedicated
  static page (not a shared dynamic route, unlike calculators/reference/
  viewer) since the six generators' parameter sets don't share a uniform
  shape the way those families did.

### Tolerance stack-up & GD&T (Stage 8)

Pure JavaScript math — no new dependencies, no WASM. Two pieces:

- `true-position` in the calculator engine (`registry.ts`/`formulas.ts`) —
  true position and MMC/LMC bonus tolerance. `featureType` (0 = internal/
  hole, 1 = external/shaft) flips which direction bonus tolerance grows,
  since MMC means the *smallest* size for a hole but the *largest* size
  for a shaft — get this backwards and bonus tolerance comes out negative
  for every real part of that type.
- `src/lib/stackup/math.ts` — `computeLinearStack` (worst-case = sum of
  |tolerance|; RSS = root-sum-square), `runMonteCarlo` (Box-Muller normal
  sampling, each contributor's sd = tolerance/3 — verified against 200k
  samples before use), `computeCapability` (Cp/Cpk). **Cross-check if you
  ever touch this file**: RSS tolerance and the Monte Carlo stddev×3
  should agree to within ~0.1% for the same contributors — they're two
  different derivations of the same quantity, and disagreement past normal
  sampling noise means something broke.
- `src/lib/stackup/report.ts` — plain-text report formatter (same
  copy/download pattern as the compatibility checker's report).
- `src/components/StackUp.astro` — dynamic add/remove contributor rows
  (not the fixed-field `Calculator.astro` pattern, since a stack has a
  variable number of contributors), a Monte Carlo histogram rendered as
  inline SVG (bars colored by in-spec/out-of-spec status using the site's
  existing `--color-primary`/`--color-accent` tokens, per the dataviz
  skill's mark specs — 2px bar gap, rounded bar tops, native `<title>`
  hover tooltips, no new charting dependency), and the same copy/download
  report pattern as `Checker.astro`. No `three`/`@jscad` import — this
  page's bundle is ~9 KB, ~60× smaller than the Generator pages', because
  a stack-up table and a histogram don't need a 3D scene.

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
