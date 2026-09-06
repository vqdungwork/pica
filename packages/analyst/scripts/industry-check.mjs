/**
 * industry-check.mjs — the sector gate. Runs at 2.1b, with the other analysis checks.
 *
 * Domain knowledge in this flow used to mean regulation: which standard, which regulator,
 * how long to keep the data. That is the smallest part of it and the easiest to look up.
 *
 * What actually decides whether a product reads as belonging to its sector is the rest:
 * WHO the stakeholders are and which of them can say no, what the sector's colour
 * conventions mean and which hues are load-bearing, which design tradition the sector
 * has settled on and which ones actively misread in it, how dense the screens are, and
 * what the sector considers a defect regardless of what the client asked for.
 *
 * An education product built like an admin dashboard passes every other check in this
 * repo. It is also wrong, and wrong in a way that a teacher spots in one second.
 *
 * Seven checks:
 *
 *   1. INDUSTRY KNOWN   state.field resolves to an entry in the knowledge base.
 *                       PASS: resolved, unambiguously.
 *   2. STAKEHOLDERS     every stakeholder the sector says can decide or veto appears.
 *                       PASS: 0 missing without a recorded reason.
 *   3. CONSTRAINTS      every constraint category the sector requires is present.
 *                       PASS: 0 missing.
 *   4. CONVENTIONS      all five axes addressed: colour, style, density, typography, tone.
 *                       PASS: 0 unaddressed.
 *   5. FORBIDDEN        every sector-forbidden pattern has a stated prevention.
 *                       PASS: 0 unprevented.
 *   6. STYLE EXCLUDED   the chosen tradition is not one the sector rules out.
 *                       PASS: 0 excluded traditions used without a departure.
 *   7. EVIDENCE         the measured research includes a product from this sector.
 *                       PASS: at least one, or a recorded reason for none.
 *
 * WHY AN UNKNOWN INDUSTRY FAILS RATHER THAN PASSES:
 *
 * A brief for a sector this base does not cover is not a project that happens to need
 * less checking. It is pica reporting a hole in its own knowledge. Passing it would mean
 * the least-supported projects get the quietest gate, which is exactly backwards, and
 * it is the same failure this repo keeps finding in itself: a check returning zero on
 * the thing it exists to catch.
 *
 * The failure message names the gap and says how to close it, because a gate that blocks
 * without saying what would unblock it is a gate people route around.
 *
 * Usage: node industry-check.mjs <state.json>
 *        node industry-check.mjs --list
 *        node industry-check.mjs --show <industry>
 *        node industry-check.mjs --audit          (the base against itself)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(HERE, "..", "data", "industries.json");

let kb;
try {
  kb = JSON.parse(fs.readFileSync(BASE, "utf8"));
} catch (e) {
  console.error(`FAIL  the industry knowledge base could not be read at ${BASE} (${e.message}).`);
  console.error("      Without it this check cannot run, and a check that cannot run is not a pass.");
  process.exit(2);
}
const IND = kb.industries || {};
const AMB = kb.ambiguous || {};

/* ---- reading the base directly ------------------------------------------ */
const argv = process.argv.slice(2);

if (argv[0] === "--list") {
  console.log(`${Object.keys(IND).length} sectors:\n`);
  for (const [k, v] of Object.entries(IND))
    console.log(`  ${k.padEnd(15)} ${v.label}`);
  console.log(`\nAmbiguous terms this base refuses to guess at: ${Object.keys(AMB).join(", ") || "none"}`);
  process.exit(0);
}

