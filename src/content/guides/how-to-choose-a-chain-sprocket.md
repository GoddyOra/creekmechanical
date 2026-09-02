---
title: "How to Choose a Chain Sprocket: Pitch, Tooth Count, and Bore"
description: "A practical walkthrough of chain sprocket selection — matching pitch to your chain, choosing tooth count, sizing the bore, and the alignment details that actually affect chain life."
targetKeyword: "how to choose a sprocket"
publishDate: 2026-09-11
funnelsTo:
  - href: "/tools/sprocket-generator/"
    label: "Roller Chain Sprocket Generator"
---

Sprocket selection looks like it should be simple — pick a pitch, pick a tooth count, pick a bore — and mostly it is, once you know which of those decisions are actually yours to make and which ones are dictated by the chain you've already committed to. Here's a practical path through it.

## Pitch isn't really a design choice — it's a given

Chain pitch is the distance between consecutive roller centers, and it has to match your chain exactly; there's no such thing as a sprocket that "mostly fits" a given pitch. In practice, this means pitch selection actually happens when you select the chain, not the sprocket — standard ANSI roller chain sizes like #25, #35, #40, #50, and #60 each correspond to a fixed pitch (0.25", 0.375", 0.5", 0.625", and 0.75" respectively, with the numbering following a consistent pattern), and once that chain is chosen, every sprocket in the system inherits that same pitch as a hard constraint.

The practical takeaway: choose your chain based on the load and speed the drive needs to handle first, then treat pitch as fixed for every sprocket downstream of that decision.

## Pitch diameter follows directly from pitch and tooth count

Once pitch and tooth count are set, the sprocket's pitch diameter isn't a free variable — it's fixed by simple geometry, since the chain's rollers sit on a circle around the sprocket at a spacing equal to the chain pitch:

**Pitch diameter = pitch / sin(180° / number of teeth)**

This is exact, not an approximation — it falls directly out of the geometry of N rollers evenly spaced on a circle, chord length equal to the chain pitch. It's worth knowing this formula even if you never calculate it by hand, because it tells you something useful immediately: for a fixed chain pitch, more teeth always means a larger sprocket. If you're constrained on physical size, tooth count and pitch diameter are the same lever.

## Tooth count: the ratio decision, with a practical floor

Like gears, sprocket tooth count is usually driven first by the speed ratio you need between the driver and driven shaft — the ratio of teeth between the two sprockets sets the speed ratio directly, the same relationship as a simple gear pair.

But tooth count also affects how smoothly the chain runs, for a reason that's specific to chain drives: a chain doesn't wrap a true circle, it wraps a polygon, because it's made of rigid links pinned at fixed intervals. As each link engages and disengages the sprocket, the chain's effective radius — and therefore its instantaneous linear speed — varies slightly through the engagement cycle. This is called chordal action, or the polygon effect, and it's more pronounced with fewer teeth, because a low tooth count means a coarser polygon approximating the circle.

In practice, this means very low tooth counts (particularly anything under about 15 teeth) run rougher and produce more vibration and noise than higher counts, even at the same nominal speed — a real, physical consequence of the geometry, not just a rule of thumb. Where space and ratio requirements allow it, staying at 17 teeth or above on the smaller sprocket in a drive noticeably smooths out the chain's motion.

## Bore and hub: the part that actually varies by application

The bore is where a sprocket stops being a standard catalog part and starts being specific to your shaft. A few things to check before finalizing it:

**Fit type.** A running fit that allows the sprocket to be positioned and removed without excessive force, or a press fit for a permanent installation — the choice affects both the bore tolerance you specify and whether you need a separate retention method at all.

**Keyway.** Most power-transmission sprockets above a modest torque level use a keyway and key rather than relying on friction or a set screw alone, since a keyway transmits torque positively rather than depending on clamping force that can loosen over time.

**Set screws.** Common on lighter-duty sprockets, typically paired with a flat ground on the shaft so the screw doesn't just dig a divot into round stock. Set-screw-only retention is generally a lower-torque, lower-vibration solution than a keyed connection — worth checking against your actual load case rather than defaulting to it out of habit.

**Hub length and shoulder.** A longer hub gives more shaft engagement and better resistance to the sprocket cocking under load, at the cost of additional axial space — a real tradeoff on compact drives.

## Center distance and chain length: the detail that's easy to skip

Once both sprockets are sized, the remaining decision is center distance, and it has a couple of practical constraints that aren't obvious until you've been burned by them once. Very short center distances increase the wrap angle sensitivity to any misalignment and make the drive more sensitive to sprocket sizing errors; very long center distances increase chain whip and sag, requiring an idler or tensioner to keep the slack side under control. A commonly used starting range is a center distance of roughly 30 to 50 chain pitches for a general-purpose drive, adjusted from there based on the specific application's space and vibration constraints.

It's also worth choosing the chain length so that, where both sprockets have an even tooth count, the number of chain pitches comes out odd. This avoids the same chain link always meeting the same tooth on every revolution, which spreads wear more evenly across both the chain and the sprocket teeth instead of concentrating it at one repeating engagement point.

## A note on sprocket tooth geometry specifically

It's worth being upfront about something here: true ANSI B29.1 / ISO 606 sprocket tooth geometry — the precise seating curve and flank radius that defines exactly how a roller sits against a tooth — is a genuinely detailed specification, more involved than it might look from the outside. Our own [Sprocket Generator](/tools/sprocket-generator/) produces a functional approximation: an exact pitch diameter (from the formula above, not approximated) with a smooth tooth profile sized to the roller diameter, useful for visualizing a design, checking clearances, or 3D printing a prototype or a low-load, low-cycle-life part. For a sprocket going into a demanding, continuous-duty production drive, verify the final tooth geometry against your chain manufacturer's specification or use a certified catalog part — the approximation is honest about being a design aid, not a substitute for a certified profile on a load-bearing production part.

## Lubrication and wear: the maintenance decision that's really a design decision

It's tempting to treat chain lubrication as a maintenance procedure that happens after the design is finished, but the sprocket and chain selection you make up front directly determines how forgiving the drive is of real-world lubrication practice. A drive running in a clean, accessible location with a realistic maintenance schedule can run a smaller, lighter chain and sprocket combination than one running in a dirty, hard-to-access location where lubrication will predictably be neglected — in the second case, deliberately oversizing the chain and sprocket pitch relative to the calculated load gives the drive margin against the accelerated wear that under-lubrication causes, rather than relying on a maintenance schedule that experience suggests won't actually be followed.

This is also where tooth profile wear becomes relevant to sprocket replacement, not just chain replacement: as a sprocket wears, its effective tooth shape changes in a way that concentrates load differently on the chain rollers, which accelerates chain wear even if the chain itself started in good condition. A worn sprocket paired with a new chain is a common, avoidable cause of premature chain failure — inspecting sprocket tooth profile at the same interval as chain replacement, rather than only replacing the chain, is standard practice on any drive that matters.

## Putting it together

The order that actually works, in practice: pick your chain (which fixes pitch), pick tooth counts on both sprockets to hit your speed ratio while keeping the smaller sprocket at 17 teeth or more if space allows, size the bore and hub to your actual shaft and torque requirement, and choose a center distance in a sensible range with an odd chain-pitch count if both tooth counts are even. The [Sprocket Generator](/tools/sprocket-generator/) will build and export a model from pitch, roller diameter, tooth count, and bore diameter once those decisions are made, so you can check fit and proportions before committing to a final drawing.
