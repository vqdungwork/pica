/**
 * frame-inventory-check.mjs: does Figma contain the frames the reference has.
 *
 * geometry-diff documents its own blindness, in its own words:
 *
 *   "WHAT THIS CANNOT DO: detect absence. A node that was never created has no coordinates, so it
 *    cannot be over tolerance. A frame missing a third of its content still reports every node it
 *    does have as correct. Frame inventory and text-run counts are parity-check.mjs's and
 *    verify-html.mjs's job: a clean geometry diff is not evidence a frame is complete."
 *
 * It hands the job to two checks that do not take it. parity-check compares VIEWPORT TO VIEWPORT
 * WITHIN THE HTML, it never receives the Figma dump, and states outright: "WHAT IT DOES NOT
 * CHECK: the set of screen names present at each viewport". verify-html is HTML-only too.
 *
 * So nothing verified that Figma has every frame the reference has, and a port that silently
 * dropped five frames passed everything: geometry-diff compares only frames present on both sides,
 * and it says so.
 *
 * This is a check delegating to a check that does not accept the job, which is one level worse than
 * a rule with no executable: the delegation reads as coverage.
 *
 * Four checks:
 *
 *   1. FRAME PRESENT   every reference frame exists in the dump. Missing is a dropped port.
 *   2. NO EXTRA        every dump frame exists in the reference. Extra is scope nobody designed,
 *                      and it will be built.
 *   3. PAIRED BY MAP   pairing uses the declared frame map, never names. reference-discipline.md:
 *                      "Names are not identity": duplicate names and renames are the two most
 *                      ordinary events in a project.
 *   4. TEXT RUNS       a paired frame carries a comparable number of text runs. A frame present but
 *                      two thirds empty is exactly what a clean geometry diff hides.
 *
 * Usage: node frame-inventory-check.mjs <html-reference.json> <figma-dump.json> <state.json>
 */
import fs from "fs";

