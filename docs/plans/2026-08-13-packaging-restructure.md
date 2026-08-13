# pica Packaging Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split pica from one plugin into four installable packages — `core`, `research`, `html`, `figma` — each declaring what it requires, produces, checks and considers done, without changing any rule's meaning or breaking existing installs.

**Architecture:** One repository, `packages/*` subdirectories, each a real plugin listed in `.claude-plugin/marketplace.json` with `dependencies`. A `package.json` per package declares the contract. A validator (`validate-packages.mjs`) enforces that every declared file exists and every shipped file is owned — it is written first and fails first, so the restructure is driven by a check rather than by inspection.

**Tech Stack:** Node ≥18 (ESM, no dependencies), Claude Code plugin manifests, Markdown rules, git.

## Global Constraints

- **No rule text may change meaning in this restructure.** Sections move verbatim. Reword nothing. A rule that changes while being moved is indistinguishable from a rule that was lost.
- **Nothing downstream of Figma is authored.** `impl-web`, `impl-ios`, `impl-android` and `e2e` are declared as contracts with `status: "coming-soon"` only — no rules, no scripts, no commands. Their content is the author's to define later.
- **Nothing is removed from the roadmap automatically.** `coming-soon` packages stay declared and are shown as `PLANNED`.
- **Existing installs must not break.** `pica` remains a listed plugin that depends on `core`, `research`, `html`, `figma`.
- **Scripts are ESM `.mjs`, zero npm dependencies**, matching the seven that ship today.
- **Every check fails closed:** exits non-zero when it cannot do its job, never reports a clean run for work it did not do.
- Version after this work: `0.6.0` in every `plugin.json` and in `marketplace.json`.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `scripts/validate-packages.mjs` | Repo-level validator: manifests parse, declared files exist, every shipped file owned exactly once |
| `packages/core/package.json` | Core contract |
| `packages/core/plugin.json` | Core plugin manifest |
| `packages/core/rules/review-discipline.md` | Medium-independent review rules extracted from `review-gates.md` |
| `packages/core/scripts/pica-status.mjs` | Reads manifests + `.pica/state.json`, prints package readiness |
| `packages/research/package.json`, `plugin.json` | Research contract + manifest |
| `packages/html/package.json`, `plugin.json` | HTML contract + manifest |
| `packages/html/rules/html-gates.md` | HTML-specific gate rules extracted from `review-gates.md` |
| `packages/figma/package.json`, `plugin.json` | Figma contract + manifest |
| `packages/figma/rules/figma-gates.md` | Figma-specific gate rules extracted from `review-gates.md` |
| `packages/_planned/impl-web.package.json` etc. | Declared-only contracts, `status: "coming-soon"` |

**Modified:** `.claude-plugin/marketplace.json`, `skills/design-flow/SKILL.md`, `README.md`, `CHANGELOG.md`.

**Deleted at the end of Task 6:** `skills/design-flow/rules/review-gates.md` (its content lives in three files by then).

---

## Task 1: The validator, failing

**Files:**
- Create: `scripts/validate-packages.mjs`

**Interfaces:**
- Produces: CLI `node scripts/validate-packages.mjs`. Exit 0 = valid, 1 = findings, 2 = cannot run. Reads `packages/*/package.json`.

- [ ] **Step 1: Write the validator**

