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
- `npm run dev` — local dev server at `localhost:4321`
- `npm run build` — production build to `./dist/`; run this before saying a change is done
- `npm run preview` — preview the production build locally

## Current architecture status

Stages 0–4 of `docs/BUILD_PLAN.md` are built: a base layout, the positioning
pages (About, Privacy, Terms, Contact), the calculator engine (10
calculators), and the reference data library (8 tables). `/tools/`,
`/guides/`, and `/services/` are still "coming soon" placeholders. There is
no WASM/OCCT kernel and no content collections yet. Don't assume any of
that is already wired up.

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

## Hard constraints

- All CAD processing runs client-side via WASM. Never add a server-side
  file-processing route — Cloudflare Pages Functions cap at 10ms CPU.
- Never upload user files anywhere. "Files never leave your browser" is a
  product promise, not marketing copy.
- Keep any single deployed file under 25 MiB (Cloudflare Pages limit).
  Serve large .wasm from jsDelivr, not from /public.
- No new dependencies without asking. Check bundle impact first.

## Conventions

- Tool pages: static HTML shell + one hydrated island. Never a full-page island.
- Every calculator uses the shared `<Calculator>` component in `src/components/` (not built yet — see status above).
- Lazy-load the OCCT kernel only after the user selects a file.
- Run `npm run build` before saying a change is done.
- Routes are folders with `index.astro` (e.g. `src/pages/about/index.astro`), not flat files.
- Every tool/calculator page should eventually link to at least one guide, and every guide back to at least one tool — this internal-linking loop is what makes the site rankable. Not enforced yet since no guide content exists.
- Every calculator's unit kind must round-trip: converting a value metric→imperial→metric must return the original number (see `convertDisplay` in `units.ts`). Verify new kinds with a quick round-trip check before shipping.
