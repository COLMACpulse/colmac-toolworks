# VIRIDENCE Spotlight — Render & Copy Worklist

COMPLETE: all 30 products have full spotlights — 29 hero renders plus VIRIDENCE's generated deviation panel. The fields and template below are kept for reference and future edits.

## What each product needs

Per product, add these fields to its object (all optional except where noted — but the more you fill, the richer the spotlight):

- **`sev`** — 0 to 5. Drives the severity bar, the pointer, and the green/red status banner. Pick a number that reads true for the tool. (This is the one that makes the readout mean something.)
- **`v`** — version badge, e.g. `"v1"`, `"v2.6"`.
- **`tag`** — short tagline under the name. Falls back to the one-liner if blank.
- **`long`** — the "What it does" paragraph. 2 to 4 sentences, your voice.
- **`solves`** — the "What it solves" paragraph. Name the pain the buyer feels.
- **`caps`** — 3 to 4 capability bullets, as a list.
- **`render`** — OPTIONAL. A hero image filename (your ChatGPT render) like `"batchprep-hero.png"`. Drop the .png next to index.html and the panel shows it instead of the generated one. Leave it out and the generated deviation panel runs — which already looks finished, so renders are polish, not required.

## Fill template (copy one block per product)

```js
{name:"MAG DUMP", sub:"...existing...", price:"$49", a:"#e05a78", buy:"",
 v:"v1", sev:3, tag:"Short tagline here",
 long:"What it does, 2 to 4 sentences.",
 solves:"The pain it removes.",
 caps:["Capability one","Capability two","Capability three","Capability four"]},
```

Keep the existing `name / sub / price / a / buy` exactly as they are — just append the new fields. Send the filled blocks back stacked and I paste them in, or you drop them in yourself.

---

## The list

### Engines · 11 of 11 done — line complete
- [x] THOUGHT VAULT — render + copy
- [x] MAG DUMP — render + copy (card line realigned to the "dump & organize" story)
- [x] BATCH PREP — render + copy
- [x] DROPZONE ACTION — render + copy
- [x] DOWNLOADS ENGINE — render + copy
- [x] LOCAL RETRIEVAL — render + copy
- [x] REPO ALIGNMENT — render + copy
- [x] TEXT NORMALIZATION — render + copy (has a live demo)
- [x] MAG FINDER — render + copy (card line realigned from duplicate-finder to signal-finder)
- [x] TRUE DIFF — render + copy
- [x] TRUTHSOURCE — render + copy

### Field Scopes · 12 of 12 done — line complete
- [x] LAWNSCOPE — render + copy
- [x] HVACSCOPE — render + copy
- [x] ELECTROSCOPE — render + copy
- [x] LEAKSCOPE — render + copy
- [x] POOLSCOPE — render + copy
- [x] GROUNDSCOPE — render + copy (corrected spelling render swapped in)
- [x] SURFACESCOPE — render + copy
- [x] WINDOWSCOPE — render + copy
- [x] PAINTSCOPE — render + copy
- [x] DRYWALLSCOPE — render + copy
- [x] CARPETSCOPE — render + copy
- [x] CABINETSCOPE — render + copy

### VIRIDENCE · 1 of 1 done
- [x] VIRIDENCE — done (sev 4, has demo)

### The Writers' Bench · 6 of 6 done — line complete
- [x] StoryForge — render + copy (sub broadened to match render)
- [x] Character Capsule Builder — render + copy
- [x] Writer's Room — render + copy (**sub changed: solo capture space -> collaborative room**)
- [x] SignalScript — render + copy (**sub changed: dictation cleaner -> script-signal analyzer**)
- [x] Script Surgeon — render + copy (**sub changed: revision-control -> script analysis**)
- [x] AUTHORPRINT — render + copy (**sub changed: de-AI rewriter -> author-DNA profiler**) (has a live demo)

---

## All lines complete (30/30)
- Engines 11/11 · Field Scopes 12/12 · VIRIDENCE 1/1 · Writers' Bench 6/6
- Next: paste real Lemon Squeezy `buy` links as listings go live.
- Optional re-dos flagged: GROUNDSCOPE render has minor garbled subtitle text.

---

## Notes

- **Renders are optional.** The generated panel covers all 30 already. Only make ChatGPT hero images for the products you want to spotlight hardest.
- **Three already have demos** (TEXT NORMALIZATION, HVACSCOPE, AUTHORPRINT) — those will embed live in the spotlight the moment their copy is filled.
- **Batch it.** Send back 6 to 8 filled blocks at a time so a single paste stays small. 27 to go.
