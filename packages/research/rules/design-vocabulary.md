# Design vocabulary and the measurement schema

Load this with `research.md` for steps 1.6 and 1.7, and again at 3.1 when a direction is proposed.

This file exists because of a specific failure: a direction was once proposed under the name
**"Instrument"**. That name belongs to no tradition, cannot be looked up, and a client can only nod at
it or shake their head. It was invented because there was no vocabulary to reach for.

---

## Vocabulary is not prescription

There is a real difference between two things that look similar:

| | |
|---|---|
| **A prescription** — "banking means 4px radius" | Refuse it. Taste wearing a lab coat, indefensible in a review, wrong the moment a field moves |
| **A vocabulary** — what Neobrutalism is, and how to recognise it by measuring | **This is knowledge, and it is what was missing** |

A vocabulary does not decide anything. It lets you **name what you measured** and **propose in words a
client can look up, check, and disagree with on the merits**.

---

## The nine foundations

A design system is not five numbers. It is nine, and the first one is measured as **roles**.

| # | Foundation | Record |
|---|---|---|
| 1 | **Typography** | The scale **by role** (display, heading, body, label, caption), each with size, weight, line-height, letter-spacing, and whether figures are tabular |
| 2 | **Colour** | Hue count in 30° buckets over non-neutral colour, saturation range, neutral ramp steps, semantic mapping |
| 3 | **Spacing** | Base unit (4pt or 8pt), the scale, and where it is broken |
| 4 | **Elevation** | Shadow count and depth per level, layering, transparency |
| 5 | **Motion** | Durations by register, easing curves, what animates and what does not |
| 6 | **Iconography** | Stroke or filled, weight, corner treatment, size steps |
| 7 | **Grid** | Columns, gutter, margin, max content width, per breakpoint |
| 8 | **Density** | Control heights, row heights, the ratio of content to whitespace |
| 9 | **Accessibility** | Contrast ratios, touch target sizes, focus treatment, reduced-motion support |

### Typography is roles, not sizes

Recording "16px" says nothing comparable: 16px is body in one product and a caption in another. A role
is what makes two products comparable at all, and it is what lets a scale adapt across viewports
without losing structure.

This is the same distinction as the semantic token tier, arriving from a different direction. When two
disciplines converge on one idea independently, it is usually load-bearing.

---

## The shape `measured.json` has to be in

`schema-check.mjs` reads this file, and for three releases the shape it demanded existed **only inside
the checker**. `nullReasons` appeared in no rule, no command and no example, so anyone writing the
artefact by hand produced something the gate rejected for a reason it could not explain. A check whose
input contract is undocumented is a check people route around.

**The nine foundations are top-level keys on the product, not nested under a `foundations` object.**

```json
{
  "products": [
    {
      "product": "Monzo",
      "url": "https://monzo.com",
      "method": "screenshots at two viewports, colours sampled from the capture, spacing measured against the grid",
      "shipped": true,
      "tradition": "flat",
      "traditionWhy": "",

      "typography": { "display": 32, "heading": 24, "body": 16, "label": 14, "caption": 13 },
      "colour":      "two hues plus neutrals, sampled from three screens",
      "spacing":     "4px base, steps at 4 8 12 16 24 32",
      "elevation":   "one level, 0 2 8 rgba(0,0,0,.08)",
      "motion":      null,
      "iconography": "20px stroke, 1.5 weight",
      "grid":        "12 column, 24 gutter, 1200 max",
      "density":     "44px rows on mobile, 36px on desktop tables",
      "accessibility": "contrast measured at 4.8:1 minimum on body text",

      "nullReasons": {
        "motion": "static capture only, so no timing could be measured without instrumenting the page"
      }
    }
  ]
}
```

Three rules the checker enforces and this example demonstrates:

- **A missing value is allowed. A missing value with no reason is not.** `motion: null` plus a
  `nullReasons.motion` is a measurement that was attempted and could not be made. `motion` simply absent
  is indistinguishable from a foundation nobody looked for
- **Typography is recorded by role, never as bare sizes.** The role names are the object's **keys**, and
  at least one of `display`, `heading`, `body`, `label`, `caption` has to be among them. 16px is body on
  one product and caption on another, so a list of numbers characterises nothing. A `{"roles": [...],
  "scale": [...]}` shape looks reasonable and is rejected, because the check reads the keys
- **`tradition` is required, and `"none"` needs a `traditionWhy`.** A product that follows no named
  tradition is a finding worth stating; an emptied field looks identical without the reason

`state.measured` accepts the same shape, so a project can carry the table in state rather than a
separate file.

## Named styles, and their measurable signatures

This table is for **recognising** and **naming**, never for choosing.

| Style | Recognise it by |
|---|---|
| **Flat** | No shadows, no gradients, solid fills |
| **Material** | An elevation scale with defined steps, standard motion curves, ink-on-surface metaphor |
| **Skeuomorphism** | Multi-stop gradients, texture, shadows imitating physical light |
| **Neumorphism** | Two or more shadows per element, one light and one dark, and **very low ΔL\* between fill and background** |
| **Glassmorphism** | `backdrop-filter: blur` present, fill alpha below 1, thin light borders |
| **Neobrutalism** | Hard offset shadows with **zero blur**, thick dark outlines, flat saturated colour, oversized type |
| **Minimalism** | Few hues, wide whitespace ratio, one or two type roles doing most of the work |
| **Maximalism** | High hue count, dense layering, type used as image, deliberate visual noise |
| **Editorial** | Serif or contrast-heavy display type, strong grid, image-led, magazine hierarchy |
| **International / Swiss** | Strict grid, one neutral sans, tight hue budget, alignment doing the work that decoration usually does |

