# creekmechanical.com — Feasibility Assessment & Stage-by-Stage Build Plan

Browser-based mechanical engineering & CAD tools platform · Zero-budget build

*Prepared for Ora · August 27, 2026*

## Part 1 — Feasibility Assessment

### The constraint that shapes everything

Free static hosting provides no server compute. Cloudflare Pages serves unlimited static requests at no cost, but Pages Functions are capped at 100,000 requests/day and 10 ms CPU time per request — nowhere near enough to parse or process a CAD file server-side.

Therefore every tool must run client-side in the browser, using WebAssembly for the heavy geometry work. This is not merely a workaround: it becomes the platform's strongest marketing position. Engineers working under NDA cannot upload proprietary geometry to a third-party server, and almost every existing free converter does exactly that. "Your files never leave your computer" is a real, defensible differentiator.

### Feature scoring

Scored 1–5 on the five criteria requested: ability to build, feasibility under a zero-cost constraint, potential to attract users, uniqueness vs. existing tools, and ability to convert into freelance mechanical/CAD work.

| Feature | Build | Free | Traffic | Unique | Pipeline | Verdict |
|---|---|---|---|---|---|---|
| STEP/IGES viewer + STL converter | 4 | 5 | 5 | 2 | 3 | Build — traffic engine |
| CAD compatibility / file health checker | 3 | 5 | 3 | 5 | 5 | Build — differentiator |
| Parametric part generator | 4 | 5 | 4 | 3 | 4 | Build |
| Tolerance stack-up + GD&T calculator | 5 | 5 | 3 | 4 | 5 | Build |
| Engineering calculator suite | 5 | 5 | 5 | 1 | 2 | Build — SEO backbone |
| Reference data (charts & tables) | 5 | 5 | 5 | 1 | 1 | Build — cheap wins |
| DXF / 2D drawing viewer | 4 | 5 | 3 | 2 | 2 | Phase 2 |
| Browser FEA simulation | 1 | 2 | 3 | 5 | 4 | Defer |
| AI text-to-CAD generation | 2 | 1 | 5 | 4 | 3 | Defer |

### Reasoning on each call

**STEP/IGES viewer + converter — feasible today**

occt-import-js is OpenCascade compiled to WebAssembly via Emscripten. It reads STEP, IGES and BREP files entirely in the browser and returns mesh data as JSON, which three.js renders. Export to STL/OBJ/3MF is straightforward from there.

Honest caveat: reading STEP is easy, writing STEP is not. Full geometry-kernel export requires a much heavier OpenCascade build. Ship read-in / mesh-out first and treat STEP export as a later research item.

The space is crowded — AnyConv, Convert3D, eMachineShop and Marathon OS all offer free STEP-to-STL — but each has exploitable weaknesses: signup walls, file-size caps (Marathon OS gates free downloads at 5 MB), and server-side uploads. No upload, no cap, no signup is a genuine wedge into a very high-volume keyword.

**CAD compatibility checker — the actual moat**

This is the strongest expression of the original "solve compatibility issues between CAD software" idea. Parse an uploaded STEP file and report what will break downstream: unit mismatches, non-manifold or open shells, sliver faces and micro-gaps, assembly/product structure, entity counts, and unsupported constructs.

Almost no one offers this free on the web, and it converts directly to paid work — the tool tells a user their file is broken, and the fix is exactly the service being sold. It carries the highest uniqueness and highest freelance-pipeline score of anything on the list.

**FEA — defer, and substitute**

CalculiX is excellent and free (stable release 2.23, October 2025), but there is no maintained production WebAssembly build, meshing plus solving is heavy compute, and the user-support burden would be severe. Instead, capture roughly 80% of the search traffic for a fraction of the effort with closed-form analytical calculators: beam deflection, shaft stress, column buckling, bolted-joint loading, thermal expansion. Pure JavaScript, instant results, no solver. Revisit true FEA only after the site has traffic and revenue.

**AI text-to-CAD — fails the free constraint**

Requires a paid LLM API and a server to call it from. A cheaper future variant: map natural-language input onto pre-built JSCAD parameter presets, which needs no model at all.

### Technical gotcha to design around now

Cloudflare Pages caps individual files at 25 MiB, with a limit of 20,000 static files per site. A full OpenCascade.js WebAssembly build exceeds that per-file cap. Two workarounds, both free: use a slim build (occt-wasm ships around 4 MB brotli-compressed with a clean TypeScript API), or serve the large .wasm binary from jsDelivr's free npm CDN rather than from Pages itself.

## Part 2 — Positioning

Position the site as a tool platform, not a services brochure: "Free browser CAD tools that never upload your files."

- Calculators and reference charts are the SEO foundation — high-volume, low-uniqueness content that makes the site findable at all.
- The viewer/converter is the traffic engine — it captures the largest commercial-adjacent search volume in the niche.
- The compatibility checker is the conversion machine — lower volume, but it surfaces a concrete problem the visitor now knows they have.
- Every tool page carries a soft "need this done properly? hire us" CTA, converting the fraction of visitors with real budget into freelance mechanical/CAD gigs.

