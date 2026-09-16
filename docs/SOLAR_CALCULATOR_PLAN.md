# Solar Energy Calculator — Build Plan

Status: **planning — not started**. This is an additive feature plan; it doesn't
change anything in [`docs/BUILD_PLAN.md`](BUILD_PLAN.md)'s Stages 0–11, which
remain the site's core roadmap. Treat this as a sibling document, the same way
Stage 7's generators or Stage 8's stack-up tool each got their own design pass
before being folded into `CLAUDE.md`.

This plan started from an external research document that inspected this
repo's README and file tree but never read the actual source files —
several of its architecture assumptions don't match what's really here. This
version replaces those assumptions with ground truth read directly from the
repo, and keeps the parts of the original research that were genuinely
useful (the NASA POWER API details, the geocoding comparison, the corrected
sizing arithmetic).

## Corrections to the original research doc

| It assumed | Reality (verified by reading the actual files) |
|---|---|
| No Astro 7 exists; site runs Astro 5.x | **Astro 7.2.6 is installed** (`package.json`). The "correction" was itself wrong — trust `package.json`, not an AI's training cutoff, when the two disagree. |
| Deployed to **Cloudflare Pages**, backend via `functions/api/lead.ts` Pages Functions | Deployed to **Cloudflare Workers with static assets** (`wrangler.jsonc`: `assets.directory`, no `main` script yet, deployed via `npx wrangler deploy`). Pages Functions is a different product and the `functions/` convention doesn't apply here — see the Worker design below. |
| Styling system unknown, flagged "Tailwind vs vanilla CSS — VERIFY" | **Plain hand-written CSS**, one file: `src/styles/global.css`. No Tailwind, no CSS framework. |
| Island pattern: a native Web Component (`class X extends HTMLElement`, `customElements.define`) | Every existing island (`Calculator.astro`, `Viewer.astro`, `Checker.astro`, `Generator.astro`, `StackUp.astro`) uses the **same different pattern**: a static HTML shell + one `<script>` that does `document.querySelector('[data-x]')` and reads config from `data-*` attributes (JSON-encoded). No custom elements anywhere in the codebase. New tools should match this, not introduce a second pattern. |
| Route at `src/pages/tools/solar-calculator.astro` (flat file) | CLAUDE.md's own convention: **routes are folders with `index.astro`** (e.g. `src/pages/tools/tolerance-stack-up/index.astro`). Should be `src/pages/tools/solar-calculator/index.astro`. |
| Vitest for engine tests | **No test runner is installed anywhere in this project.** Every prior calculation-heavy feature (involute gear math, Monte Carlo tolerance simulation, GD&T formulas) was verified with disposable Node scripts run directly (`node --experimental-strip-types`), not a test framework — see the "Verification" pattern in `CLAUDE.md`'s Stage 7/8 sections. Adding Vitest is a real new devDependency and needs the same "ask first" treatment as any other dependency. Recommendation below. |
| "Supabase (existing account)" | **No Supabase integration exists anywhere in this repo.** This needs to be created from scratch — an external account-setup step for you, not something already wired up. |
| WhatsApp click-to-chat number implied ready to use | **No real business contact channel exists yet.** `src/pages/contact/index.astro` literally says *"This address is a placeholder — set up real inbox delivery for it before launch."* A WhatsApp Business number is a prerequisite you'll need to supply. |
| "12th calculator" | Doesn't fit the `<Calculator>` component's shape (single-step field-list → formula → result). This is a multi-step wizard with a city picker, a running appliance list, and a lead-capture step — architecturally it's a sibling to the Checker/Generator/StackUp tools (each got its own dedicated component), not calculator #12. |

None of this invalidates the PDF's actual research — the NASA POWER endpoint,
the peak-sun-hours unit conversion, the Open-Meteo geocoding comparison, and
the corrected sizing arithmetic are all still good and are carried forward
below. The parts that were guessed at repo internals are what's corrected.

## Should the architecture change for future scaling?

**No — the current architecture (static Astro + Cloudflare Workers static
assets) handles this fine, with one small, additive change: giving the
Worker a `main` script so it can handle one dynamic route.**