```js
/**
 * validate-packages.mjs — the restructure's own check.
 *
 * Asserts four things, each of which was a real failure mode in earlier pica releases:
 *   1. every package.json parses and has the required fields
 *   2. every file a package CLAIMS to own actually exists
 *   3. every shipped rule/script/command is owned by exactly one package
 *   4. every declared check resolves to a script that exists
 *
 * Fails closed: zero packages found is an error, not a pass.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PKG_DIR = path.join(ROOT, "packages");
const REQUIRED = ["name", "status", "description", "owns", "requires", "produces", "checks", "definitionOfDone"];
const VALID_STATUS = ["stable", "coming-soon"];
const findings = [];

if (!fs.existsSync(PKG_DIR)) {
  console.error("FAIL  packages/ does not exist. Nothing to validate.");
  process.exit(2);
}

const dirs = fs.readdirSync(PKG_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

if (!dirs.length) {
  console.error("FAIL  packages/ contains no packages. A validator that validates nothing is not a pass.");
  process.exit(2);
}

const owned = new Map();   // repo-relative path -> package name

for (const name of dirs) {
  const manifestPath = path.join(PKG_DIR, name, "package.json");
  if (!fs.existsSync(manifestPath)) { findings.push(`${name}: no package.json`); continue; }

  let m;
  try { m = JSON.parse(fs.readFileSync(manifestPath, "utf8")); }
  catch (e) { findings.push(`${name}: package.json does not parse — ${e.message}`); continue; }

  for (const f of REQUIRED) if (!(f in m)) findings.push(`${name}: missing required field "${f}"`);
  if (m.name !== name) findings.push(`${name}: manifest name is "${m.name}", directory is "${name}"`);
  if (!VALID_STATUS.includes(m.status)) findings.push(`${name}: status "${m.status}" is not one of ${VALID_STATUS.join(", ")}`);

  for (const kind of ["commands", "rules", "scripts"]) {
    for (const file of (m.owns?.[kind] || [])) {
      const rel = path.join("packages", name, kind, file);
      if (!fs.existsSync(path.join(ROOT, rel))) findings.push(`${name}: owns ${kind}/${file}, which does not exist`);
      if (owned.has(rel)) findings.push(`${rel} is owned by both ${owned.get(rel)} and ${name}`);
      owned.set(rel, name);
    }
  }

  for (const c of (m.checks || [])) {
    if (!c.run || !c.passes) { findings.push(`${name}: a check is missing "run" or "passes"`); continue; }
    const rel = path.join("packages", name, "scripts", c.run);
    if (!fs.existsSync(path.join(ROOT, rel))) findings.push(`${name}: check "${c.run}" has no script at ${rel}`);
  }

  for (const d of (m.definitionOfDone || [])) {
    if (!["check", "human", "gate", "artifact"].includes(d.type))
      findings.push(`${name}: definitionOfDone entry has invalid type "${d.type}"`);
    if (d.type === "human" && d.run)
      findings.push(`${name}: a "human" definition-of-done item must not name a script — that is the point of the type`);
  }
}

/* Every shipped file must be owned. An orphan means a rule nobody is responsible for. */
for (const name of dirs) {
  for (const kind of ["commands", "rules", "scripts"]) {
    const dir = path.join(PKG_DIR, name, kind);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const rel = path.join("packages", name, kind, f);
      if (!owned.has(rel)) findings.push(`${rel} exists but no package.json claims it`);
    }
  }
}

console.log(`packages: ${dirs.join(", ")}`);
console.log(`files owned: ${owned.size}`);
for (const f of findings) console.log(`FINDING  ${f}`);
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node scripts/validate-packages.mjs`
Expected: `FAIL  packages/ does not exist. Nothing to validate.` and exit code 2. Confirm with `echo $?`.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-packages.mjs
git commit -m "Add package validator, which fails until packages exist"
```

---

## Task 2: Core package, manifest and directories

**Files:**
- Create: `packages/core/package.json`, `packages/core/plugin.json`
- Create dirs: `packages/core/{commands,rules,scripts}`
- Move: `commands/pica.md`, `commands/pica-close.md`, `commands/pica-feedback.md` → `packages/core/commands/`
- Move: `hooks/` → `packages/core/hooks/`

**Interfaces:**
- Produces: package `core`, owning all gates. Every other package's `requires.gates` resolves against gates core writes into `.pica/state.json`.

- [ ] **Step 1: Create the directories and move core's files with git mv**

```bash
mkdir -p packages/core/{commands,rules,scripts}
git mv commands/pica.md packages/core/commands/pica.md
git mv commands/pica-close.md packages/core/commands/pica-close.md
git mv commands/pica-feedback.md packages/core/commands/pica-feedback.md
git mv hooks packages/core/hooks
```

- [ ] **Step 2: Write `packages/core/package.json`**

```json
{
  "name": "core",
  "status": "stable",
  "description": "Intake, the contract, the state schema and every gate. Required by every other package.",
  "owns": {
    "commands": ["pica.md", "pica-close.md", "pica-feedback.md"],
    "rules": ["review-discipline.md"],
    "scripts": ["pica-status.mjs"]
  },
  "requires": { "state": [], "artifacts": [], "gates": [] },
  "produces": {
    "state": ["contract", "exclusions", "viewports", "figmaInScope", "tier", "delivered", "gates"],
    "artifacts": ["docs/contract.md", "docs/exclusions.md", ".pica/state.json"]
  },
  "checks": [],
  "definitionOfDone": [
    { "type": "artifact", "path": "docs/contract.md" },
    { "type": "artifact", "path": "docs/exclusions.md" },
    { "type": "human", "says": "the human approved the contract, exclusions, options and tiers" },
    { "type": "gate", "grants": "intakeApproved" }
  ]
}
```

- [ ] **Step 3: Write `packages/core/plugin.json`**

```json
{
  "name": "pica-core",
  "description": "pica core: intake, the contract, the state schema, and every approval gate.",
  "version": "0.6.0",
  "author": { "name": "Dung Vuong" },
  "homepage": "https://github.com/vqdungwork/pica",
  "repository": "https://github.com/vqdungwork/pica",
  "license": "MIT",
  "commands": ["./commands"],
  "hooks": "./hooks/hooks.json",
  "keywords": ["design", "workflow", "handoff"]
}
```

- [ ] **Step 4: Run the validator to see the new, more specific failure**

Run: `node scripts/validate-packages.mjs`
Expected: exit 1, with findings including `core: owns rules/review-discipline.md, which does not exist` and `core: owns scripts/pica-status.mjs, which does not exist`. These are fixed in Tasks 3 and 7. Confirm the validator no longer exits 2.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Create core package: intake, closeout, feedback, hooks"
```

