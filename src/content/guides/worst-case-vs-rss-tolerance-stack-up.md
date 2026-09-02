---
title: "Worst-Case vs. RSS Tolerance Stack-Up: Which Should You Use?"
description: "A practical comparison of worst-case and RSS tolerance stack-up methods, with a worked example showing how differently they treat the same dimensional chain."
targetKeyword: "worst case vs rss tolerance analysis"
publishDate: 2026-09-03
funnelsTo:
  - href: "/tools/tolerance-stack-up/"
    label: "Tolerance Stack-Up Calculator"
---

Every tolerance stack-up eventually reaches the same fork in the road: you've listed out your dimensional chain, you know each contributor's tolerance, and now you need one number to answer "will this actually fit?" There are two standard ways to get there, and they can produce wildly different answers from the exact same inputs. Picking the wrong one isn't just an academic error — it's how you either reject perfectly good assemblies or ship ones that don't fit.

This guide covers what worst-case and RSS (root-sum-square) stack-ups actually compute, runs the same dimensional chain through both, and gives you a straightforward way to decide which one applies to the part in front of you.

## What worst-case actually assumes

Worst-case stack-up asks a blunt question: what's the total variation if every single contributor lands at the *worst possible extreme, simultaneously, in the direction that hurts you most*? The math matches the assumption — it's just addition:

**Worst-case tolerance = Σ |tolerance of each contributor|**

You sum the absolute value of every tolerance in the chain, with no discount for probability. This is deliberately pessimistic. It doesn't ask how *likely* it is that four parts all come in at their extreme limit on the same day — it just assumes it happens, and sizes the tolerance band to cover that case anyway.

The upside is that a worst-case stack-up gives you a hard guarantee: if the stack passes, it passes for every physically possible combination of part dimensions within their individual tolerances, full stop. No statistics, no assumptions about distribution shape, nothing that can quietly stop being true if your supplier's process drifts.

## What RSS actually assumes

Root-sum-square stack-up starts from a different, more realistic premise: manufactured dimensions aren't sitting at their tolerance limits, they're clustered around nominal, usually in something close to a normal distribution. If that's true, the odds of *every* contributor in a long chain landing at its worst extreme *at the same time* are vanishingly small — small enough that designing for it wastes tolerance you don't need to give up.

RSS combines the contributors statistically instead of additively:

**RSS tolerance = √(Σ tolerance² of each contributor)**

You square each tolerance, sum the squares, and take the square root. Because squaring and rooting compress the contribution of each term relative to simple addition, the RSS result is always smaller than the worst-case result for the same chain — often dramatically smaller once you have more than three or four contributors.

## The same stack, two different answers

Here's a simple four-dimension chain — think of it as a gap between a housing face and a retaining ring, built from a shaft length, a bearing width, a spacer, and a snap ring groove position:

| Contributor | Nominal | Tolerance (±) | Direction |
|---|---|---|---|
| A | 25.0 mm | 0.05 mm | + |
| B | 10.0 mm | 0.03 mm | − |
| C | 15.0 mm | 0.04 mm | + |
| D | 5.0 mm | 0.02 mm | − |

Nominal stack: 25 − 10 + 15 − 5 = **25.0 mm**, the same regardless of method — direction and nominal values don't change between worst-case and RSS, only how the *tolerances* combine.

Worst-case tolerance: 0.05 + 0.03 + 0.04 + 0.02 = **±0.14 mm**, giving a range of 24.86 to 25.14 mm.

RSS tolerance: √(0.05² + 0.03² + 0.04² + 0.02²) = √0.0054 ≈ **±0.0735 mm**, giving a range of 24.9265 to 25.0735 mm.

The RSS range is barely half the width of the worst-case range, from the exact same part tolerances. That gap only grows as you add more contributors to the chain — which is exactly why RSS becomes attractive on complex assemblies, and exactly why it can be dangerous to reach for by default.

## When worst-case is the right call

Worst-case earns its conservatism in a few specific situations:

