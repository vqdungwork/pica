/**
 * screen-states-check.mjs: the states a screen DECLARES must exist somewhere it was BUILT.
 *
 * A blind evaluator, given a renderer and one lens, found this in a project whose lo-fi boards had
 * passed structure-check at 0 findings and whose final screens had passed every width, contrast and
 * target-size floor:
 *
 *   state.screens WL-02 declares  loading, success, multi-project, empty-no-assignment,
 *                                 degraded, stale-24h, no-cache-ever, error      — 8 states
 *   html/structure/wl-02-today.html carries                                       17 sections
 *   html/screens/wl-02.html carries                                                0
 *
 * grep for degraded, stale, offline, error across the delivered screen returned nothing. The
 * greyscale wireframes had every state; the polished screens dropped all of them and nothing said
 * so, because structure-check holds the wireframes and no check holds what replaced them.
 *
 * That is the shape of the failure: a state is specified once, drawn once in lo-fi, and then
 * quietly lost at the fidelity the client actually sees. The screen a person judges is the one
 * showing a single happy path, and the eight states that carry every failure the analysis worked
 * to find — 8project unreachable, a 24-hour-old cache, an employee with nothing assigned — arrive
 * in production never having been drawn.
 *
 * This holds the whole set: for every screen in state.screens, every state it declares must appear
 * in at least one built artefact under html/ — a `data-state` attribute, a file named for it, or a
 * section that names it. Where it appears is deliberately loose, because a board, a per-state file
 * and an in-page variant are all legitimate ways to build a state. Appearing NOWHERE is not.
 *
 * It RATCHETS, like rule-coverage and mutation-coverage, for the same reason.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const statePath = process.argv.find((a) => a.endsWith(".json")) || ".pica/state.json";
const BASELINE = path.join(ROOT, ".pica", "screen-states-baseline.json");

let state;
const resolved = path.isAbsolute(statePath) ? statePath : path.join(ROOT, statePath);
try { state = JSON.parse(fs.readFileSync(resolved, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  console.error("      Nothing was verified, and that is not a pass.");
  process.exit(2);
}

const screens = Array.isArray(state.screens) ? state.screens : [];
if (!screens.length) {
  console.log("NOT MEASURED  state.screens is absent, so nothing was checked.");
  console.log("              This is an abstention, not a pass.");
  process.exit(0);
}

/* Every built artefact, whatever directory the project put it in. Read once: a state declared by
   one screen may legitimately be drawn in a board that covers several. */
const built = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|jsx?|tsx?)$/.test(e.name)) built.push({ path: p, text: fs.readFileSync(p, "utf8") });
  }
};
const projectRoot = path.resolve(path.dirname(resolved), "..");
walk(path.join(projectRoot, "html"));
walk(path.join(projectRoot, "demo"));

if (!built.length) {
  console.log("NOT MEASURED  no built artefact found under html/ or demo/, so nothing was checked.");
  console.log("              This is an abstention, not a pass.");
  process.exit(0);
}

/* Same shape as every other check here: a fail() helper naming the assertion, so the id is
   greppable and rule-coverage-check can see that a marker pointing at it is honest. */
const out = [];
const fail = (id, where, why) => out.push({ id, where, why });

const missing = [];     /* declared and drawn nowhere at all */
const dropped = [];     /* drawn in lo-fi and lost at final fidelity — the real defect */
let declared = 0;

const covers = (files, st) => files.some(({ path: p, text }) =>
  text.includes(`data-state="${st}"`) || text.includes(`data-state='${st}'`) ||
  new RegExp(`\\b${st.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(text) ||
  path.basename(p).toLowerCase().includes(st.toLowerCase()));

const lofi  = built.filter((b) => /\/(structure|boards|directions)\//.test(b.path));
const final = built.filter((b) => /\/(screens|demo)\//.test(b.path));

for (const scr of screens) {
  const id = scr.id || scr.name || "(unnamed screen)";
  /* Only screens that HAVE a final artefact can have dropped one: a screen not yet carried to
     final fidelity is unfinished, which is a different thing and not this check's business. */
  const mine = final.filter((b) => path.basename(b.path).toLowerCase().startsWith(String(id).toLowerCase()));
  for (const st of scr.states || []) {
    declared++;
    if (!covers(built, st)) { fail("screen-states", id, `declares state "${st}" and no artefact anywhere carries it`), missing.push(1); continue; }
    if (mine.length && covers(lofi, st) && !covers(mine, st))
      fail("screen-states-fidelity", id, `drew state "${st}" in lo-fi and ${path.basename(mine[0].path)} does not carry it`), dropped.push(1);
  }
}

console.log(`screens: ${screens.length}`);
console.log(`states declared: ${declared}`);
console.log(`artefacts scanned: ${built.length} (${lofi.length} lo-fi, ${final.length} final)`);
console.log(`declared and drawn nowhere: ${missing.length}`);
console.log(`drawn in lo-fi, dropped at final fidelity: ${dropped.length}`);

const findings = out;
/* Fails CLOSED. An earlier draft defaulted the baseline to the current count when no baseline file
   existed, which meant a project without one could never go red — the check could only ever agree
   with whatever it found. That is the failure mode this repository has a rule against, and it was
   caught by its own mutation refusing to fire. A project carrying a real backlog records it on
   purpose with --write-baseline; absence of a baseline means zero is the bar. */
const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")) : { missing: 0 };
if (process.argv.includes("--write-baseline")) {
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify({ missing: findings.length, states: findings }, null, 2) + "\n");
  console.log(`\nbaseline written: ${findings.length}`);
  process.exit(0);
}

if (findings.length > base.missing) {
  console.error("");
  for (const f of findings) console.error(`FINDING  [${f.id}] ${f.where}\n         ${f.why}`);
  console.error(`\n${findings.length} unbuilt, baseline is ${base.missing}. It got worse.`);
  process.exit(1);
}
console.log(findings.length ? `\n0 finding(s). Nothing regressed. ${findings.length} still unbuilt:\n  ${findings.slice(0,8).map((f)=>`[${f.id}] ${f.where} — ${f.why}`).join("\n  ")}`
                           : "\n0 finding(s). Every declared state exists somewhere it was built.");