---

## Task 3: Split review-gates.md — core's share

**Files:**
- Create: `packages/core/rules/review-discipline.md`
- Modify: `skills/design-flow/rules/review-gates.md` (sections removed as they are moved)

**Interfaces:**
- Produces: `review-discipline.md`, referenced by `packages/core/package.json` and later by every other package's rules.

**Context the implementer needs:** `review-gates.md` is 685 lines with 30 `##` sections. This task moves the **23 medium-independent** ones. Two `###` subsections — *A check must fail closed* (line 464) and *Every named check must ship* (line 483) — currently sit nested under *The measured HTML gate*; they are general principles, so they must be **promoted to `##`** and moved here, while their parent section stays behind for Task 4.

- [ ] **Step 1: Create the file with its header, then move these sections verbatim**

Create `packages/core/rules/review-discipline.md` starting with:

```markdown
# Review discipline

Medium-independent. These rules hold whether you are reviewing HTML, a Figma file, or
anything else pica grows to cover. Package-specific gates live with their package:
`html-gates.md` and `figma-gates.md`.
```

Then move these 23 sections **verbatim, no rewording**, in this order:

1. `## Report is the default`
2. `## The self-review, which is different`
3. `## The panel, for complex packages only`
4. `## Audit integrity`
5. `## Trust the data over the render, and the render over your memory`
6. `## Always read the font family and style distribution`
7. `## The blind spot has a shape: space that should not be there`
8. `## Never assert a proxy`
9. `## Measure the state the product can actually enter`
10. `## Verify a new check by reintroducing the defect it was written for`
11. `## Check the probe before believing the result`
12. `## Contrast: compute, do not sample`
13. `## Pixel sampling: only near native resolution`
14. `## Screenshots in isolation cannot judge contrast`
15. `## Colour needs measuring, and the interpolation space is part of the design`
16. `## Editing safely is part of verification`
17. `## Recount every number you publish`
18. `## A check must fail closed` *(promoted from `###`)*
19. `## Every named check must ship` *(promoted from `###`)*
20. `## Measurement and review find different defects. Neither substitutes for the other.`
21. `## Calibrate the tolerance, or the check fires forever`
22. `## A structural check is only as good as its model of legitimate difference`
23. `## A green check is not evidence the check works`

- [ ] **Step 2: Verify nothing was lost or reworded**

```bash
# Section count. review-gates.md has 30 "##" sections and 2 "###" subsections.
# Core takes 21 of the "##" plus both promoted "###", so it ends with 23 "##".
# What remains is html's 3 and figma's 6 = 9.
grep -c '^## ' packages/core/rules/review-discipline.md   # expect 23
grep -c '^## ' skills/design-flow/rules/review-gates.md   # expect 9
grep -c '^### ' skills/design-flow/rules/review-gates.md  # expect 0 — both were promoted

# No text changed: every moved heading must appear exactly once across the two files
diff <(git show HEAD:skills/design-flow/rules/review-gates.md | grep '^## \|^### ' | sed 's/^#*  *//' | sort) \
     <(cat packages/core/rules/review-discipline.md skills/design-flow/rules/review-gates.md | grep '^## ' | sed 's/^#*  *//' | sort)
```

Expected: the section counts match, and `diff` reports no differences. A difference means a heading was reworded or dropped.

- [ ] **Step 3: Verify total line count is conserved**

```bash
ORIG=$(git show HEAD:skills/design-flow/rules/review-gates.md | wc -l)
NOW=$(( $(wc -l < packages/core/rules/review-discipline.md) + $(wc -l < skills/design-flow/rules/review-gates.md) ))
echo "original $ORIG, now $NOW (expect NOW = ORIG + 5 header lines)"
```

Expected: `NOW` exceeds `ORIG` by exactly the 5 header lines added in Step 1. Any other difference means content was lost.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Split review-gates.md: move 23 medium-independent sections into core"
```

---

## Task 4: HTML package, with its gates

**Files:**
- Create: `packages/html/{package.json,plugin.json}`, `packages/html/rules/html-gates.md`
- Move: `commands/pica-wp.md` → `packages/html/commands/`
- Move: `skills/design-flow/rules/html-prototype.md` → `packages/html/rules/`
- Move: `capture-html-reference.mjs`, `verify-html.mjs`, `parity-check.mjs`, `flow-check.mjs` → `packages/html/scripts/`

- [ ] **Step 1: Move the files**

```bash
mkdir -p packages/html/{commands,rules,scripts}
git mv commands/pica-wp.md packages/html/commands/pica-wp.md
git mv skills/design-flow/rules/html-prototype.md packages/html/rules/html-prototype.md
for s in capture-html-reference.mjs verify-html.mjs parity-check.mjs flow-check.mjs; do
  git mv skills/design-flow/scripts/$s packages/html/scripts/$s