**A style is a hypothesis you test by measuring.** If a product is called neobrutalist and every shadow
has a blur radius, it is not neobrutalist and saying so is the finding.

### Naming a direction

Name it against a tradition, and say where it departs:

> *"International Style discipline on the grid and the type, with Material's elevation model for the
> data tables, because the field's three leading products all use elevation to separate row groups."*

That is checkable, disputable, and researchable. `"Instrument"` is none of those things.

---

## Style assertions

A declared style adds checks to `direction.assert`. Declare neobrutalism and a blurred shadow becomes
a violation, in exactly the way a radius cap already is.

**`verify-html` enforces two halves of that, and deliberately not a third.** It reports a `style` whose
assertions say the opposite of what the style means — `neobrutalism` with `shadow.blur.max: 12`, a
`minimalism` capped at nine hues, a `maximalism` capped at two — and it reports a `style` naming no
tradition in the table below, because a name nobody can look up cannot be compared to anything or
measured against.

What it does **not** do is generate the assertions for you. This table is for recognising and naming,
never for choosing, and a check that filled in the numbers would be choosing.

`style` is optional. When it is absent the report says so, because "checked and clean" and "never ran"
are different sentences.

**Those eight are the whole vocabulary, and every one of them is evaluated.** Three were declarable and
evaluated by nothing until 0.8.0: `shadow.blur.max`, `type.roles.max` and `motion.easing.linear`. The
census carried no shadow, no easing, and nobody counted type roles, so `shadow.blur.max: 0` beside a
blurred shadow passed every gate while the style signature table read that same key. **An assertion
nobody can evaluate is worse than an absent one: it reads as a constraint and constrains nothing.**
Anything outside the eight is now reported rather than skipped.

A type role here is a distinct **size and weight pair**, which is this file's own rule about recording
typography by role rather than by size, turned on our own build instead of a competitor's.

```json
"direction": {
  "name": "International Style, Material elevation",
  "style": "international",
  "assert": {
    "radius.max": 8,
    "control.height.min": 44,
    "control.height.max": 56,
    "hue.count.max": 3,
    "shadow.blur.max": 0,
    "type.roles.max": 5,
    "numerals.tabular": true,
    "motion.easing.linear": false
  }
}
```

---

## Manner is not an input

A note-taking app reads friendly, an enterprise console reads serious, a personal portfolio reads
personal. The temptation is a table: "note app → rounded and playful".

**Refuse it. Manner is the sum of the nine foundations, not a tenth one.**

Friendly is what large radii, rounder and heavier type, higher saturation, expressive motion and
illustration *add up to*. Serious is small radii, tighter density, a narrow neutral-led palette,
productive motion, no illustration.

You do not choose a manner and derive the values. **You measure the field, and the manner is already in
the numbers.** Which is why this file has no table of manners: measuring five shipped products in the
field produces one, specific to that field, and defensible.

---

## Where to look, and the one rule about it

| Source | Gives |
|---|---|
| **Mobbin** | Real screens from shipped apps, whole flows. The most important source here |
| Land-book | Landing pages by category |
| Awwwards | Juried on quality, usability, creativity. Craft-led, often not a product |
| Page Flows | Recorded interaction flows |
| Typewolf | Type pairings in the wild |
| Dribbble, Behance | Fast visual reference, case studies |
| The client's live product | What the brand actually is |
| HIG, Material | What is mandatory on the platform |

> **Dribbble is aspiration. Mobbin is what shipped.**
>
> This flow measures, and only a shipped product can be measured: it has real constraints, real error
> states, real content lengths. A Dribbble shot has no empty state, no error, and no forty-character
> name. **Measuring a concept is measuring something that never existed.**

Concepts are still useful for one thing: seeing what a field has not tried. Cite them as concepts, and
never let a concept into the measurement table.

---

## Industry convention, recorded with its reason

Conventions are findings, not laws. **The reason is what tells you when breaking one is safe.**

| Convention | Reason |
|---|---|
| Finance, healthcare, tech lean blue and cool neutrals | Signals trust and competence |
| **Food brands almost never use blue** | It is among the least appetising colours: an indicator of spoilage |
| Food and quick service lean red and yellow | Stimulate appetite and urgency |
| Healthcare leans green and cool tones | Calming, linked to patient comfort |

Up to **90% of a snap judgement about a product can rest on colour alone**, which is why this is worth
measuring rather than assuming. Knowing *why* food avoids blue is what lets a blue food brand be a
deliberate, defensible choice instead of an accident.

**Record the convention you found in this field, from the products you measured.** Do not import the
table above as fact: it is an example of the shape, not a substitute for measuring.

---

## Definition of done

- [ ] At least 3 **shipped** products measured, named, disjoint
- [ ] All 9 foundations present per product, or `null` **with a reason**
- [ ] Typography recorded as roles, not bare sizes
- [ ] Every value carries a source URL and how it was obtained
- [ ] Every product assigned a tradition, or `"none"` with a `traditionWhy`. A deliberate "none" and an emptied field look identical without it
- [ ] An agreement / disagreement table exists
- [ ] Conventions recorded with reasons, derived from what was measured
- [ ] `schema-check.mjs` returns zero
