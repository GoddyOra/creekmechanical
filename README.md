# Creek Mechanical

Free browser CAD tools that never upload your files.

A zero-budget, static site for browser-only mechanical-engineering and CAD
tools — calculators, reference data, a WebAssembly STEP/IGES viewer, a CAD
compatibility checker, a parametric part generator, and tolerance
stack-up/GD&T tools. Every tool runs entirely client-side; nothing a
visitor uploads ever touches a server. See
[`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the full feasibility
assessment and 11-stage roadmap.

## Status

Stages 0–8 are built — the full original product-build roadmap:
positioning pages (About, Privacy, Terms, Contact), a calculator engine
with 11 calculators, a reference data library of 8 sortable/filterable
tables, a browser-only STEP/IGES/BREP viewer (WASM CAD kernel + three.js)
with STL/OBJ/3MF export across 5 tool pages, a CAD compatibility checker
with a downloadable report, a parametric part generator (6 generators —
live 3D preview, STL export, shareable permalink), and a tolerance
stack-up calculator (worst-case/RSS, Monte Carlo simulation with a
histogram, Cp/Cpk). `/guides/` now runs on a real content collection with
10 published guides, each linked to and from the tool it's paired with;
`/services/` is still a placeholder. Stage 9 onward (SEO/schema, the
freelance funnel, authority building) is a different kind of work than
the stages so far. See [`CLAUDE.md`](CLAUDE.md) for the durable
constraints and conventions this project follows going forward.

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