const show = (k) => {
  const v = IND[k];
  console.log(`\n${v.label}\n${"=".repeat(v.label.length)}\n`);
  console.log(`Also called: ${v.aka.join(", ")}\n`);
  console.log("STAKEHOLDERS");
  for (const s of v.stakeholders) {
    console.log(`  ${s.role}${s.decides ? "  [decides or vetoes]" : ""}`);
    console.log(`    wants: ${s.wants}`);
    console.log(`    fears: ${s.fears}`);
    console.log(`    so:    ${s.designImplication}`);
  }
  console.log(`\nSTANDARDS\n  ${v.standards.join("\n  ")}`);
  console.log(`\nREGULATOR\n  ${v.regulator}`);
  console.log(`\nCONSTRAINT CATEGORIES REQUIRED\n  ${v.requiredConstraints.join(", ")}`);
  console.log(`\nCOLOUR\n  leads: ${v.colour.leads}\n  why:   ${v.colour.why}`);
  for (const a of v.colour.avoid) console.log(`  avoid: ${a.what}\n         because ${a.why}`);
  if ((v.colour.reserved || []).length) {
    console.log("  SPENT: hues this sector has already assigned. Using one for anything else");
    console.log("         overwrites a meaning the user learned before your product existed.");
    for (const r of v.colour.reserved) console.log(`         ${r.hue} means ${r.for}`);
  } else if (v.colour.reservedNote) {
    console.log(`  spent: nothing. ${v.colour.reservedNote}`);
  }
  console.log(`\nSTYLE\n  tradition: ${v.style.tradition}\n  why:       ${v.style.why}`);
  for (const n of v.style.notThis)
    console.log(`  not:       ${typeof n === "string" ? n : n.what}`);
  console.log(`\nDENSITY\n  ${v.density}`);
  console.log(`\nTYPOGRAPHY\n  ${v.typography}`);
  console.log(`\nTONE\n  ${v.tone}`);
  console.log(`\nFORBIDDEN IN THIS SECTOR`);
  for (const f of v.forbidden) console.log(`  - ${f}`);
  console.log(`\nSHIPPED PRODUCTS WORTH MEASURING\n  ${v.evidence.join(", ")}`);
};

if (argv[0] === "--audit") {
  /* The base is data now, so its own coherence is checkable. It was prose until 0.8.0 and
   * the only way to find a sector contradicting itself was to read all 28 entries, which
   * is the reading-is-not-measuring failure this project was built around.
   *
   * Run it after editing industries.json. */
  const CANON = new Set(["standard", "regulator", "data protection", "identity", "retention",
    "audit trail", "restricted claims", "professional duty"]);
  const bad = [];
  for (const [k, v] of Object.entries(IND)) {
    for (const c of v.requiredConstraints)
      if (!CANON.has(c)) bad.push(`${k}: requires constraint category "${c}", which domain-check does not know`);
    const trad = String(v.style.tradition || "").toLowerCase();
    for (const n of v.style.notThis) {
      if (!(n.names || []).length) bad.push(`${k}: a ruled-out tradition carries no names, so nothing can match it`);
      for (const nm of n.names || [])
        if (trad.includes(nm.toLowerCase()))
          bad.push(`${k}: its own tradition reads as "${nm}", which it also rules out`);
    }
    for (const a3 of v.colour.avoid)
      if (!String(a3.why || "").trim())
        bad.push(`${k}: a colour to avoid carries no reason, and a convention without its reason gets overridden`);
    /* A reserved hue and an avoided hue are the same fact stated twice. They must not
     * contradict: a hue reserved FOR something has to be avoided for everything else. */
    for (const r of v.colour.reserved || []) {
      const hue = String(r.hue || "").toLowerCase().split(" ")[0];
      if (!hue || !String(r.for || "").trim())
        bad.push(`${k}: a reserved hue is missing its hue or what it is reserved for`);
      if (hue && !v.colour.avoid.some((x) => String(x.what || "").toLowerCase().includes(hue))
              && !String(v.colour.leads || "").toLowerCase().includes(hue))
        bad.push(`${k}: "${hue}" is reserved and appears in neither the leading palette nor the avoid list, so nothing states the constraint`);
    }
    if (!(v.colour.reserved || []).length && !String(v.colour.reservedNote || "").trim())
      bad.push(`${k}: no reserved hues and no note saying so. Silence and "none" look identical`);
    for (const st of v.stakeholders)
      for (const f of ["role", "wants", "fears", "decides", "designImplication"])
        if (!(f in st)) bad.push(`${k}: stakeholder "${st.role || "?"}" is missing ${f}`);
    if (!v.stakeholders.some((x) => x.decides)) bad.push(`${k}: no stakeholder can decide or veto`);
    if (new Set(v.evidence).size !== v.evidence.length) bad.push(`${k}: the exemplar list repeats itself`);
    if (v.evidence.length < 3) bad.push(`${k}: fewer than three exemplars, which cannot characterise a sector`);
  }
  const owners = new Map();
  for (const [k, v] of Object.entries(IND))
    for (const a4 of [k, ...v.aka]) owners.set(a4, (owners.get(a4) || []).concat(k));
  for (const [name, o] of owners)
    if (o.length > 1 && !AMB[name]) bad.push(`"${name}" names ${o.join(" and ")} and is not recorded as ambiguous`);
  for (const name of Object.keys(AMB))
    if (!owners.has(name) || owners.get(name).length < 2)
      bad.push(`"${name}" is recorded as ambiguous and no longer names two sectors`);

  console.log(`${Object.keys(IND).length} sectors, ${owners.size} names, ` +
    `${Object.values(IND).reduce((n, v) => n + v.stakeholders.length, 0)} stakeholders, ` +
    `${Object.values(IND).reduce((n, v) => n + (v.colour.reserved || []).length, 0)} reserved hues\n`);
  for (const b3 of bad) console.log(`FINDING  ${b3}`);
  console.log(`\n${bad.length} finding(s). The knowledge base ${bad.length ? "contradicts itself" : "is internally consistent"}.`);
  process.exit(bad.length ? 1 : 0);
}