const [, , refPath, figPath, statePath] = process.argv;
if (!refPath || !figPath || !statePath) {
  console.error("usage: node frame-inventory-check.mjs <html-reference.json> <figma-dump.json> <state.json>");
  process.exit(2);
}

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}
if (state.figmaInScope !== true) {
  console.log("NOT APPLICABLE  figmaInScope is not true, so there is no port to check.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}
for (const [p, what] of [[refPath, "the capture"], [figPath, "the Figma dump"]]) {
  if (fs.existsSync(p)) continue;
  console.log(`NOT APPLICABLE  ${p} does not exist, so ${what} has not been taken.`);
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

let ref, fig;
try { ref = JSON.parse(fs.readFileSync(refPath, "utf8")); fig = JSON.parse(fs.readFileSync(figPath, "utf8")); }
catch (e) {
  console.error(`FAIL  could not parse an input (${e.message}). Nothing was checked.`);
  process.exit(2);
}
if (!Array.isArray(fig)) {
  console.error(`FAIL  ${figPath} is ${fig === null ? "null" : typeof fig}, and the dump has to be an array`);
  console.error("      of { pkg, frame, vp, texts: [...] }. Nothing was compared, and that is not a pass.");
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* reference-discipline.md settles the pairing channel: "Figma port, frame name plus the viewport
   section it sits in, declared in the frame map". The map is what makes this a lookup rather than a
   guess, and a project that has not declared one is told so rather than silently name-matched.

   ONE FORMAT, the one /pica-port documents and geometry-diff reads:
     frameMap: { "<pkg>|<figma frame>": "<html screen>" }   or   "<file>|<html screen>"
   This check used to read a different shape keyed the other way round, so a map written the
   documented way matched nothing here, and the two checks could not both be satisfied by one file.

   The key is file + screen + viewport, not screen + viewport. Writing this check found the exact
   defect reference-discipline.md warns about, in pica's own example: app-approvals.html and
   approvals.html both caption a frame "approvals · desktop". An unqualified screen that names more
   than one captured file is refused as ambiguous rather than paired with both. */
const map = state.frameMap || {};
const screenOf = (cap, vp) => String(cap).replace(new RegExp(`\\s*·\\s*${vp}\\b.*$`, "i"), "").trim();

const refFrames = [];
for (const [file, arr] of Object.entries(ref.frames || {}))
  for (const f of arr || [])
    refFrames.push({ file, cap: String(f.cap ?? ""), vp: String(f.viewport ?? ""), screen: screenOf(f.cap ?? "", f.viewport ?? ""),
                     runs: Array.isArray(f.texts) ? f.texts.length : (f.textRuns ?? null) });
const refKey = (r) => `${r.file}|${r.screen}|${r.vp}`;

let missingBad = 0, extraBad = 0, mapBad = 0, runsBad = 0, paired = 0;
const usingMap = Object.keys(map).length > 0;

/* Every dump frame, resolved to the reference frame it claims to be. */
const claims = new Map();          // refKey -> dump frame
const unclaimed = [];
for (const f of fig) {
  const vp = String(f.vp ?? "");
  let targets;
  if (usingMap) {
    const v = map[`${f.pkg}|${f.frame}`];
    if (!v) { unclaimed.push([f, "has no frameMap entry"]); continue; }
    const [file, screen] = String(v).includes("|") ? String(v).split("|") : [null, String(v)];
    targets = refFrames.filter((r) => r.vp === vp && r.screen === screen.trim() && (!file || r.file === file.trim()));
    if (targets.length > 1) {
      mapBad++;
      fail("paired-by-map", `frameMap["${f.pkg}|${f.frame}"]`,
        `names "${v}", which ${targets.length} captured files carry (${targets.map((t) => t.file).join(", ")}). ` +
        `Qualify it as "<file>|${screen.trim()}" so it pairs with one of them, not all.`);
      continue;
    }
  } else {
    targets = refFrames.filter((r) => r.file === String(f.pkg ?? "") && r.cap === String(f.frame ?? "") && r.vp === vp);
  }
  if (!targets.length) { unclaimed.push([f, usingMap ? `maps to "${map[`${f.pkg}|${f.frame}`]}" at ${vp}, which no capture carries` : "matches no captured frame"]); continue; }
  claims.set(refKey(targets[0]), f);
}

/* ---- 3. PAIRED BY MAP ---------------------------------------------------- */
if (!usingMap && refFrames.length) {
  mapBad++;
  fail("paired-by-map", "state.frameMap",
    "is empty, so pairing falls back to matching names. reference-discipline.md: names are not " +
    "identity, and both duplicate names and renames are ordinary events. Declare the map, or a " +
    "rename reads as one frame dropped and one added.");
}

/* ---- 1. FRAME PRESENT & 4. TEXT RUNS ------------------------------------- */
for (const r of refFrames) {
  const hit = claims.get(refKey(r));
  if (!hit) {
    missingBad++;
    fail("frame-present", `${r.file} · ${r.cap} · ${r.vp}`,
      "is in the capture and not in the Figma dump. geometry-diff cannot see this: a node that was " +
      "never created has no coordinates, so it cannot be over tolerance, and the port reports clean " +
      "while missing a frame.");
    continue;
  }
  paired++;
  const figRuns = Array.isArray(hit.texts) ? hit.texts.length : null;
  if (r.runs === null || figRuns === null) continue;
  /* Both empty is agreement, not a 0:1 ratio. Dividing by max(n,1) made a caption-only frame
     that matched perfectly report as two thirds empty. */
  if (r.runs === 0 && figRuns === 0) continue;
  const ratio = figRuns / Math.max(r.runs, 1);
  if (ratio >= 0.9 && ratio <= 1.1) continue;
  runsBad++;
  fail("text-runs", `${r.file} · ${r.cap} · ${r.vp}`,
    `carries ${figRuns} text run(s) against the capture's ${r.runs}. A frame present but two thirds ` +
    "empty is exactly the case a clean geometry diff hides, because every node it does have is in " +
    "the right place.");
}

/* ---- 2. NO EXTRA --------------------------------------------------------- */
for (const [f, why] of unclaimed) {
  extraBad++;
  fail("no-extra", `${f.pkg} · ${f.frame} · ${f.vp}`,
    `${why}. Either the HTML it should have come from was never built, or this is scope nobody ` +
    "designed, and Figma is the derived artefact, so it does not get to add screens.");
}

const table = [
  ["frame-present", missingBad, `${refFrames.length} reference frame(s), ${paired} paired`],
  ["no-extra", extraBad, `${fig.length} frame(s) in the dump`],
  ["paired-by-map", mapBad, usingMap ? `${Object.keys(map).length} mapping(s) declared` : "no frame map"],
  ["text-runs", runsBad, `${paired} paired frame(s), within 10%`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(16)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
