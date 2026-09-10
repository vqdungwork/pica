/**
 * archetype-check.mjs — the third knowledge axis, and the one that decides what to measure.
 *
 * The sector says how a product should look and speak. The archetype says what shape it is: a CRM
 * means list, detail, pipeline and an activity timeline whether it sells law or cars. Without it
 * the researcher measures products from the right industry and the wrong shape — a family-office
 * portal compared against retail banks rather than against other wealth portals.
 *
 * PER APPLICATION, NOT PER PROJECT. A product with a client portal and a back-office console has
 * two, and treating them as one gives the admin the client app's patterns. That is why this check
 * reads the applications the contract declares rather than a single project-level key.
 *
 * Four checks:
 *
 *   1. DECLARED      every application the contract names has an archetype.
 *   2. RESOLVED      every archetype is a real key in archetypes.json.
 *   3. AMBIGUOUS     a word the register refuses is refused here, and it says what it could mean.
 *   4. SCREENS       every screen the archetype marks required is present in the inventory, or is
 *                    excused by name. Not present and not excused is the shape of a product that
 *                    forgot half of what it is.
 *
 * Check 4 abstains until screens exist, because an archetype declared at intake cannot be held to
 * an inventory that has not been drawn.
 *
 * Usage: node archetype-check.mjs <state.json>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const [, , statePath] = process.argv;
if (!statePath) {
  console.error("usage: node archetype-check.mjs <state.json>");
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
let state, data;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}
try { data = JSON.parse(fs.readFileSync(path.join(here, "..", "data", "archetypes.json"), "utf8")); }
catch (e) {
  console.error(`FAIL  archetypes.json could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}

const known = data.archetypes;
const amb = data.ambiguous || {};

/* An application list is the contract's job. No applications means intake has not produced one
   yet, which is an abstention and not a broken project. */
const apps = state.applications || (state.archetype && typeof state.archetype === "object"
  ? Object.keys(state.archetype).map((name) => ({ name })) : []);
if (!apps.length) {
  console.log("NOT APPLICABLE  no applications are declared, so intake has not produced the list yet.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const archOf = (app) =>
  (typeof app.archetype === "string" && app.archetype) ||
  (state.archetype && state.archetype[app.name]) || "";

/* ---- 1, 2, 3 ------------------------------------------------------------- */
let declaredBad = 0, resolvedBad = 0, ambiguousBad = 0;
for (const app of apps) {
  const a = String(archOf(app) || "").trim();
  if (!a) {
    declaredBad++;
    fail("archetype-declared", `application "${app.name}"`,
      `names no archetype. Known: ${Object.keys(known).join(", ")}. Without one the researcher ` +
      "measures the right industry and the wrong shape of product.");
    continue;
  }
  if (known[a]) continue;
  if (amb[a.toLowerCase()]) {
    ambiguousBad++;
    const o = amb[a.toLowerCase()];
    fail("archetype-ambiguous", `application "${app.name}" = "${a}"`,
      o.length ? `is refused as ambiguous: it could mean ${o.join(" or ")}. Say which.`
               : `is refused: it names a category rather than a shape, and nothing follows from it.`);
  } else {
    resolvedBad++;
    fail("archetype-resolved", `application "${app.name}" = "${a}"`,
      `is not an archetype. Known: ${Object.keys(known).join(", ")}.`);
  }
}

/* ---- 4. SCREENS ---------------------------------------------------------- */
let screensBad = 0, screensScope = "no screens yet, so the inventory was not checked";
const screens = Array.isArray(state.screens) ? state.screens : [];
if (screens.length) {
  let required = 0;
  for (const app of apps) {
    const a = String(archOf(app) || "").trim();
    if (!known[a]) continue;
    const mine = screens.filter((s) => !s.application || s.application === app.name);
    const have = new Set(mine.map((s) => String(s.archetypeRole || s.id || "").toLowerCase()));
    const excused = new Set((app.archetypeExemptions || []).map((x) => String(x.screen || x).toLowerCase()));
    for (const cs of known[a].coreScreens || []) {
      if (!cs.required) continue;
      required++;
      if (have.has(cs.id.toLowerCase()) || excused.has(cs.id.toLowerCase())) continue;
      screensBad++;
      fail("archetype-screens", `"${app.name}" (${a}) has no "${cs.id}" screen`,
        `${cs.purpose}. Every ${a} has one. Build it, or name it in archetypeExemptions with a reason — ` +
        "a shape missing a required screen and a shape that deliberately does without look identical otherwise.");
    }
  }
  screensScope = `${required} required screen(s) across ${apps.length} application(s)`;
}

/* ---- report -------------------------------------------------------------- */
const table = [
  ["archetype-declared", declaredBad, `${apps.length} application(s)`],
  ["archetype-resolved", resolvedBad, `${Object.keys(known).length} archetype(s) in the register`],
  ["archetype-ambiguous", ambiguousBad, `${Object.keys(amb).length} refused word(s)`],
  ["archetype-screens", screensBad, screensScope],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(20)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
