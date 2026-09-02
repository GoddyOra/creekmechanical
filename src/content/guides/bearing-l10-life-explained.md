---
title: "What Bearing L10 Life Actually Means (and What It Doesn't)"
description: "L10 bearing life is a statistical rating, not a guarantee for any individual bearing. Here's what the number actually represents, why load matters so much, and what it can't tell you."
targetKeyword: "what is l10 bearing life"
publishDate: 2026-09-12
funnelsTo:
  - href: "/calculators/bearing-life/"
    label: "Bearing Life (L10) Calculator"
---

A bearing datasheet says "L10 life: 5,000 hours," and it's tempting to read that as a straightforward promise: this bearing will run for 5,000 hours. It isn't that, and reading it that way leads to two different mistakes — either false confidence in an individual bearing's remaining life, or unnecessary alarm when a bearing fails well before its rated number. L10 is a statistical rating about a population, not a countdown timer on the part in front of you. Here's what it actually says, and — just as importantly — what it deliberately doesn't.

## What L10 actually represents

L10 life is defined as the number of revolutions (or, at a given constant speed, the number of hours) that **90% of a population of identical bearings, operating under identical load and conditions, are statistically expected to exceed before showing the first sign of fatigue.** Equivalently: for that population, 10% are expected to develop fatigue-related damage before reaching L10, and 90% are expected to still be running fine at that point.

It's a rating about the *distribution* of outcomes across many bearings, not a prediction about any one bearing. A bearing rated for 5,000 hours L10 might fail at 2,000 hours or might still be running cleanly at 20,000 — both are consistent with the rating, because the rating only describes where the 10th percentile of the population sits, not where any individual unit falls within it.

## The formula, and why load dominates it

The standard formula for basic rating life is:

**L10 = (C / P)^k**

Where C is the bearing's basic dynamic load rating (a catalog value specific to that bearing), P is the equivalent dynamic load actually being applied in your application, and k is an exponent that depends on bearing type — 3 for ball bearings, 10/3 for roller bearings.

That exponent is the detail worth internalizing, because it makes bearing life dramatically more sensitive to load than intuition suggests. Double the load on a ball bearing, and L10 life doesn't halve — it drops to (1/2)³ = 1/8 of its original value. For a roller bearing, doubling the load drops life to roughly 1/10. This is why a bearing that seems comfortably rated for an application's *nominal* load can fail far earlier than expected if the real operating load runs even moderately higher than assumed — a shock load, a misalignment that concentrates load unevenly, or simply an underestimated duty cycle can eat through most of the rated life margin because of how steeply that exponent responds.

It also cuts the other way, usefully: a design change that reduces the actual working load by a modest amount can extend calculated life by a large factor, which is often a more effective lever than moving to a bigger, more expensive bearing.

## Converting to hours

The raw L10 figure comes out in millions of revolutions. To convert to hours at a known constant rotational speed:

**L10h = L10 × 10⁶ / (60 × N)**

where N is the rotational speed in RPM. This is the number that actually shows up on most datasheets and design calculations, since "hours of service" is almost always the more useful unit for planning maintenance intervals or comparing against an expected product lifetime.

## What L10 doesn't tell you

This is the part that gets skipped most often, and it matters in practice more than the formula does.

**L10 only models fatigue failure** — the gradual subsurface material fatigue that eventually produces spalling on the rolling surfaces, from repeated cyclic contact stress. It says nothing about failures from contamination, lubrication breakdown, misalignment, improper mounting, or corrosion — and in a great deal of real-world bearing failures, one of *those* causes is the actual root cause, not classical fatigue. A bearing that fails at a fraction of its L10 rating is often failing for a reason the L10 calculation was never modeling in the first place, which is why chasing a "higher-rated" bearing doesn't fix a failure that was actually caused by dirty lubricant or a bent shaft.

**L10 doesn't predict an individual part's failure point.** Because it's a 10th-percentile population statistic, roughly one in ten bearings in a large population is, by definition, expected to fail *before* reaching L10 under normal, well-controlled conditions — that's not a defect rate, it's baked into what the rating means. If your application can't tolerate that failure rate at the L10 hour mark, the answer isn't to distrust the number; it's to design toward a lower-percentile, higher-reliability rating instead (see below).

