# Figma MCP rules

The server this workflow runs on: what it costs, how to spend it, and the two calls that change how an
audit is shaped.

Load this before step 4 and any step that reads or writes Figma. It sits under
[figma-elements.md](figma-elements.md) and [figma-screens.md](figma-screens.md), which cover *what* to
build; this covers *how the tooling behaves*.

---

# Part 1: The call budget is a real constraint

Reads are rate-limited. On a small plan you will run out mid-task, and it does not fail gracefully — it
returns a paywall message where you expected data.

| Seat and plan | Limit |
|---|---|
| View or Collab, any plan | **6 per month** |
| Dev or Full, Professional | 200/day, 10/min |
| Dev or Full, Organization | 200/day, 15/min |
| Dev or Full, Enterprise | 600/day, 20/min |
| Education | its own cap, lower than Professional |

Only three tools are exempt: `add_code_connect_map`, `generate_figma_design`, `whoami`.

**`use_figma` is not exempt.** Neither is `get_design_context`, `get_metadata` or `get_screenshot`. Since
`use_figma` is how this workflow does everything, a full audit pass is expensive and a careless one is
ruinous. One review session exhausted an Education daily allowance in about seventy calls, most of them
avoidable.

## Establish the budget at intake

Run `whoami` — it is free — and record the seat and plan in `.pica/state.json`. It returns every plan the
user belongs to with the seat on each, so check the seat on the team that **owns the file**, not the first
one listed.

Then size the work to the budget:

| Budget | What fits |
|---|---|
| 6/month | read-only inspection. Do not attempt a port. |
| 200/day | one work package ported and reviewed, or one full-file audit |
| 600/day | a multi-package day |

Say the number out loud before starting. "This audit is about 12 calls" is a useful sentence; discovering
the limit at call 70 is not.

## Diagnosing a limit error

The message names the plan and says upgrade. It does not say which limit you hit, and the two have very
different remedies:

- **Per-minute.** Wait a minute and continue. Caused by firing several calls in parallel.
- **Daily or monthly.** Wait for the reset or upgrade the seat.

Retry once after a short pause to tell them apart. If the retry succeeds it was per-minute.

## Do not fan out in parallel

Parallel `use_figma` calls are the fastest way to trip the per-minute limit, and the per-minute limit is
the one that stops work mid-thought. Batch **within** one call instead of across several — see Part 2.

Sequential calls also keep the failure attributable. Four parallel writes that partly fail leave you
guessing which; four sequential ones do not.

---

# Part 2: Two calls that reshape an audit

## `page.loadAsync()` reads every page in one call

The rule in [figma-screens.md](figma-screens.md) API trap 1 — switch to a page before traversing it — is
about correctness, and it is right: an unloaded page silently skips instance children. But
`setCurrentPageAsync` can only be called **once per script**, which historically forced one call per page
and made a ten-page audit cost ten calls.

`page.loadAsync()` has no such limit. Load every page in a single script and audit the whole file at once:

```js
const findings = [];
for (const p of figma.root.children) {
  try { if (p.loadAsync) await p.loadAsync(); } catch (e) { findings.push({ page: p.name, err: 'load' }); continue; }
  for (const n of p.findAll(() => true)) { /* ... */ }
}
return findings;
```

A ten-page audit drops from ten calls to one. It works for **writes** too: a reorder on one page succeeded
while `currentPage` was another.

Two caveats:

- Do **not** use `loadAllPagesAsync`. It is unsupported here.
- If a traversal still returns suspiciously few nodes, fall back to `setCurrentPageAsync` for that page and
  compare counts. `loadAsync` has been reliable, but the failure mode of a lazy page is silence, so verify
  a count you can predict before trusting a big result.

## Screens: fetch the URL, do not inline base64

`get_screenshot` returns a short-lived URL plus a curl command by default, and that is the cheap path.
Setting `enableBase64Response: true` embeds the image and costs far more context for no extra information.
Download with curl and read the file.

Screenshot a **parent frame**, never a node in isolation, when judging anything compositional. A node
screenshot renders that node alone, so text over a photo comes back on blank white because the photo is a
sibling.

---

# Part 3: Writes

## Every `use_figma` call needs the skill loaded

`figma-use` must be loaded and passed as `skillNames: "figma-use"` on every call. The write gate enforces
it. It owns the API contract — colour ranges, read-only arrays, the font-load recipe, page switching — and
this workflow does not restate it.

## Scripts are atomic

A script that throws does not execute. Nothing is half-written, so a corrected retry is safe. This is why
a long script is a liability for a different reason than usual: not partial state, but a wasted call.

## Return compact shapes

A result over roughly 20KB truncates mid-JSON and the whole call is wasted. Return counts and small
samples, not full node dumps. Round numbers. Prefer arrays of short strings over objects with long keys.

An audit that returns 300 findings has failed at reporting even if it succeeded at detecting: nobody reads
300 rows, and it will not survive the response limit. Aggregate by kind, give two examples each, and put
the total next to it.

## One shape for every mutation report

```js
return { changed: [...], skipped: [...], failed: [...] }
```

`failed` must exist and must be populated from real `catch` blocks with the error text. An empty `catch {}`
in a mutation script converts a failure into a silent success, and that has cost two reviews. See
[figma-gates.md](figma-gates.md), audit integrity.