if (argv[0] === "--show") {
  const k = (argv[1] || "").toLowerCase();
  if (!IND[k]) {
    console.error(`FAIL  "${argv[1]}" is not a sector in this base. Run --list.`);
    process.exit(2);
  }
  show(k);
  process.exit(0);
}

/* ---- normal run --------------------------------------------------------- */
const statePath = argv.find((a) => !a.startsWith("--"));
if (!statePath) {
  console.error("usage: node industry-check.mjs <state.json> | --list | --show <industry>");
  process.exit(2);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}).`);
  process.exit(2);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

/* Every field in this register can be filled with a word that means nothing, and for one
 * revision every one of them was: a healthcare project with "n/a" in all five convention
 * notes, "not applicable" in every prevention, and ten waived stakeholders with no reason
 * between them, passed all seven checks with zero findings. The whole gate was defeated
 * by two characters, because each check only asked whether a field was non-empty.
 *
 * `domain-check` accepts "not applicable" and is right to: it asks whether the question
 * was ASKED, and a null is a real answer to that. These checks ask whether the sector's
 * requirement has a REAL answer, and a null is not one. Two checks, two questions, and
 * only one of them may accept a void.
 *
 * `said` is the single gate: text that is present and is not one of the phrases that
 * empty a field while leaving it looking filled. */
const VOID = new RegExp("^\\s*(" + [
  "n/?a", "none", "nil", "null", "not applicable", "does not apply", "no[t]? required",
  "tbd", "todo", "unknown", "ok", "yes", "no", "done", "fine", "default", "standard",
  "as usual", "as above", "see above", "same", "same as above", "\\.+", "-+",
].join("|") + ")\\s*[.:!]?\\s*$", "i");

/* The floor is EIGHT characters, and it was twenty for one revision. Twenty rejected
 * "Dark by default." and "Docs-forward, flat.", which are real decisions written by
 * someone who writes well, and this project's own rule is that a false positive is worse
 * than a miss because it teaches people to skip the check.
 *
 * Length was the wrong instrument. What is being detected is a field that has been
 * EMPTIED, not one that is short, so the void list does the work and the floor only has
 * to clear "x". A note that is present, is not a void phrase, and is still too thin to be
 * useful is a judgement call, and it belongs to the human at the gate rather than to a
 * character count. */
const said = (x, min = 8) => {
  const t = String(x || "").trim();
  return t.length >= min && !VOID.test(t);
};
const NAMED = 2;   // a source or a person, not a sentence. "PM", "BA" and "QA" are
                   // all real answers here, and "n/a" is caught by the void list rather
                   // than by length, which is the whole point of separating the two

/* ---- 1. industry known -------------------------------------------------- */
const fieldText = String(state.field || "").toLowerCase();
if (!fieldText.trim()) {
  console.error("FAIL  state.field is empty. The sector cannot be resolved, and every check below depends on it.");
  console.error("      Step 1.3 exists to narrow the brief to a field with real products behind it.");
  process.exit(1);
}

const names = [];
for (const [k, v] of Object.entries(IND)) for (const a of [k, ...v.aka]) names.push([a, k]);
names.sort((a, b) => b[0].length - a[0].length);

/* Matches are recorded as spans so a longer name can suppress a shorter one inside it.
 * Without this, "retail banking" reports an unresolvable clash between finance and
 * ecommerce, because "retail" is a real name for one and a substring of the other.
 * A compound term that names a sector precisely must beat its own fragment. */
const spans = [];
for (const [name, k] of names) {
  const re = new RegExp(`(^|[^a-z])(${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})([^a-z]|$)`, "ig");
  let m;
  while ((m = re.exec(fieldText)) !== null) {
    const at = m.index + m[1].length;
    spans.push({ name, k, at, end: at + name.length });
    re.lastIndex = at + 1;
  }
}
const kept = spans.filter((s) =>
  !spans.some((o) => o !== s && o.at <= s.at && o.end >= s.end && o.name.length > s.name.length));

const hit = new Set();
const ambHit = new Set();
for (const s of kept) {
  if (AMB[s.name]) ambHit.add(s.name); else hit.add(s.k);
}

const declared = String(state.industry?.key || "").toLowerCase();
let key = null;

if (declared && IND[declared]) {
  key = declared;
} else if (declared && !IND[declared]) {
  fail("industry-known", "state.industry.key",
    `"${declared}" is not a sector in this knowledge base. Run --list to see the ${Object.keys(IND).length} that are`);
} else if (hit.size === 1 && [...ambHit].every((a) => AMB[a].includes([...hit][0]))) {
  /* An ambiguous term is only harmless when the sector it resolved to is one of the two
   * the term could have meant. "fitness training" is fine: training could be fitness, and
   * fitness is what matched. "a training platform" is not, and the first version of this
   * resolved it to devtools because "platform" happened to match, silently discarding a
   * term that named two other sectors. A coincidental match must not outvote a declared
   * ambiguity. */
  key = [...hit][0];
} else if (hit.size >= 1 && ambHit.size) {
  const a = [...ambHit][0];
  fail("industry-known", "state.field",
    `"${a}" could mean ${AMB[a].join(" or ")}, and the rest of the field text points at ${[...hit].join(", ")} instead. ` +
    `Three candidates is not a resolution. Set state.industry.key`);
} else if (hit.size > 1) {
  fail("industry-known", "state.field",
    `the field text matches ${hit.size} sectors (${[...hit].join(", ")}). Set state.industry.key to the one that governs, because their conventions conflict`);
} else if (ambHit.size) {
  const a = [...ambHit][0];
  fail("industry-known", "state.field",
    `"${a}" is ambiguous between ${AMB[a].join(" and ")}, and this base will not guess. Their colour and density conventions are opposites. Set state.industry.key`);
} else {
  /* The gap report. This is the whole reason the check fails closed. */
  fail("industry-known", "state.field",
    `"${state.field}" matches no sector in this knowledge base.\n` +
    `         This is not a project that needs less checking. It is a hole in pica's own knowledge,\n` +
    `         and every check below it silently returns zero while the design has no sector to be wrong about.\n` +
    `         To close it, add an entry to packages/analyst/data/industries.json carrying: stakeholders with\n` +
    `         what each wants, fears and can decide; the sector's standards and regulator; the constraint\n` +
    `         categories it requires; colour convention with the hues that are load-bearing and why; the design\n` +
    `         tradition it has settled on and the ones that misread in it; density; typography; tone; what the\n` +
    `         sector treats as a defect; and shipped products worth measuring.\n` +
    `         Known sectors: ${Object.keys(IND).join(", ")}`);
}

