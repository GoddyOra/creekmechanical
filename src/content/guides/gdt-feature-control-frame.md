---
title: "How to Read a GD&T Feature Control Frame (With Worked Examples)"
description: "A practical, plain-English walkthrough of how to read a GD&T feature control frame, including a worked true position example with numbers you can check."
targetKeyword: "how to read gd&t feature control frame"
publishDate: 2026-09-02
funnelsTo:
  - href: "/calculators/true-position/"
    label: "True Position & Bonus Tolerance Calculator"
---

The first time you see a feature control frame on a drawing, it looks less like engineering notation and more like a fortune cookie written by a robot. A little rectangle, chopped into boxes, holding a symbol, a number, a couple of letters in circles, and a string of capital letters at the end. Nothing about it explains itself.

Once you know what each compartment is doing, though, a feature control frame reads almost like a sentence. It's telling you: here's the characteristic being controlled, here's how much it's allowed to vary, and here's what everything is being measured relative to. That's it. This guide walks through each piece, then runs a real worked example so you can see how the pieces turn into an actual pass/fail number on a part.

## What a feature control frame actually is

A feature control frame (FCF) is the standard way ASME Y14.5 (and its international cousin, ISO 1101) expresses a geometric tolerance. Instead of writing "this hole must be positioned within 0.5 mm of its theoretical location" in a note somewhere on the drawing, GD&T packs that requirement into a compact box attached directly to the feature it controls, usually with a leader line pointing at a dimension, an edge, or a surface.

Every FCF is built from the same skeleton, read left to right:

1. **Geometric characteristic symbol** — what's being controlled (position, flatness, perpendicularity, and so on)
2. **Tolerance zone shape and value** — how big the allowed variation is, and what shape it takes
3. **Material condition modifier** (optional) — whether the tolerance can grow as the feature's own size varies
4. **Datum references** (optional, depending on the characteristic) — what the tolerance is measured relative to

Not every FCF has all four pieces. A flatness callout, for example, doesn't reference datums at all — a surface can only be flat relative to itself. But position, orientation, and most location controls do.

## Breaking down a real example

Take a feature control frame you might see on a bracket with a mounting hole:

```
[⌖] [⌀0.5 Ⓜ] [A|B|C]
```

Reading it left to right:

- **⌖** is the position symbol — a circle with four tick marks. This FCF is controlling where the hole's axis is allowed to fall, not its size or its roundness.
- **⌀0.5 Ⓜ** is the tolerance zone: a cylindrical zone 0.5 mm in diameter (the ⌀ symbol tells you it's a diameter, not a radius), that the hole's actual axis must fall inside. The circled M is the Maximum Material Condition (MMC) modifier — more on why that matters in a second.
- **A|B|C** are the datum references, in priority order. Datum A is the primary reference (usually the surface that sits flat on a fixture first), B is secondary, C is tertiary. The hole's position is measured relative to this stack, not relative to the part's edges by eye.

That's the whole sentence: "This hole's axis must fall within a 0.5 mm diameter cylinder, centered on its true position relative to datums A, B, and C — and that 0.5 mm can grow if the hole departs from its maximum material condition."

## Why the MMC modifier changes the math

This is the part that trips people up, so it's worth sitting with. Maximum Material Condition means the feature has the *most material* — for a hole, that's when the hole is at its **smallest** allowed diameter (least material removed). For an external feature like a pin or a shaft, MMC is the **opposite**: the largest allowed diameter, because more material means a fatter shaft.

Here's why the standard cares: if a hole is manufactured larger than its MMC size, there's more clearance around any fastener going through it, so the position tolerance can afford to be a little looser without causing an assembly problem. That extra allowance is called **bonus tolerance**, and it's calculated as:

**Bonus tolerance = |actual measured size − MMC size|**

The total position tolerance available on that specific part, at that specific measured size, is the stated tolerance plus the bonus:

**Total position tolerance = stated tolerance + bonus tolerance**

This is a real, usable allowance — not a rounding fudge factor. On a high-volume part, MMC bonus tolerance routinely turns a marginal "reject" measurement into a legitimate pass, because the standard is explicitly accounting for the fact that a bigger hole needs less positional precision to still assemble correctly.

## A worked example with real numbers

Let's put actual measurements through it. Say the drawing calls out:

- Stated position tolerance: ⌀0.4 mm at MMC
- Hole's MMC size (its smallest allowed diameter): 10.0 mm
- Actual measured hole diameter: 10.15 mm
- Measured deviation of the hole's actual center from its true (nominal) position: 0.15 mm in X, 0.10 mm in Y

First, the bonus tolerance:

Bonus = |10.15 − 10.0| = 0.15 mm

Total position tolerance available = 0.4 + 0.15 = **0.55 mm**

Next, the measured true position itself. This is where a lot of people make an avoidable mistake: true position is a **diametral** value, not a simple radial distance. The formula is:

**True position = 2 × √(devX² + devY²)**

True position = 2 × √(0.15² + 0.10²) = 2 × √(0.0325) ≈ **0.36 mm**

Compare the two: the part needed to stay within 0.55 mm of true position, and it measured at 0.36 mm. That's a pass, with 0.19 mm of margin to spare — margin that would have been invisible if you'd only looked at the stated 0.4 mm tolerance and ignored the bonus.

You can run this exact calculation — including the feature-type switch for holes versus shafts — with the [True Position & Bonus Tolerance Calculator](/calculators/true-position/), which handles the sign conventions automatically so you don't have to remember which direction MMC bonus grows for which feature type.

## A quick reference for common symbols

You won't need all fourteen GD&T characteristic symbols on a typical drawing, but these show up constantly:

| Symbol | Characteristic | Datum reference required? |
|---|---|---|
| ⌖ | Position | Yes |
| ⏥ | Flatness | No |
| ⏊ | Perpendicularity | Yes |
| ∠ | Angularity | Yes |
| ⌭ | Circularity | No |
| ⌰ | Cylindricity | No |
| ⌯ | Symmetry | Yes |
| ⌇ | Total runout | Yes |

Notice the pattern: form controls (flatness, circularity, cylindricity) never reference datums, because they're describing a feature's relationship to itself. Everything else — location, orientation, runout — needs a datum reference frame, because "off to one side" only means something relative to a known reference.

## Common mistakes when reading a feature control frame

**Treating true position as a radius.** The factor of 2 in the true position formula catches people constantly, because it feels natural to just report the raw distance between the actual and nominal centers. The standard defines it as a diameter for a reason — it matches how the tolerance zone itself is specified — so leaving out the ×2 will make every part look twice as good as it actually is.

**Applying bonus tolerance in the wrong direction.** For a hole, bonus grows as the hole gets *bigger* than MMC. For a shaft or pin, bonus grows as it gets *smaller* than MMC. Mix these up and you'll either reject good parts or pass bad ones.

**Ignoring datum priority order.** A|B|C is not the same as B|A|C. The primary datum establishes the first three degrees of freedom (typically stabilizing a plane), the secondary locks two more, and the tertiary locks the last one. Swap the order and you're measuring a physically different setup, even though the numbers on the drawing look identical.

**Assuming every tolerance gets a bonus.** The MMC or LMC modifier has to be explicitly called out in the FCF (as that circled M or L) for bonus tolerance to apply at all. A feature control frame with no modifier — sometimes called Regardless of Feature Size, or RFS — holds to the stated tolerance no matter what size the feature actually measures. No modifier, no bonus.

## The takeaway

A feature control frame is dense, but it isn't arbitrary — every compartment is answering one specific question, in a fixed order: what's controlled, how much variation is allowed, whether that allowance can grow, and what it's all measured against. Once you can parse those four questions on sight, drawings that used to require a GD&T reference card start reading like ordinary English.

If you're checking real measurements against a positional callout, the [True Position & Bonus Tolerance Calculator](/calculators/true-position/) will run the bonus tolerance and true position math for you — useful for double-checking inspection data, or for sanity-checking a tolerance stack before it goes out for quote.