done
```

- [ ] **Step 2: Create `packages/html/rules/html-gates.md`** with this header, then move 3 sections verbatim from `review-gates.md`

```markdown
# HTML gates

The gates the html package owns. Medium-independent review discipline is in core's
`review-discipline.md`, which these assume.
```

Move verbatim: `## The measured HTML gate`, `## The flow gate`, `## The viewport parity check`.

- [ ] **Step 3: Write `packages/html/package.json`**

```json
{
  "name": "html",
  "status": "stable",
  "description": "The UI kit and work packages in HTML at every declared viewport, and the measured gate before approval.",
  "owns": {
    "commands": ["pica-wp.md"],
    "rules": ["html-prototype.md", "html-gates.md"],
    "scripts": ["capture-html-reference.mjs", "verify-html.mjs", "parity-check.mjs", "flow-check.mjs"]
  },
  "requires": {
    "state": ["viewports"],
    "artifacts": ["tokens/tokens.css"],
    "gates": ["intakeApproved"]
  },
  "produces": {
    "state": ["packages.html.built"],
    "artifacts": ["html/", ".audit/html-reference.json"]
  },
  "checks": [
    { "run": "verify-html.mjs",  "passes": "0 findings across viewport-tagged, overflow, tall-screen-pair, viewport-coverage" },
    { "run": "parity-check.mjs", "passes": "0 findings, nominal and structural" },
    { "run": "flow-check.mjs",   "passes": "0 findings, or --allow-none for a boards-only package" }
  ],
  "definitionOfDone": [
    { "type": "check", "run": "verify-html.mjs",  "passes": "0 findings" },
    { "type": "check", "run": "parity-check.mjs", "passes": "0 findings" },
    { "type": "check", "run": "flow-check.mjs",   "passes": "0 findings" },
    { "type": "human", "says": "every frame rendered and looked at, per viewport, after the last change" },
    { "type": "human", "says": "the main flow clicked end to end" },
    { "type": "gate",  "grants": "htmlApproved:<wp>" }
  ]
}
```

- [ ] **Step 4: Write `packages/html/plugin.json`**

```json
{
  "name": "pica-html",
  "description": "pica html: build each work package at every declared viewport and measure it before approval.",
  "version": "0.6.0",
  "author": { "name": "Dung Vuong" },
  "homepage": "https://github.com/vqdungwork/pica",
  "repository": "https://github.com/vqdungwork/pica",
  "license": "MIT",
  "commands": ["./commands"],
  "dependencies": ["pica-core"],
  "keywords": ["design", "html", "prototype"]
}
```

- [ ] **Step 5: Verify the moved scripts still run**

```bash
node packages/html/scripts/verify-html.mjs   # expect usage error, exit 2
node packages/html/scripts/parity-check.mjs  # expect usage error, exit 2
node packages/html/scripts/flow-check.mjs    # expect usage error, exit 2
```

Expected: each prints its usage line and exits non-zero. A script that exits 0 with no arguments has lost its fail-closed behaviour and must be fixed before continuing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Create html package: work packages, the measured gate, parity and flow checks"
```

---

## Task 5: Figma package, with its gates

**Files:**
- Create: `packages/figma/{package.json,plugin.json}`, `packages/figma/rules/figma-gates.md`
- Move: `commands/pica-port.md`, `commands/pica-prototype.md`, `commands/pica-review.md` → `packages/figma/commands/`
- Move: `figma-screens.md`, `figma-elements.md`, `figma-mcp.md` → `packages/figma/rules/`
- Move: `geometry-diff.mjs`, `figma-audit.js`, `capture-baseline.js` → `packages/figma/scripts/`

- [ ] **Step 1: Move the files**

```bash
mkdir -p packages/figma/{commands,rules,scripts}
for c in pica-port.md pica-prototype.md pica-review.md; do git mv commands/$c packages/figma/commands/$c; done
for r in figma-screens.md figma-elements.md figma-mcp.md; do git mv skills/design-flow/rules/$r packages/figma/rules/$r; done
for s in geometry-diff.mjs figma-audit.js capture-baseline.js; do git mv skills/design-flow/scripts/$s packages/figma/scripts/$s; done
```

- [ ] **Step 2: Create `packages/figma/rules/figma-gates.md`** with this header, then move 6 sections verbatim

```markdown
# Figma gates

