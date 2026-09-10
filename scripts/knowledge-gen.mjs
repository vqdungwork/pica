/**
 * knowledge-gen.mjs — the three knowledge axes, written into every agent that reads them.
 *
 * Every agent is required to read the sector entry before it starts, and 2.0.0 added two
 * more axes it must also read. Leaving that as prose in six files is how the six drift:
 * a sector added to the data and named in one agent is a sector four agents will refuse.
 *
 * WHAT IS EMBEDDED, AND WHY NOT EVERYTHING. The data is 148KB and the six agents together
 * are 26KB. Embedding the entries would make each agent six times the size of all the
 * agents combined, and would load 28 sectors to use one. So what is generated is the
 * REGISTER: every key that exists, one line each, plus how to resolve and when to refuse.
 * That is the half an agent needs before it has read anything — it can refuse an unknown
 * field without a file read, and it knows exactly which entry to load. The entry itself
 * is read from the data file, which stays the single source.
 *
 * Run with --check and it writes nothing: it regenerates into memory and diffs. That is
 * the drift check, and it is the same code that does the generating, so the two cannot
 * disagree about what correct looks like.
 *
 * Usage:
 *   node scripts/knowledge-gen.mjs           write the block into every agent
 *   node scripts/knowledge-gen.mjs --check   fail if any agent's block is stale
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "packages/analyst/data");
const CHECK = process.argv.includes("--check");

const BEGIN = "<!-- BEGIN GENERATED: knowledge register. Edit packages/analyst/data/*.json, then run scripts/knowledge-gen.mjs -->";
const END = "<!-- END GENERATED -->";

/* Which agents read the axes. All of them do: the rule is that every agent reads the
 * sector entry before it starts, and an agent that does not is the one that produces a
 * clinician's screen from a warehouse template. */
const AGENTS = [
  "packages/research/agents/pica-researcher.md",
  "packages/discover/agents/pica-discoverer.md",
  "packages/analyst/agents/pica-analyst.md",
  "packages/analyst/agents/pica-modeller.md",
  "packages/html/agents/pica-designer.md",
  "packages/content/agents/pica-writer.md",
  "packages/designqa/agents/pica-evaluator.md",
];

const read = (f) => {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) {
    console.error(`FAIL  ${path.relative(ROOT, p)} is missing, and it is one of the three axes.`);
    console.error("      Nothing was generated, and that is not a pass.");
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
};

const industries = read("industries.json");
const audiences = read("audiences.json");
const archetypes = read("archetypes.json");

/* ---- build the register -------------------------------------------------- */
function block() {
  const L = [];
  L.push(BEGIN);
  L.push("");
  L.push("## The three axes, and the order they bind in");
  L.push("");
  L.push("Read the entry for each before you start. **Constraints come from sector × audience × archetype.**");
  L.push("Where they disagree, **audience floors win**: a numeric floor is a floor, and a sector's density");
  L.push("preference may not go under one. The sector still owns colour meaning, tone and forbidden patterns.");
  L.push("");
  L.push("**Refuse rather than guess.** A field, audience or archetype you cannot resolve to a key below is");
  L.push("not a thing to approximate — say which of the listed keys it might be, and stop.");
  L.push("");

  const sectors = Object.entries(industries.industries);
  L.push(`### Sector · \`packages/analyst/data/industries.json\` · ${sectors.length} keys`);
  L.push("");
  for (const [k, v] of sectors) L.push(`- \`${k}\` — ${v.label}`);
  L.push("");
  const amb = Object.entries(industries.ambiguous || {});
  if (amb.length) {
    L.push(`**Refused as ambiguous** (${amb.length}): ` +
      amb.map(([w, o]) => `\`${w}\` → ${o.join(" or ")}`).join(" · "));
    L.push("");
  }

  const dims = Object.entries(audiences.dimensions);
  const nVals = dims.reduce((n, [, d]) => n + Object.keys(d.values).length, 0);
  L.push(`### Audience · \`packages/analyst/data/audiences.json\` · ${dims.length} dimensions, ${nVals} values`);
  L.push("");
  L.push("One value per dimension, except where a dimension says `multiple`. Numeric floors merge by **maximum**.");
  L.push("");
  for (const [dk, d] of dims) {
    const many = d.multiple ? ", several allowed" : "";
    L.push(`- **${dk}**${many} — ${d.label}`);
    for (const [vk, v] of Object.entries(d.values)) {
      const f = Object.entries(v.floors || {});
      const fs_ = f.length ? `  · floors: ${f.map(([a, b]) => `${a} ${b}`).join(", ")}` : "";
      L.push(`  - \`${dk}:${vk}\` — ${v.label}${fs_}`);
    }
  }
  L.push("");

  const arch = Object.entries(archetypes.archetypes);
  L.push(`### Archetype · \`packages/analyst/data/archetypes.json\` · ${arch.length} keys`);
  L.push("");
  L.push("**Per application, not per project.** A product with a client portal and an admin console has two.");
  L.push("");
  for (const [k, v] of arch) L.push(`- \`${k}\` — ${v.label} · object: ${v.primaryObject.split(" — ")[0].split(",")[0]}`);
  L.push("");
  L.push(END);
  return L.join("\n");
}

/* ---- write or check ------------------------------------------------------ */
const generated = block();
let stale = 0, written = 0, missingMarker = 0;

for (const rel of AGENTS) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) {
    console.error(`FAIL  ${rel} does not exist, and the register names it as an agent that reads the axes.`);
    process.exit(2);
  }
  const src = fs.readFileSync(p, "utf8");
  const i = src.indexOf(BEGIN), j = src.indexOf(END);
  let next;
  if (i < 0 || j < 0) {
    if (CHECK) { missingMarker++; console.log(`  STALE  ${rel}  carries no generated block`); continue; }
    next = src.trimEnd() + "\n\n" + generated + "\n";
  } else {
    next = src.slice(0, i) + generated + src.slice(j + END.length);
  }
  if (next === src) continue;
  if (CHECK) { stale++; console.log(`  STALE  ${rel}  block does not match the data`); continue; }
  fs.writeFileSync(p, next);
  written++;
}

if (CHECK) {
  const bad = stale + missingMarker;
  console.log(`\n${AGENTS.length} agent(s) checked, ${bad} stale.`);
  if (bad) {
    console.log("Run `node scripts/knowledge-gen.mjs` to regenerate. An embedded copy that no longer");
    console.log("matches its source is the drift the generator exists to prevent.");
  }
  process.exit(bad ? 1 : 0);
}
console.log(`${AGENTS.length} agent(s), ${written} rewritten.`);
console.log(`register: ${Object.keys(industries.industries).length} sectors, ` +
  `${Object.keys(audiences.dimensions).length} audience dimensions, ` +
  `${Object.keys(archetypes.archetypes).length} archetypes.`);
