# Creek Mechanical

Free browser CAD tools that never upload your files.

A zero-budget, static site for browser-only mechanical-engineering and CAD
tools — calculators, reference data, and (later) a WebAssembly STEP/IGES
viewer and CAD compatibility checker. Every tool runs entirely client-side;
nothing a visitor uploads ever touches a server. See
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the full feasibility
assessment and 11-stage roadmap.

## Status

Stages 0–5 are built: positioning pages (About, Privacy, Terms, Contact),
a calculator engine with its first wave of 10 calculators, a reference
data library of 8 sortable/filterable tables, and a browser-only STEP/IGES/BREP
viewer (WASM CAD kernel + three.js) with STL/OBJ/3MF export across 5
tool pages. `/guides/` and `/services/` are still placeholders; the CAD
compatibility checker and parametric part generator have not started. See
[`CLAUDE.md`](CLAUDE.md) for the durable constraints and conventions this
project follows going forward.

## Stack

Astro (static output, no server adapter) → deployed as static assets to
Cloudflare Pages. No paid services anywhere in the stack.

## Commands

| Command | Action |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server at `localhost:4321` |
| `npm run build` | Build the production site to `./dist/` |
| `npm run preview` | Preview the build locally, before deploying |