The gates the figma package owns. Medium-independent review discipline is in core's
`review-discipline.md`, which these assume.
```

Move verbatim: `## Match by text content, compare position only`, `## Capture element boxes too`, `## Force a common font while diffing layout`, `## A binding that changes appearance is a defect`, `## A position diff cannot detect absence`, `## Deviating from the HTML`.

- [ ] **Step 3: Verify `review-gates.md` is now empty of sections and delete it**

```bash
grep -c '^## ' skills/design-flow/rules/review-gates.md   # expect 0
git rm skills/design-flow/rules/review-gates.md
```

Expected: 0 sections remain. If any remain, they were not classified — stop and classify them before deleting.

- [ ] **Step 4: Write `packages/figma/package.json`**

```json
{
  "name": "figma",
  "status": "stable",
  "description": "Port an approved package to Figma, annotate it, and verify it against the HTML by measurement.",
  "owns": {
    "commands": ["pica-port.md", "pica-prototype.md", "pica-review.md"],
    "rules": ["figma-screens.md", "figma-elements.md", "figma-mcp.md", "figma-gates.md"],
    "scripts": ["geometry-diff.mjs", "figma-audit.js", "capture-baseline.js"]
  },
  "requires": {
    "state": ["viewports", "figmaInScope=true"],
    "artifacts": [".audit/html-reference.json"],
    "gates": ["htmlApproved:<wp>"]
  },
  "produces": {
    "state": ["packages.figma.ported", "packages.figma.annotated"],
    "artifacts": [".audit/figma-dump.json"]
  },
  "checks": [
    { "run": "geometry-diff.mjs", "passes": "0 findings above tolerance AND more than 0 text runs compared" },
    { "run": "figma-audit.js",    "passes": "every count returns 0" }
  ],
  "definitionOfDone": [
    { "type": "check", "run": "geometry-diff.mjs", "passes": "0 findings" },
    { "type": "check", "run": "figma-audit.js",    "passes": "0 findings" },
    { "type": "human", "says": "every frame rendered and looked at, after the last change" },
    { "type": "gate",  "grants": "figmaVerified:<wp>" }
  ]
}
```

Note: `annotation-check.mjs` from the spec (D2) is **not** included. It does not exist yet, and the validator would reject a check with no script — correctly. It is a separate piece of work.

- [ ] **Step 5: Write `packages/figma/plugin.json`**

```json
{
  "name": "pica-figma",
  "description": "pica figma: port an approved package, annotate it, verify it against the HTML by measurement.",
  "version": "0.6.0",
  "author": { "name": "Dung Vuong" },
  "homepage": "https://github.com/vqdungwork/pica",
  "repository": "https://github.com/vqdungwork/pica",
  "license": "MIT",
  "commands": ["./commands"],
  "dependencies": ["pica-core", "pica-html"],
  "keywords": ["design", "figma", "handoff"]
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Create figma package: port, annotate, verify; retire review-gates.md"
```

---

## Task 6: Research package

**Files:**
- Create: `packages/research/{package.json,plugin.json}`
- Move: `skills/design-flow/rules/research.md` → `packages/research/rules/`

- [ ] **Step 1: Move and write the manifests**

```bash
mkdir -p packages/research/rules
git mv skills/design-flow/rules/research.md packages/research/rules/research.md
```

`packages/research/package.json`:

```json
{
  "name": "research",
  "status": "stable",
  "description": "Audit the sources named in the contract and derive tokens with provenance recorded per token.",
  "owns": { "commands": [], "rules": ["research.md"], "scripts": [] },
  "requires": { "state": [], "artifacts": ["docs/contract.md"], "gates": ["intakeApproved"] },
  "produces": { "state": ["packages.research.tokensDerived"], "artifacts": ["tokens/tokens.json", "tokens/tokens.css"] },
  "checks": [],
  "definitionOfDone": [
    { "type": "artifact", "path": "tokens/tokens.json" },
    { "type": "artifact", "path": "tokens/tokens.css" },
    { "type": "human", "says": "every token records its source and whether it was taken or derived" },
    { "type": "gate",  "grants": "tokensApproved" }
  ]
}
```

`packages/research/plugin.json`:

```json
{
  "name": "pica-research",
  "description": "pica research: audit the named sources and derive tokens with provenance.",
  "version": "0.6.0",
  "author": { "name": "Dung Vuong" },
  "homepage": "https://github.com/vqdungwork/pica",
  "repository": "https://github.com/vqdungwork/pica",
  "license": "MIT",
  "dependencies": ["pica-core"],
  "keywords": ["design", "tokens", "audit"]
}
```

- [ ] **Step 2: Run the validator — it should now pass except for core's missing status script**