## Part 3 — Stage-by-Stage Build Plan

| Stage | Focus |
|---|---|
| 0 | Domain, DNS, brand, and positioning pages |
| 1 | Tech scaffold: Astro + GitHub + Cloudflare Pages |
| 2 | Site architecture & URL structure |
| 3 | Calculator engine + first calculator wave |
| 4 | Reference data library |
| 5 | STEP/IGES viewer + converter (WASM core) |
| 6 | CAD compatibility checker |
| 7 | Parametric part generator |
| 8 | Tolerance stack-up & GD&T tools |
| 9 | SEO, schema, indexing & analytics |
| 10 | Freelance conversion funnel |
| 11 | Authority building & ongoing cadence |

> **Status: Stages 0–5 are built.** Stage 6 onward has not started. See `CLAUDE.md` for current architecture and hard constraints.

### Stage 0 — Foundations

- Point creekmechanical.com nameservers at Cloudflare (free plan) for DNS, SSL and CDN.
- Build the brand kit in Canva's free tier — wordmark, favicon, a restrained engineering-blue palette.
- Write the positioning pages up front: About (your actual engineering credentials — these carry real E-E-A-T weight in a technical niche), a Privacy page stating explicitly that files are processed in-browser and never uploaded, plus Terms and a Contact page.

> The privacy claim is a core product promise, not boilerplate. State it plainly and make sure the architecture never violates it.

### Stage 1 — Tech Scaffold

- Create a GitHub repository and scaffold an Astro project in static-output mode — no server adapter, so nothing depends on paid compute.
- Cloudflare dashboard: Workers & Pages → Create → import the repo. Build command `npm run build`, output directory `dist`.
- Attach the custom domain under Custom Domains; SSL provisions automatically because DNS already sits on Cloudflare.
- Add Astro islands (or plain vanilla JS modules) for interactivity so tool pages stay static HTML with a small hydrated widget — fast to load and easy for search engines to crawl.

### Stage 2 — Site Architecture

- `/tools/` — hub for interactive tools, one page per tool, one primary keyword each.
- `/calculators/[slug]/` — individual calculators.
- `/reference/[slug]/` — charts and lookup tables.
- `/guides/[slug]/` — long-form explanatory content, each cross-linked to the relevant tool.
- `/services/` — freelance offering, priced and scoped.

> Rule to enforce from day one: every tool page links to at least one guide, and every guide links back to at least one tool. This internal-linking loop is what turns isolated pages into a ranking site.

### Stage 3 — Calculator Engine & First Wave

Build one reusable calculator component rather than twenty bespoke pages. It should handle unit switching (metric/imperial), input validation, a shareable permalink that encodes inputs as URL parameters, a visible worked formula so users can verify the math, and a print/PDF-friendly result block.

First wave (highest search volume, all closed-form):

- Gear ratio and gear torque
- Shaft torque, power and RPM
- Beam deflection and bending stress
- Bolt torque and preload
- Bearing life (L10)
- Pipe flow and pressure drop
- Column buckling (Euler)
- Thermal expansion
- Factor of safety
- Spring rate

> Differentiate against the incumbents (Calculator Academy, EngineerCalc) on execution, not novelty: better mobile UX, unit flexibility, shareable links, shown derivations, and no ad clutter above the tool.

### Stage 4 — Reference Data Library

Pure static data, trivial to build, and among the most durable recurring traffic in the entire niche.

- Tap drill and clearance hole charts
- Bolt torque specification tables by grade
- Thread specifications (metric and imperial)
- Material property tables — steel, aluminium and plastic grades
- Hardness conversion tables
- Surface finish and Ra comparison charts
- Standard drill and sheet-metal gauge sizes

> Make every table sortable, filterable and copy-pasteable, and offer a free PDF download of each. These pages attract natural backlinks from forums and student resources at essentially zero effort.

### Stage 5 — STEP/IGES Viewer & Converter

1. Load occt-import-js (or the slimmer occt-wasm build) and confirm the .wasm loads within the Cloudflare Pages 25 MiB per-file cap — otherwise serve it from jsDelivr's free npm CDN.
2. Run the WASM parse inside a Web Worker so large files never freeze the browser tab.
3. Render the returned mesh with three.js: orbit controls, wireframe toggle, section view, measurement readout, and a bounding-box dimension display.
4. Add export to STL (binary and ASCII), OBJ and 3MF.
5. Display a persistent, prominent "processed entirely in your browser — nothing is uploaded" badge on the tool.
6. Ship dedicated landing pages per conversion pair (STEP to STL, IGES to STL, STEP to OBJ, BREP to STL) so each targets its own keyword rather than competing with itself on one page.

> Scope guard: read and mesh only in v1. Writing STEP back out is a separate, much larger problem — do not let it block launch.

### Stage 6 — CAD Compatibility Checker

Built on the same WASM kernel already loaded in Stage 5, so the marginal engineering cost is low while the strategic value is the highest on the site.