const V = key ? IND[key] : null;
const reg = state.industry || {};

/* Everything below needs the sector. Reporting them as passes without one would be
 * the exact silence this check exists to prevent. */
if (!V) {
  console.log(`field:  ${state.field}`);
  console.log(`sector: UNRESOLVED\n`);
  console.log("FAIL  industry-known     1 finding(s)");
  for (const n of ["stakeholders", "constraints", "conventions", "forbidden", "style-excluded", "evidence"])
    console.log(`----  ${n.padEnd(16)}  not run: no sector resolved. This is not a pass`);
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
  console.log(`\n1 finding(s). The sector is unresolved, so nothing below it was checked.`);
  process.exit(1);
}

/* ---- 2. stakeholders ---------------------------------------------------- *
 * Only the deciding ones are enforced. A sector stakeholder who can veto and whom
 * nobody listed is a discovery that arrives at the worst possible moment. */
const listed = (state.stakeholders || []).map((s) => String(s.name || s.role || "").toLowerCase());
const waived = new Map();
for (const w of reg.stakeholdersNotApplicable || [])
  waived.set(String(w.role || "").toLowerCase(), w);
let missingSh = 0;
for (const s of V.stakeholders) {
  if (!s.decides) continue;
  const r = s.role.toLowerCase();
  if (waived.has(r)) {
    const w = waived.get(r);
    if (!said(w.why) || !said(w.by, NAMED)) {
      missingSh++;
      fail("stakeholders", s.role,
        "waived with no reason, or with nobody named as waiving it. Removing a stakeholder who can veto is a decision a human signs");
    }
    continue;
  }
  const found = listed.some((l) => l.includes(r) || r.includes(l));
  if (!found) {
    missingSh++;
    fail("stakeholders", s.role,
      `this sector's "${s.role}" can decide or veto and appears in no register. They fear: ${s.fears}. ` +
      `Design consequence: ${s.designImplication}`);
  }
}