Run: `node scripts/validate-packages.mjs`
Expected: exit 1 with exactly one finding — `core: owns scripts/pica-status.mjs, which does not exist`. Any other finding must be fixed now.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Create research package: audit and token provenance"
```

---

## Task 7: The status resolver, and the validator goes green

**Files:**
- Create: `packages/core/scripts/pica-status.mjs`

**Interfaces:**
- Consumes: `packages/*/package.json` (Task 2, 4, 5, 6), `.pica/state.json` written by core.
- Produces: CLI `node packages/core/scripts/pica-status.mjs [state.json]`. Exit 0 always — it is a report, not a gate.

- [ ] **Step 1: Write the resolver**

```js
/**
 * pica-status.mjs — what can run now, what is blocked, and why.
 *
 * A report, never a gate: it exits 0 even when everything is blocked, because its job is
 * to explain state, not to enforce it. Enforcement lives in each command's requires check
 * and in the write-gate hook.
 */
import fs from "fs";
import path from "path";

const statePath = process.argv[2] || ".pica/state.json";
const PKG_DIR = path.join(process.cwd(), "packages");

if (!fs.existsSync(PKG_DIR)) { console.error("no packages/ directory"); process.exit(2); }
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};
const gates = state.gates || {};

const has = (g) => Boolean(gates[g]?.granted);
const stateHas = (expr) => {
  const [key, want] = expr.split("=");
  const val = key.split(".").reduce((o, k) => (o == null ? o : o[k]), state);
  if (want === undefined) return val !== undefined && val !== null;
  return String(val) === want;
};

const rows = [];
for (const name of fs.readdirSync(PKG_DIR).filter((d) => !d.startsWith("_"))) {
  const mp = path.join(PKG_DIR, name, "package.json");
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, "utf8"));

  if (m.status === "coming-soon") { rows.push({ name, verdict: "PLANNED", missing: [] }); continue; }

  const missing = [];
  for (const g of (m.requires?.gates || [])) if (!has(g)) missing.push(`gate ${g}`);
  for (const s of (m.requires?.state || [])) if (!stateHas(s)) missing.push(`state ${s}`);
  for (const a of (m.requires?.artifacts || [])) if (!fs.existsSync(a)) missing.push(`artifact ${a}`);

  rows.push({ name, verdict: missing.length ? "BLOCKED" : "READY", missing });
}

for (const r of rows) {
  console.log(`${r.verdict.padEnd(8)} ${r.name}`);
  for (const m of r.missing) console.log(`         missing ${m}`);
}
console.log(`\n${rows.filter((r) => r.verdict === "READY").length} ready, `
          + `${rows.filter((r) => r.verdict === "BLOCKED").length} blocked, `
          + `${rows.filter((r) => r.verdict === "PLANNED").length} planned.`);
```

- [ ] **Step 2: Run the validator and confirm it is green**

Run: `node scripts/validate-packages.mjs`
Expected: `0 finding(s).` and exit 0. Confirm with `echo $?`.

- [ ] **Step 3: Test the resolver against empty state**

Run: `node packages/core/scripts/pica-status.mjs /dev/null 2>/dev/null || node packages/core/scripts/pica-status.mjs .pica/state.json`

With no state file, expected: `core` READY, and `research`, `html`, `figma` BLOCKED with their missing gates named. This proves `requires` actually blocks rather than decorating.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add pica-status resolver; package validator now returns zero"
```

---

## Task 8: Declared-only packages for the path past Figma

**Files:**
- Create: `packages/_planned/impl-web.package.json`, `impl-ios.package.json`, `impl-android.package.json`, `e2e.package.json`

**Context:** these live under `packages/_planned/` — which the validator skips, because directories starting with `_` are excluded. They are contracts, not packages. **No rules, no scripts, no commands are authored for them; that content is the author's to define later.**

- [ ] **Step 1: Write the four contracts**

`packages/_planned/impl-ios.package.json` (the other three follow the same shape, changing `name`, `description` and platform):

```json
{
  "name": "impl-ios",
  "status": "coming-soon",
  "description": "Implement the verified design as a native iOS application. Contract only — content to be defined by the author.",
  "owns": { "commands": [], "rules": [], "scripts": [] },
  "requires": {
    "state": [],
    "artifacts": [],
    "gates": ["figmaVerified:<wp>"]
  },
  "produces": { "state": ["packages.impl-ios.built"], "artifacts": [] },
  "checks": [],
  "definitionOfDone": []
}
```

`packages/_planned/e2e.package.json`:

```json
{
  "name": "e2e",
  "status": "coming-soon",
  "description": "End-to-end tests against a built application, one per platform. Contract only — content to be defined by the author.",
  "owns": { "commands": [], "rules": [], "scripts": [] },
  "requires": { "state": [], "artifacts": [], "gates": [] },
  "produces": { "state": ["packages.e2e.reported"], "artifacts": [] },
  "checks": [],
  "definitionOfDone": []
}
```

