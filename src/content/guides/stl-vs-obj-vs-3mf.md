---
title: "STL vs. OBJ vs. 3MF: Which 3D File Format Should You Export?"
description: "What STL, OBJ, and 3MF actually store, where each format falls short, and a practical guide to picking the right one for 3D printing, CAD exchange, or rendering."
targetKeyword: "stl vs obj vs 3mf"
publishDate: 2026-09-09
funnelsTo:
  - href: "/tools/step-iges-viewer/"
    label: "STEP & IGES 3D Viewer"
  - href: "/tools/spur-gear-generator/"
    label: "Parametric Part Generators"
---

Every 3D export dialog eventually asks the same question — STL, OBJ, or 3MF — and most people answer it the same way every time, out of habit, without thinking about what the format actually does or doesn't preserve. That habit works fine most of the time, right up until a color disappears, a unit gets scaled 25.4× by accident, or a file that opens fine in one program throws an error in another. Here's what each format actually stores, and a straightforward way to decide.

## STL: the oldest, the most universal, and the most limited

STL (originally short for "stereolithography," from its 1987 origins in early 3D printing) stores exactly one thing: a list of triangles, each defined by three vertices and a normal vector. That's the entire format. No color, no material, no scene hierarchy, no embedded units, no metadata of any kind beyond the raw triangle mesh itself.

That minimalism is both STL's greatest strength and its most persistent problem. It's supported by essentially every piece of 3D software ever written, which makes it the safest choice when you don't know what the receiving end can handle. But the missing pieces cause real, recurring issues:

**No embedded units.** An STL file is just numbers — there's no field anywhere that says whether those numbers mean millimeters or inches. The convention varies by industry and by software default, and a file interpreted in the wrong unit comes out 25.4× too large or too small, with no error message, because nothing in the format flags the mismatch.

**No formal solid validation.** STL happily stores triangle soup that doesn't form a valid closed volume — gaps, overlapping faces, inverted normals, all technically legal STL content. The format itself has no concept of "this must be a proper solid," which is part of why non-manifold geometry is such a common downstream headache: the file format that carried it never checked.

**No color or material data**, beyond an unofficial, inconsistently-supported extension a few tools use for per-triangle color. If you need to preserve color or material assignment, standard STL simply can't carry it.

**Redundant, unindexed vertex data.** Every triangle stores its own three vertices independently, even when it shares an edge with a neighboring triangle. That inflates file size unnecessarily on dense meshes, compared to formats that index a shared vertex list.

## OBJ: text-based, material-aware, and older than you'd guess

OBJ (from Wavefront Technologies, also dating to the late 1980s) stores an indexed list of vertices and faces in a human-readable text format, optionally alongside a companion `.mtl` file that defines materials, colors, and texture references. Because it's plain text, an OBJ file can be opened and inspected in any text editor — genuinely useful when you're debugging why a mesh looks wrong and want to see the raw numbers.

OBJ's real advantage over STL is that it can carry material and texture information for rendering, and it supports face definitions with a shared, indexed vertex list rather than repeating coordinates per triangle. What it still lacks: any built-in unit specification (same ambiguity as STL), and — like STL — no formal requirement that the geometry represent a valid manifold solid. OBJ is a strong choice when you're moving a model into a rendering or visualization pipeline that cares about material appearance; it's a less natural fit for 3D printing workflows, where slicers are built primarily around STL and, increasingly, 3MF.

## 3MF: the format built specifically to fix STL's problems

3MF (3D Manufacturing Format) is meaningfully newer, developed by an industry consortium — including Microsoft, HP, Autodesk, and others — specifically to replace STL for additive manufacturing. Structurally, it's a ZIP archive containing XML files describing the mesh, similar in spirit to how a modern Office document is actually a ZIP full of XML under the hood.

3MF directly addresses STL's biggest gaps: it **explicitly declares its unit** in the file (millimeter, inch, or others — no more silent 25.4× errors), it **supports full color and material assignment** natively rather than through an unofficial extension, and its indexed vertex structure tends to produce smaller files than an equivalent STL for the same geometry. It's increasingly the default or preferred format for modern slicers and 3D printers, particularly for anything involving multi-color or multi-material prints, where STL simply has no mechanism to carry that information at all.