Why this is enough, not a stopgap:
- The read-heavy surface (every calculator, guide, reference table, and the
  solar calculator's own UI and static SEO content) stays exactly what it is
  today: pre-built HTML served from Cloudflare's edge. That already scales
  to effectively unlimited traffic with no code changes.
- The only genuinely dynamic need is the lead-capture write — a small,
  infrequent, stateless POST. That's precisely what Workers are for, and it
  scales the same way the rest of Cloudflare's platform does: automatically,
  per-request, no server to provision or outgrow.
- This keeps `CLAUDE.md`'s "static output, no server adapter" invariant
  intact — Astro's `output: 'static'` doesn't change at all. The Worker
  script is a thin layer *in front of* the static assets, not a change to
  how Astro builds the site.

What *would* justify revisiting this later (not now): if the site
accumulates several unrelated dynamic routes (a user dashboard, session
state, anything needing auth), hand-rolling fetch-handler routing in one
`worker/index.ts` gets messy, and adopting `@astrojs/cloudflare` + Astro API
routes would give a cleaner DX. That's a real future fork, but one dynamic
POST endpoint doesn't meet that bar — introducing an adapter now would be
solving a problem this project doesn't have yet.

### The Worker change, concretely

Today `wrangler.jsonc` has no `main` — it's asset-serving only. Adding a
script is additive and doesn't touch `astro.config.mjs` or Astro's output
mode:

```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "creekmechanical",
  "compatibility_date": "2026-08-27",
  "main": "worker/index.ts",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page"
  }
}
```

```ts
// worker/index.ts — lives outside src/ (Astro's root) so it's never
// mistaken for a page or swept into the Astro build.
export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/lead' && request.method === 'POST') {
      return handleLead(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
```

`wrangler deploy` transpiles this TypeScript entry itself — no separate
build step, and `npm run build` (which only runs `astro build`) is
unaffected. `SUPABASE_SERVICE_ROLE_KEY` and `TURNSTILE_SECRET_KEY` are set as
Worker secrets (`wrangler secret put ...`, or the same dashboard "Variables"
panel you already used for `NODE_VERSION` — mark them **Secret**, not
plaintext, this time).

## External accounts you'll need to set up (I can't do these for you)

Same category of action as creating the Cloudflare Workers project itself:

1. **Supabase** — new project, get the project URL + service role key (not
   the anon/public key — the Worker inserts server-side and should bypass
   RLS deliberately, with RLS still enabled and no anon `SELECT`, matching
   the schema below).
2. **Cloudflare Turnstile** — free, same dashboard you already use; create a
   site key + secret key pair for spam protection on the lead form.
3. **A real WhatsApp Business number** for Creek Mechanical, for the
   click-to-chat CTA — this is the zero-backend primary conversion path and
   should exist even before Phase 2's database write does.
4. **Real contact email delivery** — not blocking for the solar calculator
   specifically, but it's the same placeholder called out in
   `src/pages/contact/index.astro` and worth fixing alongside this.

## Architecture for the calculator (matching existing conventions)

```
src/
  pages/tools/solar-calculator/index.astro   # static shell + SEO body + island mount
  components/SolarCalculator.astro           # data-* driven island, same shape as StackUp.astro
  lib/solar/
    types.ts
    engine.ts            # pure, DOM-free, fetch-free — PROVISIONAL, see below
    catalog.ts            # appliance seed data
    irradiance.ts         # NASA POWER fetch + cache
    irradiance-offline.ts # bundled city fallback table
    geocode.ts             # Open-Meteo geocoding client
    format.ts
  content/guides/how-many-solar-panels.md    # paired guide, once the tool ships (existing convention)
worker/
  index.ts               # new: routes /api/lead, falls through to ASSETS
scripts/
  build-city-irradiance.ts  # precompute PSH for target cities at build time
```

This mirrors the shape of every prior stage exactly: a pure calculation
module with no I/O (unit-testable the same way `stackup/math.ts` is), a
registry/data module, and one dedicated widget component — not a shared
`<Calculator>` reuse, because the wizard shape (multi-step, running list,
city search, lead form) doesn't fit that component's single-shot
field-list-to-result design.

**Island pattern** — follow `StackUp.astro`'s exact shape rather than the
custom-element pattern from the original doc:

```astro
<div class="solar-calculator viewer" data-solar-calculator data-cities={JSON.stringify(OFFLINE_CITIES)}>
  <!-- step markup, all steps present in HTML, toggled via hidden -->
</div>

<script>
  import { computeSizing } from '../lib/solar/engine';
  import { resolvePeakSunHours } from '../lib/solar/irradiance';
  import { searchCity } from '../lib/solar/geocode';

  const root = document.querySelector<HTMLElement>('[data-solar-calculator]')!;
  // event delegation, step state, recompute-on-change — same shape as
  // every other widget's script block.
</script>
```

No `customElements.define`, no framework — plain TS against `data-*`
attributes, consistent with the `define:vars`-breaks-imports gotcha already
documented in `CLAUDE.md`.

## Peak sun hours & geocoding (carried forward from the original research — still good)

- **Primary: NASA POWER climatology**, `ALLSKY_SFC_SW_DWN`, no API key,
  global coverage. At `climatology`/monthly/annual resolution the value is
  already in kWh/m²/day, which is numerically identical to Peak Sun Hours
  (1 kWh/m² at 1 kW/m² irradiance = 1 hour) — use the `ANN` value directly,
  no integration needed. **Do not** use hourly resolution for this (that's
  W/m² and needs integrating).
- **Fallback: a bundled offline city table**, precomputed at build time into
  `irradiance-offline.ts` via `scripts/build-city-irradiance.ts`, so the
  tool works with zero network and never hard-fails.
- **Geocoding: Open-Meteo Geocoding API** for the city typeahead (no key,
  returns lat/lon/timezone/country in one call). Debounce 250ms, cache
  results, offer "use my location" via `navigator.geolocation` to skip
  geocoding entirely when available.
- Every endpoint URL, CORS behavior, and rate limit in the original document
  was flagged `VERIFY` because the research session's web search was down —
  that flag still stands. Confirm each against current vendor docs before
  writing the fetch calls, same as the original plan already recommended.

## Engine — full sizing chain (from course material, received 2026-09-16)

Replaces the "PROVISIONAL" engine section of the first draft. Everything
below is derived from your own course material, not from a third-party
reconstruction of it.

### Sources used

| Source | What it supplies |
|---|---|
| Whiteboard photos 1–3 | Load audit / energy audit method, resistive vs capacitive vs inductive classing, surge accounting |
| Whiteboard photos 4–6 (dated 21/03/2026) | Battery bank sizing, PV array sizing, the worked 108.618 kWh example |
| WhatsApp reference cards | Charge controller, inverter, cable, breaker and SPD sizing; Nigeria/Port Harcourt specific guidance |
| Leonics "How to Design Solar PV System" | Independent cross-check; panel generation factor method |

### Discrepancies in the source material — and how the engine resolves them

These are real conflicts between the sources (or internal arithmetic slips).
Each needed a decision; none should be silently absorbed.

1. **Panel count: three different formulas.** The whiteboard divides by
   `PR x PSH`, the WhatsApp card divides by `PSH` alone with no performance
   ratio, and Leonics divides by a "panel generation factor". These are the
   *same* formula — Leonics' PGF is just `PR x PSH` collapsed into one
   constant (3.43 = 5.0 h x 0.686). **Resolution:** one formula, three
   presets. Default to the whiteboard's `PR = 0.65`, which is the realistic
   one for Nigerian heat, dust and wiring loss; the WhatsApp card's implicit
   `PR = 1.0` is optimistic and will undersize.

2. **Battery bank: whole-day vs night-only.** Whiteboard photo 4 divides
   *total* daily energy by DoD (full off-grid autonomy). The WhatsApp card
   uses only the *nightly* fraction (60–70%) x 1.15 losses. **Resolution:**
   a single formula with `nightFraction` and `lossFactor` settings —
   `nightFraction = 1.0, lossFactor = 1.0` reproduces the whiteboard exactly,
   `0.7 / 1.15` reproduces the WhatsApp card exactly. Both worked examples
   verify against it (see Verification below).

3. **Inverter: `max()` rule vs shortcut formula contradict each other.**
   Photo card step 3 says `Inverter = max(Running x 1.25, Total Surge)`;
   the "Shortcut formula" two cards later says
   `(Running x 1.25) + Biggest Motor Surge`. **Resolution:** use `max()`.
   The shortcut is just the surge branch written out, and with any motor
   present the surge branch nearly always wins anyway — but with a purely
   resistive load (no motor) the shortcut would add zero and coincide,
   while `max()` stays correct in both cases.

4. **Charge controller quick-table contradicts its own caption.** The table
   is captioned `Watts / 48V x 1.25`, but its values are `Watts / 48V`
   rounded up to the next standard size (1200 W -> 30 A, not the 31.25 A -> 40 A
   the caption implies; 4800 W -> 100 A, not 125 A). **Resolution:** trust the
   stated formula, not the table. The engine computes `x 1.25` and rounds up,
   so it will sometimes return one size larger than that table. That is the
   safe direction.

5. **Cable sizing: voltage drop and ampacity give wildly different answers.**
   The worked example (115 A, 2 m, 48 V, 3%) yields 5.5 mm² by voltage drop,
   yet the card's own lookup table puts 100–150 A at 35 mm². Both are right
   about different failure modes — 115 A through 5.5 mm² satisfies voltage
   drop and then melts. **Resolution:** compute both and take the larger.
   This is the single most safety-relevant decision in the chain.

6. **Arithmetic slips in the whiteboard photos**, carried forward as
   corrections rather than copied: photo 1 applies a 1.25 safety factor but
   prints the unmultiplied 7,700 W as the result; photo 3's running-power sum
   (`1500+3000+7200+4500+1500+750+6300`) is 24,750, not the 61,050 printed,
   and its final line mixes Wh with W; photo 4 rounds 90.5 batteries up to 92
   rather than 91. The engine computes these from the inputs, so it simply
   won't reproduce the slips — worth knowing if you compare outputs to the
   board side by side.

7. **Load class (R / C / I) drives the arithmetic — resolved 2026-09-16.**
   The first draft guessed the tag was metadata. It is not. Confirmed rule:
   **resistive and capacitive loads contribute only their running power to
   the design total; inductive loads contribute running power multiplied by
   their surge factor.** That is why the whiteboards carry three separate
   tables and only the inductive one has a surge column.

   This reading is confirmed by the photos' own subtotals: the resistive
   table sums to exactly 7,700 W (LED 200 + iron 1,500 + heater 3,000 +
   toaster 1,500 + air fryer 1,500) and the capacitive table to exactly
   1,480 W (TV 800 + sound 300 + laptops 80 + desktop 150 + decoder 25 +
   PS5 100 + router 25). Both match to the watt.

   The 42.131 kW grand total on photo 4 could **not** be reconciled exactly,
   because the photos give conflicting wattages for several inductive
   appliances — washing machine appears as 500 W, 1,500 W and 3,000 W across
   photos 1-3, freezer as 200 W and 350 W, pump as 750 W and 1,500 W. The
   rule is confirmed by the R and C subtotals; the I subtotal can't be
   audited against a moving input.

### Stage 0 — Load audit

Per appliance line `i`:

```
P_run,i       = watts_i x qty_i                    # W, running
P_surge,i     = watts_i x surge_i x qty_i          # W, full inrush (I only)
E_i           = P_run,i x hours_i                  # Wh/day
excess_unit,i = watts_i x (surge_i - 1)            # extra draw, ONE unit
excess_all,i  = excess_unit,i x qty_i              # extra draw, whole line
```

`surge_i` is forced to 1 for resistive and capacitive lines.

Totals:

```
P_run_total  = SUM(P_run,i)
E_daily      = SUM(E_i)
P_design     = [ SUM_R(P_run) + SUM_C(P_run) + SUM_I(P_surge) ] x safetyFactor
```

`P_design` is the course's "Grand Total Power". **It always counts every
inductive unit at full surge** — whiteboard photo 3 sizes its 5-unit line as
`1500 x 5 x 3 = 22,500 W`, so this is a connected-load figure and does not
depend on `surgeConcurrency`.

#### Surge allowance — how much the inverter has to cover

This is a *different* quantity from `P_design`, and conflating the two was a
real defect in the first build (see the QA section). The allowance is the
**excess above running power**, computed across the whole load list:

```
surgeConcurrency = 'single' (default):
    allowance = MAX over all inductive lines of excess_unit,i

surgeConcurrency = 'all':
    allowance = SUM over all inductive lines of excess_all,i
```

Consequences worth being explicit about, because they are the questions
people actually ask:

- **Only the single biggest starter counts under `'single'`.** Motors are not
  added together. A 750 W pump at 6x (3,750 W excess) beats a 1,120 W AC at
  4x (3,360 W excess), and the AC contributes nothing to the allowance.
- **Two identical motors do not add under `'single'`.** Two 1,000 W units at
  4x give a 3,000 W allowance, not 6,000 W — one starts at a time. Under
  `'all'` they give 6,000 W.
- **Entry form does not change the answer.** "AC x2" typed as one row with
  `qty 2` and as two separate rows give identical results, for both the
  allowance and `P_design`. The first build got this wrong in both places.

Default surge factors (from the cards): fridge/freezer 3x, AC 3–5x (use 4),
water pump 5–7x (use 6), resistive and capacitive 1x.

### Stage 1 — Inverter

```
P_cont      = P_run_total x futureBuffer / inverterEfficiency   # 1.2, 0.9
surge_excess_i = P_surge,i - P_run,i         # the EXTRA draw at start-up
P_surge_req = P_cont + MAX(surge_excess_i)
P_inverter  = MAX(P_run_total x safetyFactor, P_surge_req[, classDesign])
            -> round up: 1, 1.5, 2, 3, 3.5, 5, 7.5, 10, 15, 20, 30, 50 kW
```

The surge branch adds the largest motor's **excess** draw, not its full surge.
The card's worked example adds the full surge on top of a continuous total
that already contains that motor's running watts, which double-counts it. The
engine uses the excess — same answer to within one standard size in practice,
and it does not overstate.

The third branch, `classDesign` (the R/C/I grand total), is included only when
`inverterBasis` is set to `class-total`. It is off by default; see design
decision 1 in the Status section for why.

System DC voltage follows from the **larger of** the inverter rating and the
array size — sizing it off the inverter alone gives an unbuildable charge
controller current when a modest peak load has high daily energy:

```
V_driver = MAX(P_inverter, P_array)
V_driver <= 1.5 kW  -> 12 V
1.5 - 3 kW          -> 24 V
> 3 kW              -> 48 V
```

If the requirement exceeds the largest listed single inverter, the engine
warns that parallel or three-phase units are needed rather than silently
returning the largest unit as though it were sufficient.

### Stage 2 — Battery bank

```
E_from_batt   = E_daily x nightFraction x daysAutonomy x lossFactor  # Wh
E_bank_nameplate = E_from_batt / DoD                                  # Wh
N_batteries   = CEIL(E_bank_nameplate / (V_batt x Ah_batt))
```

Settings: `DoD` 0.5 lead-acid / tubular, 0.8–0.9 lithium LiFePO4;
`lossFactor` 1.15 (inverter + wiring); `daysAutonomy` 0.5–1 grid-tied with
backup, 2–3 off-grid; `nightFraction` 0.6–0.7 typical, 1.0 for full-day
autonomy.

Common Nigerian battery units, for the picker: 12 V 200 Ah = 2.4 kWh,
24 V 200 Ah = 4.8 kWh, 48 V 200 Ah = 9.6 kWh (most common for solar),
48 V 100 Ah lithium = 4.8 kWh.

Surface the card's three warnings in the UI: match battery voltage to
inverter/controller; never mix old and new batteries; lead-acid needs roughly
double the units of lithium for the same usable energy.

### Stage 3 — PV array

```
N_panels = CEIL( E_daily x FoS / (PR x PSH x P_panel) )
P_array  = N_panels x P_panel
```

`PSH` comes from the NASA POWER / offline-table path already specified above.
`FoS` 1.25 default, `PR` 0.65 default (see discrepancy 1). Presets:

| Preset | FoS | PR | Matches |
|---|---|---|---|
| `whiteboard` (default) | 1.25 | 0.65 | Course photo 5 |
| `whatsapp` | 1.25 | 1.00 | WhatsApp card |
| `leonics` | 1.30 | PGF / PSH | Leonics worked example |

### Stage 4 — Charge controller

```
MPPT:  I_cc = (N_panels x P_panel / V_batt) x 1.25
PWM:   I_cc = (N_parallel_strings x Isc_panel) x 1.25
       -> round up to standard: 30, 40, 60, 80, 100, 125, 150, 200 A
```

Choose MPPT when `P_array > 1 kW` or `V_batt = 48 V` (the card's rule; it
notes 95–98% efficiency vs 70–75% for PWM). Then enforce the string voltage
ceiling, which is the rule that actually destroys hardware:

```
V_string_max = N_series x Voc_panel
REQUIRE: V_string_max <= 0.8 x V_pv_max_controller    # 20% margin
```

Also carry the card's rule that a split array (some panels east, some west)
needs one controller per orientation.

### Stages 5 & 6 — Cables and breakers (computed together)

These are one pass in the engine, not two. Sizing them separately let the two
disagree about how much current a circuit carries — the PV cable was sized
from `P / Voc` while its breaker was sized from `Isc`, and the cable came out
*below the array's own short-circuit current*. One design current per segment
now feeds both.

Design currents per segment:

```
PV array -> controller   : cable Isc_array x 1.25 ; breaker Isc_array x 1.56
Controller -> battery    : I_controller x 1.25          (per controller)
Battery -> inverter      : P_inv / (V_sys x eta) x 1.25
Inverter -> AC loads     : P_inv / V_ac x 1.25
```

PV current is set by short-circuit current, **not** by `P / V`: Voc overstates
the operating voltage and so understates the current.

Cable selection, in order:

```
A_voltdrop = (2 x L x I x rho) / (V x dropLimit)      rho = 0.0172
A_ampacity = lookup(I)
A          = roundUp(MAX(A_voltdrop, A_ampacity))
while ampacity(A) < breakerRating: A = next size up   # breaker must fit its cable
```

The cable grows to carry its breaker; the breaker is never shrunk to fit the
cable, which would leave the circuit under-protected. `dropLimit` is 3% DC and
5% AC. Both component figures are reported so the user can see which governed.

Breakers round up to standard sizes (10 … 250, 315, 400, 500, 630 A) and are
capped by nothing — if the requirement exceeds the largest standard device, or
the cable needed would exceed 240 mm², the engine warns that parallel
conductors or a higher system voltage are required. It never silently returns
an undersized part.

Carry forward from the cards: PV1-F double-insulated cable outdoors;
battery-to-inverter run under 2 m; DC red/black, AC brown/blue/green-yellow;
DC-rated breakers only on DC; disconnect PV first, then battery.

### Stage 7 — Surge protection

```
DC SPD volts = V_string_max x 1.2 -> next of 500, 600, 800, 1000, 1500 VDC
AC SPD volts = 275 V  (230 V single phase)  |  385 V (3-phase)
kA rating    = 40 kA minimum (Nigeria); 60-100 kA Type 1+2 for high-lightning
```

Port Harcourt is explicitly called out as high-lightning in the material, so
if the selected city resolves into that band the engine should default to
Type 1+2 / 60 kA and say why.

### Shape

`engine.ts` stays pure, DOM-free and fetch-free, same as `stackup/math.ts`.
One `SizingSettings` object holds every constant named above — `safetyFactor`,
`futureBuffer`, `inverterEfficiency`, `surgeConcurrency`, `nightFraction`,
`lossFactor`, `daysAutonomy`, `DoD`, `FoS`, `PR`, `dropLimit`, `arrayPreset` —
all overridable, none inlined as magic numbers. `computeSizing(loads,
settings, psh)` returns every stage's intermediate values, not just the final
bill of materials, so the UI can show the working.

### Verification

Disposable Node scripts (`node --experimental-strip-types`), matching how the
gear, Monte Carlo and GD&T maths were checked — not a test framework. Assert
against the course's own worked examples:

| Case | Source prints | Engine returns | Note |
|---|---|---|---|
| Battery bank, full-day lithium | 120 kWh | 120.687 kWh | Photo 4; board rounds down |
| Battery, lead-acid unit count | 92 | 90.515 -> **92** | Photo 4; see the whole-string note below |
| Battery, night-only | 17.9 kWh | 17.889 kWh | WhatsApp card; matches |
| Panels @ 550 W | 94.41 -> 94 | 94.946 -> **95** | See note below |
| Panels @ 650 W | 79.89 -> 80 | 80.339 -> **81** | See note below |
| Panels, Leonics cross-check | 3.76 -> 4 | 3.763 -> 4 | Matches |
| Inverter continuous | 744 W | 826.7 W | Engine divides by eta_inv = 0.9 |
| Inverter surge requirement | 3744 W | 3826.7 W | Both round up to the same 5 kW |
| MPPT controller | 72.9 -> 80 A | 72.92 -> 80 A | Matches |
| PWM controller | 87.5 -> 100 A | 87.5 -> 100 A | Matches |
| Cable, volt-drop leg | 5.5 mm2 | 5.494 mm2 | Matches (then ampacity governs) |
| Breaker, batt -> inverter | 144.6 -> 150 A | 144.68 -> 150 A | Matches |

**The panel-count divergence is the one to understand before you compare
outputs to the board.** Photo 5 sizes the array from the *battery bank*
(`120 kWh x 0.9`), having already rounded 120.687 kWh down to 120 — so it
feeds 108.0 kWh into a formula whose true input is 108.618 kWh. The engine
skips the round-trip and uses `E_daily` directly, which is algebraically the
same quantity (`E_bank_nameplate x DoD = E_daily`) without the intermediate
rounding. The 0.57% difference is enough to cross an integer boundary at both
panel wattages, which is exactly why the intermediate rounding is worth
avoiding.

**The board's 92 batteries turns out to be right, for a reason it doesn't
state.** The bare division gives 90.5, which rounds to 91 — but 91 units
cannot be wired onto a 48 V bank from 12 V units, because the bank has to be
built from whole series strings of four. The engine rounds up to complete
strings and returns 23 strings x 4 = 92. The first draft of this plan called
the board's 92 a rounding slip; it isn't, and that correction is now in the
engine rather than just the prose.

The two panel counts remain genuine corrections. The verification script
asserts the **engine** values and prints the source figure beside them as a
note — never bend a formula to reproduce a rounding slip.

## Techno-economic analysis

Adapted from Sobamowo & Ojolo (2018), *Techno-Economic Analysis of Biomass
Energy Utilization through Gasification Technology for Sustainable Energy
Production and Economic Development in Nigeria*, Journal of Energy, Article ID
4860252 — equations (1)–(13), re-derived for a solar PV + storage system.
Equation (14) is added from outside the paper.

The paper is a good structural fit: same country, same currency assumptions,
same NERC tariff context, and the same question ("is this economically viable
at a given selling price?"). Three things genuinely differ for solar, and the
adaptation lives in those three places:

- **There is no fuel.** Equation (5) collapses to zero. This is the single
  biggest structural difference and it propagates into (3), (6) and (12).
- **Storage must be replaced mid-life.** Batteries last 5–10 years against a
  20–25 year system life; the paper has no analogue, so a replacement term is
  added to (3).
- **Output degrades.** Panels lose roughly 0.5%/yr, so `Et` is not constant
  across the life and the paper's annuity shortcut in (12) needs a
  year-indexed form.

### Notation collisions in the source paper — read this first

The paper's own nomenclature has two problems that will bite anyone
implementing straight from the PDF:

- **`CF` is overloaded.** It means *capacity factor* in equations (2), (3),
  (5) and (6), and *cost of fuel* in equation (1) and (12). The engine uses
  `capacityFactor` and `C_fuel` as distinct names.
- **`Re` / `Rd` are labelled backwards.** The nomenclature reads "Re: Nominal
  cost of debt, Rd: Nominal cost on equity", but equation (13) applies the
  `(1-T)` tax shield to the `Rd` term — and the tax shield belongs to debt.
  The engine treats `Re` as cost of equity and `Rd` as cost of debt, which is
  the standard WACC form and what Table 13's own values (29% return on equity,
  24% cost of debt, 17% after-tax WACC) actually reconcile to.

### (1) Total capital investment cost

Paper: `C = C_G + C_PM + C_CW + C_A + C_F + C_R`

Solar:

```
C = C_PV + C_INV + C_BAT + C_CC + C_BOS + C_INST + C_R
```

| Paper term | Solar term | Meaning |
|---|---|---|
| `C_G` gasifier (conversion system) | `C_PV` | Panels — the conversion system, and like the gasifier's 62% the dominant line |
| `C_PM` prime mover | `C_INV` | Inverter |
| `C_CW` civil work | `C_INST` | Mounting, racking, labour, installation |
| `C_A` accessories/auxiliaries | `C_CC + C_BOS` | Charge controller, cables, breakers, SPD, combiner, earthing |
| `C_F` fuel handling capital | `C_BAT` | Storage — solar's analogue of the fuel-handling plant |
| `C_R` additional | `C_R` | Contingency, freight, import duty |

Every one of these falls straight out of the Stage 1–7 bill of materials
above, which is what makes the tool able to produce this at all.

### (2) Annual energy delivered

Paper: `Et = P_rated x 8760 x CF x (1 - P_aux/100) x (1 - MLF)`

Solar, with `capacityFactor = PSH x PR / 24`, the identity reduces to the
more directly usable:

```
Et = P_array x PSH x 365 x PR x (1 - P_aux/100) x (1 - MLF)
```

For an off-grid system the stored fraction also takes a round-trip hit:

```
Et_delivered = Et x [ (1 - nightFraction) + nightFraction x eta_roundtrip ]
```

`eta_roundtrip` ~0.90 lithium, ~0.80 lead-acid. `P_aux` covers controller and
monitoring parasitics; `MLF` is the marginal loss factor, near zero for
behind-the-meter systems with no transmission.

### (3) Operation and maintenance cost

Paper: `M = K_G C_G + K_PM C_PM + K_CW C_CW + K_A C_A + K_F C_F + K_R C_R + (8760 x CF x MP_n x W_r)`

Solar, with the battery replacement term added:

```
M = K_PV C_PV + K_INV C_INV + K_BAT C_BAT + K_CC C_CC + K_BOS C_BOS
    + K_R C_R + (MP_n x W_r) + M_repl
```

where

```
M_repl = C_BAT x (CEIL(n / L_batt) - 1) / n
```

`L_batt` = battery life in years (5–7 lead-acid, 8–12 lithium), `n` = system
life. Labour is annual-salary based rather than the paper's `8760 x CF x MP_n
x W_r` hours-worked form — a domestic PV system has no operating crew, just
periodic cleaning and inspection, so an annual figure is the honest shape.
For a household install `MP_n x W_r` may legitimately be zero.

`M_repl` is undiscounted here to stay consistent with how the paper treats
`M` inside (9) and (10). The discounted form,
`C_BAT x SUM over replacement years k of (1+d)^-k`, is more accurate and
should be offered as an advanced toggle rather than the default.

### (4) Annual revenue from sale of electricity

```
AR = (C / n) x [ 1 + m x ( ((1+I)^n - 1) / (I (1+I)^n) ) ]
```

Unchanged in form. `m` = annual O&M as a fraction of initial investment,
`I` = real rate of return, `n` = plant life in years.

Define the annuity factor once and reuse it throughout — it appears in
(4), (6), (9), (10) and (11):

```
A(I, n) = ((1+I)^n - 1) / (I (1+I)^n)
```

### (5) Cost of fuel

Paper: `C_F = 8760 x CF x P_rated x C_B x SFCR`

```
C_F = 0
```

Sunlight has no specific fuel consumption rate. This is the term that makes
solar's economics structurally different from the paper's gasification case —
in Table 16 the biomass plant's fuel runs to $10.8M/yr against a $270M capital
cost, and removing it entirely is most of why a PV system can clear a BCR > 1
at a far lower tariff than the paper's $0.727/kWh.

**Hybrid exception:** if a diesel generator is retained for backup,
`C_F = litres_per_year x price_per_litre`, and it should be entered, not
assumed away. For most Nigerian installs the *displaced* diesel cost belongs
in the benefit term (7), not here.

### (6) Cost per kWh generated

```
C_pkW = ( C / (N x n) ) x ( 1 / (P_R x capacityFactor) ) x [ 1 + m x A(I, n) ]
```

`N` = annual operating hours, `n` = life in years, `P_R` = installed capacity.
`N x P_R x capacityFactor` is annual kWh, so the result carries units of
$/kWh as intended. Note this is the paper's `CF`-as-capacity-factor reading —
see the notation warning above.

### (7) Benefit delivered annually

Paper: `B_A = Et x C_pkW`

For a Nigerian off-grid or backup system the honest benefit is *avoided* cost,
not a selling price — nobody is selling this power to a third party:

```
B_A = Et_delivered x (tariff_grid_displaced) + diesel_litres_avoided x price_per_litre
```

Keep the paper's `Et x C_pkW` form available as the "what would this have to
sell for" mode, since that is exactly the question Tables 16–18 answer and it
is a useful second view. Default the tool to avoided-cost, because that is
what a homeowner or SME actually experiences.

### (8) Payback period

```
n_payback = - ln( 1 - IC / (B_A - m x C) ) / ln(1 + I)
```

`IC` = total project investment cost. Undefined when `B_A <= m x C` — the
system never pays back because O&M exceeds benefit. The engine must guard
this branch and say so in plain words rather than returning `NaN`.

### (9) Net present value

```
NPV = B_A x A(I, n) - C x [ 1 + m x A(I, n) ]
```

Economically viable when `NPV > 0`.

### (10) Benefit cost ratio

```
BCR = (B_A / C) x [ A(I, n) / (1 + m x A(I, n)) ]
```

Project acceptable when `BCR > 1`. The paper's own Table 17 is the useful
calibration case: `BCR = 1.00` with payback 19.19 years against a 20-year
life is the break-even boundary, and it correctly reads that as *not* worth
investing in.

### (11) Internal rate of return

Solve for `IRR` in:

```
B_A x A(IRR, n) = C x [ 1 + m x A(IRR, n) ]
```

Newton-Raphson, as the paper specifies. Practical notes for the
implementation: bracket to `[-0.99, 10]`, seed at the discount rate `d`,
cap iterations at ~100 with a `1e-7` tolerance, and fall back to bisection if
the derivative goes flat. Report "no real IRR" rather than a garbage root when
the cash flow never crosses zero.

### (12) Levelized cost of electricity

Paper: `LCOE = SUM[(I_t + (1-T)(C_F + M)) / (1+d)^t] / SUM[E_t((1+d)^n - 1)/(d(1+d)^n)]`

The paper's denominator is an annuity shortcut that assumes constant annual
output. Panels degrade, so use the year-indexed form:

```
              SUM over t=1..n of [ (I_t + (1-T)(C_F + M_t)) / (1+d)^t ]
LCOE  =  ---------------------------------------------------------------
                    SUM over t=1..n of [ E_t / (1+d)^t ]

with   E_t = Et x (1 - delta)^(t-1)        delta ~ 0.005 /yr
and    C_F = 0
```

`M_t` carries the battery replacement in the years it actually falls, which is
the whole reason to index by year rather than annuitize. `T` = company tax
rate — set it to zero for a residential system, where there is no tax shield
to claim.

### (13) Discount rate (WACC)

```
d = (W x R_e) / V + (X x R_d) / V x (1 - T)
```

`W` = market value of equity, `X` = market value of debt, `V = W + X`,
`R_e` = cost of equity, `R_d` = cost of debt, `T` = tax rate. Labels corrected
per the notation warning above.

Table 13's parameters are a reasonable Nigerian default set to seed the UI —
70% debt / 30% equity, 24% nominal cost of debt, 29% nominal return on equity,
32% tax, giving the 17% after-tax WACC the paper uses — but they are 2012 NERC
figures for a utility-scale plant. **Flag them as dated and make every one
editable.** A 2026 household buying panels for cash has `X = 0`, `T = 0`, and
`d` reduces to their own opportunity cost of capital, which is a completely
different number.

### (14) Return on investment — added, not from the paper

The paper reports NPV, BCR, payback and IRR but no ROI. ROI is the metric
Nigerian solar buyers actually ask for, and it is the natural headline number
for a consumer-facing tool, so it is added here as a fourteenth equation:

```
ROI = [ (B_A - M) x n - C ] / C x 100%
```

Simple (undiscounted) lifetime return on investment: total net benefit over
the system life, less what was put in, as a percentage of what was put in.

Two companions worth reporting alongside it:

```
(14a)  ROI_discounted = NPV / C x 100%          # = (profitability index - 1)
(14b)  ROI_annual     = (B_A - M) / C x 100%    # simple annual return
```

(14a) is the defensible one — it is (14) with the time value of money
restored, and it is internally consistent with (9). Show (14) as the headline
because it is the number people recognise, and (14a) immediately beneath it,
labelled, so the tool teaches the difference rather than flattering the
result. A system can show a healthy 180% simple ROI and a negative discounted
ROI at a 17% WACC; if that is true it should be visible, not buried.

### Where this lives

```
src/lib/solar/
  economics.ts      # equations (1)-(14), pure, no I/O
  economics-types.ts
```

Same shape rule as `engine.ts`: pure functions, every parameter named and
overridable, no magic constants. `computeEconomics(bom, settings)` takes the
sizing bill of materials from `computeSizing` and returns every indicator
`{ C, Et, M, AR, C_pkW, B_A, payback, NPV, BCR, IRR, LCOE, d, ROI, ROI_disc }`,
each with its intermediate terms exposed for display.

### Verification against the paper — what it actually found

Run before the solar terms were wired in: the unmodified equations were fed
the paper's own biomass numbers and checked against its published tables.

**Equations (9) and (10) reproduce the paper.** With C = $270,000,000, n = 20,
I = 0.10 and the O&M fraction m = 24.51% implied by the paper's own figures:

| Quantity | Paper prints | Computed | Verdict |
|---|---|---|---|
| Annuity factor A(0.10, 20) | — | 8.5136 | — |
| NPV of benefit (Table 18) | 1,053,943,697 | 1,054,013,464 | matches to 0.007% |
| Accumulated NPV of all cost | 833,301,230 | 833,301,230 | exact |
| BCR (Table 18) | 1.265 | 1.2649 | matches |
| BCR (Table 17) | 1.00 | 1.0048 | matches |

**Three things in the paper do not reconcile**, and the implementation guards
each rather than reproducing it:

1. **Table 17's printed NPV is a copy-paste error.** It shows $220,642,467 —
   byte-identical to Table 18's — but Table 17's own benefit and cost rows
   give $3,965,330.
2. **Equation (8) has no solution at the paper's own parameters.** With the m
   that its NPV and BCR imply, `1 - IC/(B_A - mC)` is negative and the
   logarithm is undefined; the paper prints 10.14 years regardless. The engine
   returns `null` with a plain-language reason rather than `NaN`.
3. **Equation (11) gives 20.87%, not the 17.55% printed.** 17.55% is
   suspiciously close to the paper's own 17% WACC. Since (9) and (10) check
   out at identical inputs, the discrepancy sits in the paper's (8)/(11) row,
   not in the model.

Treat Table 16 as the weakest of the three — its printed BCR of 0.365 sits
beside a "Net Present Value of the benefit" row that appears twice with
different values. Lean on 17 and 18.

Practical conclusion: **(1)–(7), (9), (10), (12) and (13) rest on a verified
base; (8) and (11) follow the stated equations and deliberately diverge from
the paper's printed figures.** Worth stating in any write-up citing this
source.

### Prerequisite for this section

Costing needs Nigerian price data — panels/W, inverter/kW, battery/kWh,
controller, cable, breakers, install labour. None of that is in the course
material and it moves constantly. Options, cheapest first: a hand-maintained
`src/lib/solar/prices.ts` with a `lastReviewed` date shown in the UI (zero
infrastructure, matches how the reference-data tables already work); or a
quarterly review note in the repo. Do **not** scrape a vendor site at runtime —
it breaks the zero-budget, no-server-compute invariant and will rot silently.

## Lead capture

Two-tier, matching the original design's instinct:

1. **WhatsApp click-to-chat — zero backend, ship first.** A `wa.me` link
   prefilled with the sizing summary. Needs only the real business number.
2. **Structured lead → Supabase, via the Worker route above.** Turnstile +
   a honeypot field for spam control. Schema is unchanged from the original
   document's proposal — it's sound: RLS enabled, no anon `SELECT`, inserts
   only via the Worker using the service-role key, full appliance/result
   JSON stored alongside the structured columns for later analysis.

## Status — built 2026-09-16

Phases 1, 2 and 2b shipped together. What exists:

| File | Contents |
|---|---|
| `tests/solar/*.test.ts` | Standing `node:test` suite, 69 tests — run with `npm test` |
| `src/lib/solar/catalog.ts` | 33-appliance catalog, R/C/I suggestion by name, fallback classifier, default surge factors |
| `src/lib/solar/engine.ts` | Stages 0–7, `SizingSettings` with every constant named and overridable |
| `src/lib/solar/economics.ts` | Equations (1)–(14b), annuity helper, Newton-Raphson IRR with bisection guard |
| `src/lib/solar/currency.ts` | 13 currencies, NGN base, editable rates, review date |
| `src/lib/solar/prices.ts` | Placeholder Nigerian price and tariff books with review date |
| `src/lib/solar/report.ts` | Plain-text report for copy/download |
| `src/components/SolarCalculator.astro` | Three-step island: loads → sizing → economics |
| `src/pages/tools/solar-calculator/index.astro` | Page, SEO body, disclaimers |

Verified with disposable `node --experimental-strip-types` scripts: 26
assertions covering every worked example in the course material plus the
paper's Tables 17 and 18. Build passes; the island was exercised in headless
Chrome and confirmed to boot, compute and render all four result tables.

### Design decisions made during the build

These went beyond what the source material settles, and each is a real choice:

1. **`inverterBasis` defaults to `largest-surge`, not the class total.** The
   R/C/I rule sums *every* inductive load's surge, which is the right figure
   for the load-audit headline but assumes every motor in the building starts
   at once. On a realistic ten-appliance list it produced a 20 kW inverter for
   a 5.8 kW running load. Sizing from continuous load plus the single largest
   motor surge gives 15 kW for the same list. The class total is still
   offered as a setting for genuine simultaneous-cold-start cases.
2. **System voltage comes from `max(inverter rating, array watts)`.** Sizing
   it off the inverter alone is wrong when a modest peak load has high daily
   energy: a 2 kW inverter with a 5.5 kWp array landed on a 24 V bank and
   needed 287 A of charge controller. Letting the array participate moves it
   to 48 V and one 150 A controller.
3. **Charge controllers split rather than cap.** A current above the largest
   standard unit returns `unitCount > 1` with a per-unit rating, and the
   cable and breaker for that leg are costed per controller.
4. **Cables take `max(voltage drop, ampacity)`.** Both failure modes are real
   and the sources disagree; the larger wins, and the UI shows both figures so
   the user can see which one governed.
5. **Battery units default to 12 V.** 12 V divides evenly into every system
   voltage the tool can choose, so the bank is always wirable. A 48 V default
   produced an invalid bank on small systems.
6. **Battery banks round to whole series strings**, which is what makes the
   whiteboard's 92 lead-acid batteries correct rather than a rounding slip.

## QA pass — 2026-09-16

A full adversarial review after the first build. Ten defects found, all fixed.
Recorded here because several are the kind that would otherwise be
reintroduced by someone "simplifying" the code later.

### Critical — wrong numbers reached the user

1. **Equation (8) never returned a payback.** The paper prints it as
   `n = -ln(1 - IC/(B_A - mC))/ln(1+I)`, which requires the *annual* net
   benefit to exceed the *total* capital cost for the logarithm to be
   defined — true only for a project that repays inside one year. Implemented
   faithfully, it returned "never" for essentially every input, and the
   "never pays back" results in the first build were artifacts rather than
   findings. The standard discounted payback carries an interest multiplier on
   the capital term:

   ```
   n = -ln(1 - C x I / (B_A - M)) / ln(1 + I)
   ```

   With the paper's own Table 18 inputs this gives 6.63 years (it prints
   10.14). The engine uses the corrected form and says so in its notes.

2. **The battery replacement term never reached NPV, BCR, IRR or payback.**
   Equations (9)–(11) were taking `m` (the O&M *fraction*) and multiplying by
   capital, which recovers only the base O&M — the replacement added to
   equation (3) was silently dropped from every indicator except LCOE and ROI,
   defeating the point of adding it. All annuity-based indicators now take the
   absolute annual O&M. On a 20-year system with 5-year batteries this moved
   NPV by ₦25.5M on a ₦100M project; on the realistic test case it moved BCR
   from 0.846 to 0.718 and IRR from 7.05% to 3.57%. The algebra is unchanged —
   `B_A·A − C(1 + m·A)` is identical to `(B_A − M)·A − C` when `M = m·C`, so
   the paper's Tables 17 and 18 still reproduce exactly.

3. **PV cables were undersized in every configuration.** The cable was sized
   from `P / Voc` while its breaker was sized from `Isc`. Voc overstates
   operating voltage, so the cable came out below the array's own
   short-circuit current — 6 mm² (36 A) on a string delivering 42 A in one
   test. Cables and breakers are now one pass sharing a design current, and
   PV current is Isc-based.

### Important — silent failures at the edges

4. **Breakers were shrunk to fit undersized cables** instead of the cable
   being grown to carry the breaker, leaving circuits under-protected and
   prone to nuisance tripping. Reversed.

5. **Running out of standard sizes capped silently.** An inverter requirement
   above the largest listed unit, a breaker above 630 A, or a cable above
   240 mm² all returned the largest available part as though it were
   sufficient. All three now warn that parallel units or a higher system
   voltage are required.

6. **Divide-by-zero cascades.** A zero depth of discharge produced `Infinity`
   through the entire battery, capital and O&M chain; zero peak sun hours
   produced `NaN` cost per kWh and LCOE. Added `sanitizeSettings` and
   `sanitizeEconomicSettings`, which clamp every input to a physically
   meaningful range and report what they changed. Load lines are clamped too.

7. **Sanitised settings didn't propagate.** `computeSizing` clamped its own
   copy, but `computeEconomics` receives the settings object separately and
   was still seeing the raw values — so a zero peak-sun-hours still reached
   the capacity factor. It now clamps too.

8. **Breaker size granularity.** The list jumped 400 → 630 A, so a 434 A
   requirement was rounded 45% high. Added the standard 315 A and 500 A.

### UI

9. **Percent fields fought their own validation.** Bounds were stored as
   fractions while the input displayed percent, so a legitimate 100% was
   rejected against `max="1"`. Bounds and step now scale with the display.

10. **Two display faults.** Money inputs used `toFixed(currency.decimals)`,
    so a ₦900 price became `$0.58` and lost ~1% converting back — now six
    significant figures. And the computed Running/Design/Wh columns went stale
    while typing, because the keep-focus path skipped the re-render; those
    cells are now refreshed in place.

### Follow-up defect — surge aggregation (found by a user question)

Asked to confirm whether only the largest inductive load's surge is counted,
checking the code turned up two more inconsistencies, both now fixed:

11. **`'all'` only summed within a line, not across the list.** Two identical
    motors entered as two rows gave the same allowance as one motor; entered
    as a single row with `qty 2` they gave double. The same physical
    installation produced different answers depending on how it was typed in.
12. **The R/C/I class total had the same defect, and additionally depended on
    `surgeConcurrency`** — which it should not, since whiteboard photo 3
    counts a 5-unit line at full `qty x surge`.

The root cause was conflating two distinct quantities: the connected-load
design total (every inductive unit at full surge, always) and the inverter's
surge allowance (excess above running, one unit or all depending on the
setting). They are now computed separately, both across the whole list, so
neither depends on data-entry form. The UI no longer recomputes the table's
design-watts column either — it renders the engine's own audit values, so the
two cannot drift.

### Verification performed

| Check | Result |
|---|---|
| Worked examples from the course material and the paper's Tables 17–18 | 27 assertions, all pass |
| Edge cases (empty list, zeros, extremes, invalid settings) | 12 cases, 0 issues |
| Randomised fuzz over the full parameter space | 4,000 cases, 0 issues |
| Strict TypeScript (`--strict`) on the library | 0 errors |
| Strict TypeScript on the 667-line component script | 0 errors |
| Astro production build | passes, 54 pages |
| Headless Chrome — island boots, computes, renders | no NaN/Infinity in DOM, no input violating its own bounds |

The fuzz asserts cross-equation consistency, not just absence of crashes:
BCR > 1 must agree with NPV > 0, IRR above the hurdle rate must agree with a
positive NPV, every component must meet its computed requirement, and no cable
may carry less than its design current or its breaker.

## Remaining work

**Phase 3 — live data + lead capture.** NASA POWER live fetch + cache,
Open-Meteo "use my location", the `worker/index.ts` route, Supabase table,
Turnstile. Still blocked on the Supabase / Turnstile / WhatsApp prerequisites
above. Peak sun hours is currently a plain editable number with a sensible
default, which is a perfectly usable stand-in.

**Phase 4 — SEO layer.** `SoftwareApplication` / `FAQPage` schema, city
landing pages from the irradiance dataset, and the paired guides. The
economics layer opens a second guide angle worth taking — payback and ROI
content reaches people at the decision stage rather than the research stage,
and converts harder than sizing content.

## Open questions for you

Resolved:

- ~~Phase 1 now or after the formulas?~~ Both built.
- ~~Surge-factor convention for `qty > 1` lines?~~ `surgeConcurrency`,
  defaulting to `'single'`.
- ~~Do the R/C/I classes have an arithmetic role?~~ Yes — confirmed and
  implemented. Inductive loads carry surge into the design total; R and C do
  not.
- ~~Test runner?~~ `node:test`, zero new dependencies, wired to `npm test`.
  The disposable-script convention was the right default, but this module's
  maths is safety-relevant and two QA passes found twelve defects in it, so
  the verification is now permanent rather than thrown away. A mutation check
  confirms the suite bites: reintroducing any of the three number-changing
  defects fails it.

Still open:

- **Real component prices.** The shipped `prices.ts` is placeholders with a
  visible review date, and the UI says so prominently. Every payback and NPV
  figure is only as good as these. This is the highest-value thing you can
  supply.
- **Exchange rates** in `currency.ts` are indicative and editable, same
  caveat. Only NGN is authoritative, being the base.
- **Benefit basis** defaults to avoided cost (grid tariff + displaced diesel),
  with the paper's "required selling price" framing as the alternative. Say if
  you want that flipped.
- **Real WhatsApp number and Supabase project** — Phase 3 is blocked on both.
