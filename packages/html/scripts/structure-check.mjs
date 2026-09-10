/**
 * structure-check.mjs — the lo-fi gate, which pica did not have.
 *
 * The industry puts greyscale wireframes in front of the client BEFORE the design system, for one
 * reason: it forces the conversation onto structure while structure is still cheap to change. pica
 * went from the screen inventory straight to three fully-built directions, and then approved the
 * business flow and the visual design together at one confirmation — which bundles the two things
 * the lo-fi gate exists to separate. Structural rework discovered there is expensive rework.
 *
 * Built in the same HTML rather than a wireframe tool, so one medium carries the whole chain, the
 * lo-fi is measurable from the first gate, and D4 becomes "apply tokens over the approved
 * structure" rather than a rebuild.
 *
 * Four checks:
 *
 *   1. TRACED        every lo-fi screen names a use case. Same link coverage-check holds the built
 *                    screens to, applied before anything is styled — a screen that has no reason to
 *                    exist is cheapest to delete now.
 *   2. GREYSCALE     no colour outside the grey ramp. The moment a brand hue appears the client
 *                    starts reviewing the palette, which is the conversation this gate defers.
 *   3. REAL LENGTHS  content at realistic length, not lorem and not one word. A layout approved
 *                    against short text breaks on the real thing, and for a language that runs 1.3
 *                    against English it breaks by a third.
 *   4. STATES NAMED  every state the model declares appears, or is excused by name. The state model
 *                    exists by now — the modeller produced it — so lo-fi is the cheapest place to
 *                    find out that nobody has thought about the empty one.
 *
 * Usage: node structure-check.mjs <html-dir> <state.json>
 */
import fs from "fs";
import path from "path";

const [, , dir, statePath] = process.argv;
if (!dir || !statePath) {
  console.error("usage: node structure-check.mjs <html-dir> <state.json>");
  process.exit(2);
}

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read (${e.message}). Nothing was checked.`);
  process.exit(2);
}
if (!fs.existsSync(dir)) {
  console.log(`NOT APPLICABLE  ${dir} does not exist, so the structure pass has not been built.`);
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));
if (!files.length) {
  console.log(`NOT APPLICABLE  no HTML in ${dir}. Nothing was checked, and that is an abstention.`);
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const useCaseIds = new Set((state.useCases || []).map((u) => String(u.id || "").toUpperCase()));

let tracedBad = 0, greyBad = 0, lengthBad = 0, stateBad = 0, screens = 0;
const seenStates = new Set();

/* A grey is a colour whose channels are within a small delta of each other. Anything else is a hue,
   and a hue at this gate moves the conversation from structure to palette. */
const isGrey = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return true;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b) <= 12;
};

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");

  for (const m of src.matchAll(/<section[^>]*data-scr="([^"]+)"[^>]*>/g)) {
    screens++;
    const tag = m[0];
    const id = m[1];
    /* ---- 1. TRACED ---- */
    const uc = (tag.match(/data-uc="([^"]+)"/) || [])[1];
    if (!uc) {
      tracedBad++;
      fail("lofi-traced", `${f}#${id}`,
        "carries no data-uc. A structure screen with no use case behind it is the cheapest scope to " +
        "delete and the most expensive to discover after it has been styled.");
    } else if (useCaseIds.size) {
      for (const u of uc.split(",").map((x) => x.trim().toUpperCase()))
        if (!useCaseIds.has(u)) {
          tracedBad++;
          fail("lofi-traced", `${f}#${id} claims ${u}`, "which is not a use case in state.useCases.");
        }
    }
    const st = (tag.match(/data-state="([^"]+)"/) || [])[1];
    if (st) seenStates.add(st);
  }

  /* ---- 2. GREYSCALE ---- */
  for (const m of src.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    if (isGrey(m[0])) continue;
    greyBad++;
    fail("lofi-greyscale", `${f} uses ${m[0]}`,
      "A hue at the structure gate moves the review from layout to palette, and the palette is not " +
      "what is being approved here. Grey ramp only until the direction is chosen.");
  }
  for (const m of src.matchAll(/\b(?:rgb|hsl)a?\([^)]*\)/g)) {
    const nums = m[0].match(/[\d.]+/g) || [];
    if (m[0].startsWith("hsl") && Number(nums[1]) === 0) continue;
    if (m[0].startsWith("rgb") && nums.length >= 3
        && Math.max(+nums[0], +nums[1], +nums[2]) - Math.min(+nums[0], +nums[1], +nums[2]) <= 12) continue;
    greyBad++;
    fail("lofi-greyscale", `${f} uses ${m[0]}`, "is a hue, and this gate is greyscale.");
  }

  /* ---- 3. REAL LENGTHS ---- */
  if (/lorem ipsum/i.test(src)) {
    lengthBad++;
    fail("lofi-lengths", f,
      "contains lorem ipsum. Lorem is uniform and real content is not: a layout approved against it " +
      "breaks on the first real sentence, and the point of a structure gate is that the structure holds.");
  }
  const texts = [...src.matchAll(/>([^<>{}]{2,})</g)].map((m) => m[1].trim()).filter(Boolean);
  const oneWord = texts.filter((t) => t.length > 1 && !t.includes(" "));
  if (texts.length >= 8 && oneWord.length / texts.length > 0.8) {
    lengthBad++;
    fail("lofi-lengths", f,
      `${oneWord.length} of ${texts.length} text runs are single words. Placeholder-length content ` +
      "hides every wrapping problem the real copy will have, and for a language that runs 1.3 against " +
      "English it hides a third of the layout.");
  }
}

/* ---- 4. STATES NAMED ---- */
const declared = new Set();
for (const e of state.stateModel || [])
  for (const s of e.states || []) declared.add(String(s.name ?? s));
const excused = new Set((state.structureExemptions || []).map((x) => String(x.state ?? x)));
for (const st of declared) {
  if (seenStates.has(st) || excused.has(st)) continue;
  stateBad++;
  fail("lofi-states", `state "${st}"`,
    "is in the state model and appears on no structure screen. Excuse it by name in " +
    "structureExemptions with a reason, or draw it — this is the cheapest gate at which to find out " +
    "nobody has thought about it.");
}

const table = [
  ["lofi-traced", tracedBad, `${screens} structure screen(s)`],
  ["lofi-greyscale", greyBad, `${files.length} file(s)`],
  ["lofi-lengths", lengthBad, `${files.length} file(s)`],
  ["lofi-states", stateBad, declared.size ? `${declared.size} declared state(s)` : "no state model, so states were not checked"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