**Safety-critical or single-point-of-failure features.** If the consequence of an out-of-tolerance stack is a part that doesn't fit, doesn't seal, or fails structurally, you generally want the guarantee that covers every physically possible case — not the one that covers "most" cases.

**Low production volume.** RSS's statistical argument depends on having enough parts in the population for a normal distribution to actually emerge. On a run of five first-articles, there's no meaningful distribution yet — you effectively only get to sample the extremes, so the worst-case assumption is closer to reality than the statistical one.

**Short chains.** With two or three contributors, the gap between worst-case and RSS is often small enough that the simpler, more conservative method isn't costing you much, and it avoids having to defend a statistical assumption to a customer or a regulator.

**Contractual or interchangeability requirements.** Some customer specs and industry standards explicitly require worst-case analysis for form, fit, or safety-critical interfaces, particularly in aerospace and medical device work. When that's the requirement, it's not really a choice.

## When RSS is the right call

RSS earns its place when the statistical assumption is actually defensible:

**High-volume, stable processes.** If you're running thousands of parts through a controlled manufacturing process, the individual dimensions genuinely do cluster near nominal in something close to a normal distribution, and worst-case analysis is leaving real tolerance — and real cost — on the table for no benefit.

**Long chains with many contributors.** This is where RSS's compression effect matters most. A ten-dimension chain analyzed worst-case can produce an unbuildable tolerance requirement on individual parts, while the same chain analyzed statistically shows a comfortable, achievable fit — because the odds of all ten landing at their extremes together really are negligible.

**Independent contributors.** RSS assumes each dimension varies independently of the others. If two contributors come from the same manufacturing operation, the same fixture, or are otherwise correlated, RSS can understate the real risk — the whole point of the method breaks down if the inputs aren't actually independent.

## The assumption that quietly breaks RSS

RSS isn't wrong, but it's conditional, and the condition is easy to lose track of mid-project: it assumes each contributor is normally distributed and statistically independent, typically with the stated tolerance representing something like a ±3σ spread. If a supplier's process is skewed, bimodal, or trending instead of centered and random, RSS will understate your real risk — sometimes significantly — while still producing a clean, confident-looking number.

This is the actual argument for running a Monte Carlo simulation alongside (or instead of) a hand-calculated RSS: it lets you sample each contributor's real distribution directly, sum tens of thousands of simulated assemblies, and see the resulting spread — including the tails — rather than trusting a closed-form formula to have gotten the distribution shape right. It's also the only practical way to layer in a process capability estimate (Cp/Cpk) against a real spec limit, since that requires the actual simulated mean and standard deviation of the stack, not just a single ± number.

## A middle ground worth knowing: mixed stacks

Real assemblies rarely need a single, uniform answer across every contributor. A common and defensible practice is analyzing a chain with a mixed approach: worst-case for the one or two contributors that are genuinely safety-critical or poorly controlled (a purchased component with wide, unverified tolerances, say), and RSS for the remaining well-controlled, high-volume contributors in the same chain. This isn't a compromise for its own sake — it's matching the analysis method to what's actually known about each individual contributor's real-world behavior, rather than forcing the whole chain through one lens because it's simpler to compute by hand. It's also one of the more common ways stack-up analyses get *quietly* wrong: treating every contributor identically by default, without asking whether that contributor's actual tolerance is well-controlled enough to justify the statistical treatment.

## A working rule of thumb

If you're not sure which to reach for: run worst-case first, because it's fast and it's a hard guarantee. If it fails and the part is genuinely a high-volume, statistically-controlled process, move to RSS — and if the decision is close, or the consequence of being wrong is expensive, run a Monte Carlo simulation to see the actual distribution rather than trusting either closed-form number blind.

The [Tolerance Stack-Up Calculator](/tools/tolerance-stack-up/) runs worst-case, RSS, and a 100,000-sample Monte Carlo simulation on the same contributor list side by side, so you can see all three answers for your actual stack instead of picking a method and hoping it was the right one.