**Median life is meaningfully higher than L10, not the same thing.** For the failure distribution typical of rolling element bearings, the median life (L50 — the point at which half the population has failed) tends to run roughly five times the L10 figure, though the exact ratio depends on the specific failure distribution's shape for that bearing type and application. This is worth knowing mainly so L10 doesn't get mentally rounded up to "typical" life — L10 is deliberately a conservative, early-percentile figure, not an average.

## A worked example

Say a ball bearing has a catalog dynamic load rating C of 25 kN, the application applies an equivalent dynamic load P of 5 kN, and the shaft runs at 1,750 RPM.

L10 = (C / P)^k = (25 / 5)³ = 5³ = **125 million revolutions**

Converting to hours at 1,750 RPM:

L10h = (125 × 10⁶) / (60 × 1,750) ≈ **1,190 hours**

Now suppose a design change — a slightly different load path, or a revised duty cycle — pushes the real equivalent load up to 7 kN, a 40% increase that might not raise any immediate red flags in a quick review:

L10 = (25 / 7)³ ≈ 3.57³ ≈ **45.5 million revolutions**, roughly a **64% reduction** in calculated life from that one change. This is the load-sensitivity exponent from earlier made concrete: a load increase that looks modest on paper can cut expected bearing life by more than half, which is exactly why revisiting the load estimate is worth more design attention than it usually gets once a bearing has already been selected.

## Designing with L10 sensibly

A few practical habits follow directly from what L10 actually means:

**Use a realistic equivalent load, not an optimistic one.** Since life scales with the load exponent so steeply, an underestimated P — from ignoring a shock load, a misalignment, or a duty cycle that's heavier than the nameplate rating — produces an L10 estimate that looks comfortable on paper and isn't.

**Consider a lower-percentile reliability rating for critical applications.** Standard catalog L10 values correspond to 90% reliability. Where a bearing failure has an outsized consequence — safety-critical equipment, hard-to-access locations, high cost of downtime — some manufacturers publish L1 or L5 ratings (99% or 95% reliability respectively), which are more conservative and more appropriate for that kind of consequence.

**Don't treat L10 as a substitute for lubrication and contamination control.** Since non-fatigue failure modes are common contributors to real-world bearing failures, proper lubrication selection, seal integrity, and installation practice often matter more to actual achieved life than the difference between two closely-rated bearing options.

**Build in margin against uncertainty in the load estimate**, not just against the nominal expected load — given how strongly life responds to load, a modest safety factor on P translates into a large safety factor on calculated life, which is usually a better use of margin than over-specifying elsewhere in the design.

## Temperature is a load factor too, even though it isn't in the formula

The L10 formula only takes dynamic load and speed as inputs, which makes it easy to overlook that operating temperature affects real bearing life through mechanisms the basic formula doesn't capture at all. Lubricant viscosity drops as temperature rises, thinning the film that's supposed to keep rolling elements separated from the raceway — run hot enough, long enough, and that film can break down enough to cause metal-to-metal contact and accelerated wear that has nothing to do with classical subsurface fatigue. Most catalog dynamic load ratings assume a reference operating temperature, and running meaningfully hotter than that reference, without adjusting lubricant selection or relubrication interval accordingly, is a common way real bearing life falls short of a calculated L10 that looked perfectly adequate on paper.

## The takeaway

L10 is a genuinely useful, well-defined engineering figure — but it's answering a specific statistical question about a population under fatigue loading, not making a promise about the part on your shaft. Read it that way, feed it a realistic load estimate, and it's a solid basis for a design decision. Read it as a guarantee, and it'll eventually surprise you, usually at an inconvenient time.

The [Bearing Life (L10) Calculator](/calculators/bearing-life/) runs the formula above directly — enter the dynamic load rating, equivalent load, bearing type, and speed, and it returns both the L10 life in revolutions and the converted L10h in hours.