- [ ] **Step 2: Confirm the validator still returns zero**

Run: `node scripts/validate-packages.mjs`
Expected: `0 finding(s).`, and the `_planned` contracts are not listed among validated packages.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Declare the packages past Figma as contracts only"
```

---

## Task 9: Wire the marketplace, keep existing installs working

**Files:**
- Modify: `.claude-plugin/marketplace.json`
- Modify: `.claude-plugin/plugin.json` (the bundle)

- [ ] **Step 1: Rewrite `.claude-plugin/marketplace.json`**

```json
{
  "name": "pica",
  "description": "Design workflow for Claude Code: prototype in HTML, port to Figma on approval, verify by measurement",
  "owner": { "name": "Dung Vuong" },
  "plugins": [
    { "name": "pica",          "source": "./",                  "version": "0.6.0", "description": "Everything below, as one install. Depends on the four packages." },
    { "name": "pica-core",     "source": "./packages/core",     "version": "0.6.0", "description": "Intake, the contract, the state schema and every gate." },
    { "name": "pica-research", "source": "./packages/research", "version": "0.6.0", "description": "Audit the named sources and derive tokens with provenance." },
    { "name": "pica-html",     "source": "./packages/html",     "version": "0.6.0", "description": "Work packages in HTML at every viewport, measured before approval." },
    { "name": "pica-figma",    "source": "./packages/figma",    "version": "0.6.0", "description": "Port an approved package to Figma and verify it by measurement." }
  ]
}
```

- [ ] **Step 2: Turn the root `plugin.json` into the bundle**

```json
{
  "name": "pica",
  "description": "A design workflow for Claude Code. Installs the full set: intake, research, HTML, and Figma.",
  "version": "0.6.0",
  "author": { "name": "Dung Vuong" },
  "homepage": "https://github.com/vqdungwork/pica",
  "repository": "https://github.com/vqdungwork/pica",
  "license": "MIT",
  "dependencies": ["pica-core", "pica-research", "pica-html", "pica-figma"],
  "keywords": ["design", "figma", "ui", "ux", "design-system", "prototype", "handoff"]
}
```

- [ ] **Step 3: Verify every manifest parses and every source path exists**

```bash
node -e '
const fs=require("fs");
const m=JSON.parse(fs.readFileSync(".claude-plugin/marketplace.json","utf8"));
let bad=0;
for (const p of m.plugins) {
  const f=p.source==="./" ? ".claude-plugin/plugin.json" : p.source+"/plugin.json";
  if(!fs.existsSync(f)){console.log("MISSING",f);bad++;continue;}
  const j=JSON.parse(fs.readFileSync(f,"utf8"));
  if(j.version!==p.version){console.log("VERSION SKEW",p.name,j.version,"vs",p.version);bad++;}
}
console.log(bad?bad+" problem(s)":"all "+m.plugins.length+" plugins resolve, versions agree");
process.exit(bad?1:0);'
```

Expected: `all 5 plugins resolve, versions agree`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "List the four packages in the marketplace; pica becomes the bundle"
```

---

## Task 10: Update the documentation to describe packages

**Files:**
- Modify: `skills/design-flow/SKILL.md` — the Scripts section paths, and a new Packages section
- Modify: `README.md` — install section, offering the bundle or individual packages
- Modify: `CHANGELOG.md` — the `0.6.0` entry

- [ ] **Step 1: Add a Packages section to `SKILL.md` after "The flow"**

```markdown
## Packages

pica is four packages plus a bundle. Each declares what it requires, produces, checks and
considers done, in its own `package.json`.

| Package | Depends on | Owns |
|---|---|---|
| `pica-core` | — | intake, closeout, feedback, the state schema, every gate |
| `pica-research` | core | the source audit and token provenance |
| `pica-html` | core | work packages at every viewport, and the measured gate |
| `pica-figma` | core, html | the port, annotations, and the geometry diff |

`pica` installs all four. A project that will never touch Figma installs `pica-html` and
never sees the Figma half.

**No package may grant a gate it benefits from.** `html` requests `htmlApproved`; core
grants it on human approval; `figma` requires it and cannot grant it. Run
`node packages/core/scripts/pica-status.mjs` to see what is ready and what is blocked.

The path past Figma — implementation for web, iOS and Android, then end-to-end testing —
is declared in `packages/_planned/` as contracts only. Those are not built.
```

- [ ] **Step 2: Update every script path referenced in `SKILL.md` and the command files**

```bash
grep -rn 'skills/design-flow/scripts/' packages/ skills/ README.md
```