The tradeoff is ecosystem maturity: while support has grown substantially, 3MF still isn't accepted absolutely everywhere STL is, particularly in older software or specialized industrial pipelines that were built around STL as a fixed assumption.

## Where STEP fits into this comparison

It's worth placing a fourth format alongside these three, if only to clarify why it isn't a like-for-like alternative: STEP (and IGES) files describe **exact, parametric surface and solid geometry** — true curves and surfaces defined mathematically — rather than a fixed mesh of triangles. STL, OBJ, and 3MF are all fundamentally *tessellated* formats: they approximate curved surfaces with flat triangular facets, at whatever resolution was chosen at export time. A STEP file has no facets to choose a resolution for at all, since the underlying surface is stored exactly, and it only gets tessellated into triangles when something — a viewer, a slicer — actually needs to render or mesh it.

This is why converting STEP to STL is a one-way trip: you can always tessellate exact geometry into triangles, but you can't reliably go the other direction and recover exact curves from a triangle mesh. If a downstream step in your workflow ever needs to edit the *design*, not just view or print the *shape*, keeping the original STEP file around — and treating STL/OBJ/3MF exports as one-way outputs for printing or visualization — will save real rework later.

## Mesh resolution is a separate decision from format

It's worth being clear that file format and mesh resolution are two independent choices, easy to conflate because they're usually set in the same export dialog. The format determines what *kind* of data gets stored — triangles only, triangles plus materials, or triangles plus units and color — while the tessellation deflection setting (however your software labels it, often "chord height" or "resolution") determines how finely curved surfaces get approximated into those triangles, regardless of which of the three formats you're exporting to.

Too coarse a tessellation produces visibly faceted curves and, on a part meant for 3D printing, real dimensional error on any curved feature — a bore that's supposed to be round can come out as a visible 20-sided polygon if the deflection setting is too loose, undersized at every flat facet relative to the true circular bore. Too fine a tessellation produces enormous file sizes for no visible benefit past a certain point, since triangle count grows quickly as deflection tightens. A practical habit is setting deflection tight enough that curved surfaces look smooth at the part's actual physical size and viewing distance, then checking the resulting file size is still reasonable for your workflow — rather than defaulting to whatever the software ships with, which is often tuned as a generic compromise rather than for your specific part.

## A practical decision guide

**3D printing a single-color, single-material part, and you're not sure what the receiving printer or slicer supports:** STL. It's the format every slicer on earth understands, and for a simple, single-material geometry export, its missing features (color, units-in-file) don't cost you anything you needed.

**3D printing with color or multiple materials, on a slicer and printer that both support it:** 3MF. This is the situation the format was actually designed for, and it's the only one of the three that can carry that information without a separate, easy-to-lose companion file.

**Exporting into a rendering, visualization, or game pipeline that needs material and texture data:** OBJ, since its material system is well-established and broadly supported across rendering software in a way 3MF's is not, at least today.

**Exchanging engineering geometry where a receiving CAD or CAM system's compatibility is uncertain:** STL, purely for its universality — when you don't know what's on the other end, the format with the widest possible support wins, even though it's the most limited technically.

**Any workflow where unit ambiguity has caused problems before:** 3MF, specifically because it's the only one of the three that removes the ambiguity at the file-format level instead of relying on both sides agreeing on a convention out of band.

## Why this matters more than it looks like it should

None of these formats are "wrong" — they were each built for a specific era and a specific use case, and all three remain genuinely useful. The actual risk isn't picking a bad format; it's picking one on autopilot and then being surprised when a color disappears, a scale comes in 25× off, or a downstream tool rejects a file that looked fine on screen. Knowing what each format does and doesn't carry turns that surprise into a five-second decision made up front instead of a debugging session after the fact.

Every export from our [parametric part generators](/tools/spur-gear-generator/) supports STL, and the [STEP & IGES 3D Viewer](/tools/step-iges-viewer/) can convert an uploaded CAD file to STL, OBJ, or 3MF directly in your browser — all three run as genuine client-side conversions, so you can compare the output of each against your specific downstream tool without uploading anything anywhere.