/* ---- 3. constraints ----------------------------------------------------- *
 * Presence is not enough, and the first version only checked presence. A healthcare
 * project wrote "not applicable" into the data protection category and this returned
 * zero findings: the category was there, so the check was satisfied, and the sector's
 * hardest requirement had been voided in a field nothing read.
 *
 * `domain-check` accepts "not applicable" everywhere, and correctly: it asks whether the
 * question was ASKED, and a null answer is a legitimate answer to that. This check asks
 * a different question, whether the sector's requirement has a REAL answer, and a void
 * is not one. Two checks, two questions, and only one of them may accept a null.
 *
 * A sector requirement that genuinely does not apply is waived by a human on the record,
 * the same way a stakeholder is. Nothing else empties it. */
const byCat = new Map();
for (const c of state.domainConstraints || [])
  byCat.set(String(c.category || "").toLowerCase(), c);
const waivedCat = new Map();
for (const w of reg.constraintsNotApplicable || [])
  waivedCat.set(String(w.category || "").toLowerCase(), w);

let missingC = 0;
for (const c of V.requiredConstraints) {
  const w = waivedCat.get(c);
  if (w) {
    if (!said(w.why) || !said(w.by, NAMED)) {
      missingC++;
      fail("constraints", c,
        `waived with no reason or nobody signing it. A sector requirement is waived by a named human with a reason, or not at all`);
    }
    continue;
  }
  const got = byCat.get(c);
  if (!got) {
    missingC++;
    fail("constraints", c, `this sector requires a "${c}" constraint and none is recorded`);
    continue;
  }
  const text = String(got.constraint || "").trim();
  if (!text) {
    missingC++;
    fail("constraints", c, `the "${c}" category exists with an empty constraint. A present-but-empty field reads as answered`);
  } else if (!said(text)) {
    missingC++;
    fail("constraints", c,
      `this sector requires "${c}" and the project records it as "${text.slice(0, 48)}". ` +
      `Voiding a sector requirement is a decision a human signs: record it in industry.constraintsNotApplicable with a reason and a name`);
  }
}

/* ---- 4. conventions ----------------------------------------------------- *
 * Five axes, each addressed explicitly. "Addressed" means followed with a note, or
 * departed from with a reason. Silence on an axis is the failure: it means nobody
 * decided, and an undecided axis defaults to whatever the model felt like. */
const AXES = ["colour", "style", "density", "typography", "tone"];
const addressed = new Map();
for (const c of reg.conventions || []) {
  const a = String(c.about || "").toLowerCase();
  if (!AXES.includes(a)) continue;
  const ok = c.followed === true ? said(c.note) : said(c.why);
  addressed.set(a, ok);
}
let unaddressed = 0;
const GUIDE = { colour: V.colour.leads, style: V.style.tradition, density: V.density, typography: V.typography, tone: V.tone };
for (const a of AXES) {
  if (!addressed.has(a)) {
    unaddressed++;
    fail("conventions", a,
      `no decision recorded on ${a}. The sector's convention is: ${GUIDE[a]}. ` +
      `Follow it with a note, or depart from it with a reason, but do not leave it undecided`);
  } else if (!addressed.get(a)) {
    unaddressed++;
    fail("conventions", a,
      addressed.get(a) === false && (reg.conventions || []).find((c) => c.about === a)?.followed === true
        ? `recorded as followed with no note saying how`
        : `recorded as a departure with no reason. A departure from a sector convention is a position, and it has to be arguable`);
  }
}

/* ---- 5. forbidden ------------------------------------------------------- *
 * Matched on the sector's own wording, so the register cannot drift into
 * paraphrase that no longer names the same pattern. */
const prevented = new Map();
for (const p of reg.forbiddenPrevented || [])
  prevented.set(String(p.forbidden || "").trim().toLowerCase(), String(p.preventedBy || "").trim());
