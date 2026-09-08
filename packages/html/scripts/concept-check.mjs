/**
 * concept-check.mjs: did the complex work widen before it narrowed.
 *
 * A complex package went straight from the PRD to one polished prototype for nine
 * versions. That commits the project to the first idea anyone had, and the polish is what
 * makes it expensive to abandon: nobody drops a screen that looks finished.
 *
 * This reads STATE ONLY, and deliberately. The 1.0.0 plan put it inside verify-html,
 * where every other design check lives, and that was wrong: verify-html requires a
 * capture, so the check could only run once the screens existed. Divergence happens
 * BEFORE the screens exist. A check that cannot run at the moment it matters is a check
 * that will always report on a decision already made.
 *
 * Complex tier only. A standard package has a precedent in the product and does not need
 * widening; requiring it everywhere would make the rule ignorable, which is worse than
 * not having it.
 *
 * Four checks, all under one id because they are one guarantee:
 *
 *   1. two or more concepts on a complex package
 *   2. exactly one not dropped, because diverging is only half of it
 *   3. an approach stated, since three colourways of one layout is one concept
 *   4. something in servesBadly, because a concept with no weakness was not examined
 *
 * Usage: node concept-check.mjs <state.json>
 */
import fs from "fs";

const statePath = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!statePath) {
  console.error("usage: node concept-check.mjs <state.json>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

const wps = Object.entries(state.workPackages || {});
const complex = wps.filter(([, w]) => String(w.tier || "").toLowerCase() === "complex");
const ucIds = new Set((state.useCases || []).map((u) => u.id));

let conceptsBad = 0;
for (const [name, w] of complex) {
  const cs = Array.isArray(w.concepts) ? w.concepts : [];

  if (cs.length < 2) {
    conceptsBad++;
    fail("concepts-diverged", `workPackages.${name}`,
      `${cs.length} concept(s) on a complex package, needs 2 or more. One concept is the first idea anyone had, and the polish is what makes it hard to drop.`);
    continue;
  }

  const kept = cs.filter((c) => !c.dropped);
  if (kept.length !== 1) {
    conceptsBad++;
    fail("concepts-diverged", `workPackages.${name}`,
      `${kept.length} concepts are not dropped, needs exactly 1. Diverging is only half of it; the convergence is the decision.`);
  }

  for (const [i, c] of cs.entries()) {
    const where = `workPackages.${name}.concepts[${c.id || i}]`;

    if (!said(c.approach, 12)) {
      conceptsBad++;
      fail("concepts-diverged", where,
        "no approach stated. Concepts differ in approach, not in styling: three colourways of one layout is one concept.");
    }

    const badly = Array.isArray(c.servesBadly) ? c.servesBadly : [];
    if (!badly.length) {
      conceptsBad++;
      fail("concepts-diverged", where,
        "nothing in `servesBadly`. Every real approach is worse at something, and a set in which all of them are perfect is one idea described three times.");
    }
    for (const uc of badly)
      if (ucIds.has(uc) === false) {
        conceptsBad++;
        fail("concepts-diverged", where,
          `servesBadly names ${uc}, which is not a use case. It looks traced and is not.`);
      }

    if (c.dropped && !said(c.why, 12)) {
      conceptsBad++;
      fail("concepts-diverged", where,
        "dropped with no reason, so in week six nobody can say whether it was considered or overlooked.");
    }
  }
}

const scope = complex.length
  ? `${complex.length} complex package(s) of ${wps.length}`
  : (wps.length ? "no complex packages, nothing to diverge" : "no work packages yet");
console.log(`${conceptsBad ? "FAIL" : "pass"}  concepts-diverged ${String(conceptsBad).padStart(3)} finding(s)   (${scope})`);

if (!complex.length && wps.length) {
  console.log("");
  console.log("NOTE  every package is standard, so nothing here compared anything. That is a valid state");
  console.log("      and it is not a pass earned by divergence: either the work genuinely has a precedent");
  console.log("      in the product, or a package that is harder than it looks was tiered as if it is not.");
}

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). Concept divergence ${findings.length ? "is NOT recorded" : "is recorded"}.`);
process.exit(findings.length ? 1 : 0);