Replace each with its new location: `capture-html-reference.mjs`, `verify-html.mjs`, `parity-check.mjs`, `flow-check.mjs` → `packages/html/scripts/`; `geometry-diff.mjs`, `figma-audit.js`, `capture-baseline.js` → `packages/figma/scripts/`.

- [ ] **Step 3: Verify no stale path survives**

```bash
grep -rn 'skills/design-flow/scripts/\|skills/design-flow/rules/' packages/ skills/ commands/ README.md CHANGELOG.md 2>/dev/null | grep -v CHANGELOG
```

Expected: no output. Hits in `CHANGELOG.md` are historical and correct — earlier releases genuinely had those paths.

- [ ] **Step 4: Add the `0.6.0` CHANGELOG entry**

```markdown
## 0.6.0

pica becomes four packages — `core`, `research`, `html`, `figma` — plus a bundle that
installs all of them, so an existing install keeps working unchanged.

Each package declares what it requires, what it produces, which checks it owns and what
done means for it. `requires` is what makes omitting a package safe: a package refuses to
start when its inputs are missing and names which. `definitionOfDone` items are typed,
and a `human` item cannot be satisfied by any script — the schema rejects one that names
a script, because ten green harnesses and four screenshot-obvious defects on the fourth
source project is what that type exists to prevent.

`review-gates.md` is retired. Its 685 lines are split three ways: 23 medium-independent
sections into core's `review-discipline.md`, three HTML gates into `html-gates.md`, six
Figma gates into `figma-gates.md`. Sections moved verbatim; no rule changed meaning.

New: `scripts/validate-packages.mjs` asserts every declared file exists and every shipped
file is owned exactly once, and `packages/core/scripts/pica-status.mjs` reports what is
ready and what is blocked and why.

The path past Figma is declared in `packages/_planned/` as contracts with no content.
Those packages are planned, not built, and are shown as `PLANNED` everywhere they appear.

### Known limits

- No package has been exercised as a separate install on a real project yet. The split is
  verified structurally — the validator returns zero, every script still fails closed —
  not by having run a project through four separately installed plugins.
- `annotation-check.mjs`, required by the spec's D2, is not built. The Figma package
  declares no check for annotations, so a missing annotation is currently invisible.
```

- [ ] **Step 5: Final verification, all checks together**

```bash
node scripts/validate-packages.mjs                        # expect 0 findings, exit 0
node packages/core/scripts/pica-status.mjs                # expect core READY, others BLOCKED
for s in packages/html/scripts/*.mjs packages/figma/scripts/*.mjs; do node --check "$s" || echo "SYNTAX FAIL $s"; done
python3 -m py_compile packages/core/hooks/gate-figma-write && echo "hook compiles"
node -e 'JSON.parse(require("fs").readFileSync(".claude-plugin/marketplace.json","utf8"));console.log("marketplace valid")'
```

Expected: validator 0 findings; status shows core ready and the rest blocked; every script compiles; hook compiles; marketplace parses.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Document the package split; 0.6.0"
```

---

## Self-Review

**Spec coverage.** Every section of `docs/specs/2026-08-13-pica-packages-design.md` that falls in scope has a task: the contract (Tasks 2, 4, 5, 6), the package list (2, 4, 5, 6), state and gates (2, 7), definition of done as typed data (2, 4, 5, 6, validated in 1), migration order (2→9), `coming-soon` contracts (8), the bundle (9). D2's annotation work is **deliberately out of scope** — `annotation-check.mjs` does not exist, and Task 5 says so rather than declaring a check with no script. Review agents (spec section "Review agents") are **not** in this plan; they are a separate piece of work and none are authored here.

**Placeholder scan.** No `TBD`, no "similar to Task N", no "add error handling". Every manifest and both scripts are given in full.

**Type consistency.** `package.json` field names are identical across all six manifests: `name`, `status`, `description`, `owns.{commands,rules,scripts}`, `requires.{state,artifacts,gates}`, `produces.{state,artifacts}`, `checks[].{run,passes}`, `definitionOfDone[].{type,run,passes,says,grants,path}`. `validate-packages.mjs` (Task 1) checks exactly these names, and `pica-status.mjs` (Task 7) reads exactly `requires.{gates,state,artifacts}` and `status`. Gate names are consistent: core grants `intakeApproved`, research grants `tokensApproved`, html grants `htmlApproved:<wp>`, figma requires `htmlApproved:<wp>` and grants `figmaVerified:<wp>`, and `impl-*` requires `figmaVerified:<wp>`.

**One risk the plan cannot remove.** Task 3 and Task 5 move prose by hand. The line-count and heading-diff checks in Task 3 Steps 2–3 catch loss and renaming, but they cannot catch a section moved into the *wrong* file. That judgement is recorded in the task text — 23 core, 3 html, 6 figma, with the two promoted `###` subsections named explicitly — and should be re-read against the file before Task 5 Step 3 deletes the original.