Report, per uploaded file:

- Declared units and any internal unit inconsistency
- Open shells, non-manifold edges and inverted normals
- Sliver faces, micro-gaps and degenerate geometry below tolerance
- Assembly/product structure, part count and nesting depth
- Entity type counts and any constructs known to translate poorly
- A plain-language verdict: what will likely break when this file is opened in SolidWorks, Fusion, Onshape or a CAM package

Output a shareable, downloadable health report. Every reported problem sits next to a contextual "we can fix this for you" CTA — this is the single highest-converting surface on the platform.

### Stage 7 — Parametric Part Generator

JSCAD is an open-source JavaScript library for parametric 2D and 3D design that runs directly in the browser and exports STL, OBJ and 3MF. Wrap it in simple parameter forms rather than exposing code.

- Spur and helical gear generator (involute profile) — strong existing search demand, and it pulls in the 3D-printing audience alongside engineers
- Pulley and sprocket generator
- Flange generator to standard bolt patterns
- L-bracket and mounting-plate generator
- Enclosure and project-box generator
- Standard fastener models

> Each generator gets a live 3D preview, a downloadable STL, and a permalink encoding the parameters — permalinks get shared in forums, which is free link acquisition.

### Stage 8 — Tolerance Stack-Up & GD&T

Pure JavaScript maths, no WASM required, and directly adjacent to well-paid consulting work.

- Linear stack-up: worst-case and RSS methods
- Monte Carlo simulation with a distribution histogram
- True position and bonus tolerance under MMC/LMC
- Process capability (Cp/Cpk) estimation from the stack
- Exportable analysis report

> Existing free tools here (Sigma Exacta, Firgelli) are mostly linear-only and visually thin. Handling geometric chains, MMC/LMC bonus tolerance and a proper exportable report is a realistic way to become the best free option in this specific corner.

### Stage 9 — SEO, Schema, Indexing & Analytics

- Add the free @astrojs/sitemap integration plus a robots.txt referencing the sitemap.
- Structured data: SoftwareApplication schema on tool pages, HowTo on guides, FAQPage where relevant, BreadcrumbList sitewide, and Organization with your engineering credentials.
- Ensure every tool page has substantial static text content above and below the widget — a bare interactive tool with no prose rarely ranks.
- Verify in Google Search Console (free DNS TXT record) and Bing Webmaster Tools; submit the sitemap to both.
- Install Google Analytics 4 and Cloudflare Web Analytics.
- Watch Core Web Vitals carefully — WASM payloads can wreck load metrics. Lazy-load the kernel only when a user actually selects a file.

### Stage 10 — Freelance Conversion Funnel

- Build a /services/ page with clearly scoped offerings: CAD file repair and translation, parametric modelling, design for manufacture review, tolerance analysis, and drawing/GD&T packages.
- Place contextual CTAs inside tool results, not just in the navigation — the compatibility checker's failure states are the highest-intent moment on the entire site.
- Use a free form backend (Cloudflare Pages Forms or a free-tier form service) with no monthly cost at low volume.
- Publish anonymised case studies as guide content — they rank and they qualify leads simultaneously.
- Offer a free "send us your problem file and we'll tell you what's wrong" review as the top-of-funnel lead magnet.

### Stage 11 — Authority Building & Cadence

- Submit the tools to free directories: AlternativeTo, Product Hunt, relevant awesome-lists on GitHub, and engineering tool roundups.
- Participate genuinely in r/MechanicalEngineering, r/cad, r/3Dprinting, Eng-Tips and the CalculiX and FreeCAD forums — answer questions properly and link a tool only where it actually resolves the question.
- Open-source a small utility from the build on GitHub; repository backlinks and developer traffic both compound.
- Publish 2–3 guides per week, each anchored to an existing tool page.
- Review Search Console weekly for queries earning impressions but poor positions, and build or expand content to close those gaps.
- Apply for Google AdSense once there are roughly 30–50 indexed pages with real traffic — though note that freelance conversions will almost certainly out-earn display ads in a niche this technical.

## Sources

- occt-import-js — github.com/kovacsv/occt-import-js
- occt-wasm (slim OpenCascade WASM build) — github.com/andymai/occt-wasm
- JSCAD — github.com/jscad/OpenJSCAD.org and jscad.app
- CalculiX — dhondt.de and en.wikipedia.org/wiki/Calculix
- Cloudflare Workers & Pages platform limits — developers.cloudflare.com/workers/platform/limits
- Cloudflare increased static asset limits changelog — developers.cloudflare.com/changelog/2025-09-02-increased-static-asset-limits/
- Deploy your Astro Site to Cloudflare — docs.astro.build/en/guides/deploy/cloudflare/
- Free online CAD converter competitive landscape — convert3d.org, convert.emachineshop.com, marathonos.com/tools/3d-cad-file-converter
- Tolerance stack-up tool landscape — sigmaexacta.com/stack_up_analysis, firgelliauto.com
