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

Stages 0–2 of `docs/BUILD_PLAN.md` are built: a base layout, the five
placeholder route hubs (`/tools/`, `/calculators/`, `/reference/`,
`/guides/`, `/services/`), and the positioning pages (About, Privacy, Terms,
Contact). Nothing from Stage 3 onward exists yet — in particular, there is
no `<Calculator>` component, no WASM/OCCT kernel, and no content
collections. Don't assume any of that is already wired up.

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