let unprevented = 0;
for (const f of V.forbidden) {
  const k2 = f.trim().toLowerCase();
  if (!prevented.has(k2)) {
    unprevented++;
    fail("forbidden", f.slice(0, 60), `this sector treats it as a defect and nothing in the design says what prevents it`);
  } else if (!said(prevented.get(k2))) {
    unprevented++;
    fail("forbidden", f.slice(0, 60),
      `listed, and what prevents it reads as "${prevented.get(k2).slice(0, 30) || "(empty)"}". Naming the risk is not preventing it, and neither is voiding the field`);
  }
}

/* ---- 6. style excluded -------------------------------------------------- *
 * Each notThis entry carries its own `names`: the words that would actually appear in a
 * direction if someone chose the thing the sector rules out.
 *
 * Two earlier versions failed here and both failed the same way. The first took the
 * sentence's first word, so "illustration-led marketing pages..." became the token
 * "illustrationled" and matched nothing. The second matched a fixed list of named
 * traditions, which worked for the sectors that rule out glassmorphism by name and did
 * nothing at all for the ones that rule out "business or admin dashboard styling on the
 * learner surface" — half the sectors, silently passing.
 *
 * The rule this project keeps rediscovering: a rule with no register is a preference.
 * Prose describing what is ruled out is a preference. `names` is the register.
 *
 * An entry with an empty `names` is COUNTED AND REPORTED, never quietly treated as clean.
 */
let excluded = 0;
let unmatchable = 0;
const chosen = `${state.direction?.tradition || ""} ${state.direction?.name || ""} ${state.direction?.style || ""}`.toLowerCase();
/* A departure only silences the check when it carries a reason. Otherwise the register
 * becomes the way round the register. */
const departures = new Set((reg.departures || [])
  .filter((d) => said(d.why))
  .map((d) => String(d.from || "").toLowerCase()));
for (const n of V.style.notThis) {
  const what = typeof n === "string" ? n : n.what;
  const names = (typeof n === "string" ? [] : n.names) || [];
  if (!names.length) { unmatchable++; continue; }
  if (!chosen.trim()) continue;
  const clash = names.find((t) => chosen.includes(t.toLowerCase()));
  if (!clash) continue;
  if ([...departures].some((d) => d.includes(clash.toLowerCase()))) continue;
  excluded++;
  fail("style-excluded", clash,
    `the direction reads as "${clash}", which this sector rules out: ${what}. ` +
    `Record it in industry.departures with a reason, or choose another tradition`);
}

/* ---- 7. evidence -------------------------------------------------------- */
let noEvidence = 0;
const measured = JSON.stringify(state.measured || state.research || []).toLowerCase();
const anyEv = V.evidence.some((e) => measured.includes(e.toLowerCase()));
if (!anyEv && !said(reg.evidenceNote)) {
  noEvidence++;
  fail("evidence", "state.measured",
    `no product from this sector appears in the measured research. Worth measuring: ${V.evidence.join(", ")}. ` +
    `A direction argued from no sector precedent is a preference wearing a rationale`);
}

/* ---- report ------------------------------------------------------------- */
console.log(`field:  ${state.field}`);
console.log(`sector: ${key} — ${V.label}`);
console.log(`        ${V.stakeholders.length} stakeholders known, ${V.forbidden.length} sector defects, ${V.evidence.length} exemplars`);
console.log("");

const table = [
  ["industry-known", 0, `resolved to ${key}`],
  ["stakeholders", missingSh, `${V.stakeholders.filter((s) => s.decides).length} deciding`],
  ["constraints", missingC, `${V.requiredConstraints.length} required`],
  ["conventions", unaddressed, "5 axes"],
  ["forbidden", unprevented, `${V.forbidden.length} sector defects`],
  ["style-excluded", excluded, `${V.style.notThis.length} ruled out${unmatchable ? `, ${unmatchable} with no register and so not checked` : ""}`],
  ["evidence", noEvidence, `${V.evidence.length} exemplars`],
];
for (const [name, n, scope] of table)
  console.log(`${n ? "FAIL" : "pass"}  ${name.padEnd(16)} ${String(n).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}

console.log(`\n${findings.length} finding(s). The design ${findings.length ? "does not yet meet its sector's conventions" : "meets the conventions of its sector"}.`);
process.exit(findings.length ? 1 : 0);
