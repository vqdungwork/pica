/**
 * flow-diagram.mjs — the chain, drawn from the manifests rather than by hand.
 *
 * pica's flow has been described in prose in four places and drawn nowhere, and the four drifted:
 * deleting six packages left the README's flow table with steps numbered 0, 1, 4, 5, 6, 9, 10 and a
 * Build row pointing at a command that no longer existed. A hand-drawn diagram would have drifted
 * the same way and looked authoritative while doing it.
 *
 * So it is generated, archify-style: read the graph, build typed data, validate it, render a
 * self-contained SVG. The diagram cannot disagree with the manifests because it has no other source.
 *
 * Lanes are phases. Nodes are packages, placed in the phase their checks declare. Edges come from
 * requires/produces — the same graph contract-check asserts is sound and pica-status resolves at
 * runtime. Stops are read from a list here, because a stop is a human decision and no manifest
 * knows about it; everything else is derived.
 *
 * Usage:
 *   node scripts/flow-diagram.mjs           write assets/flow.svg
 *   node scripts/flow-diagram.mjs --check   fail if the committed SVG is stale
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const PKG_DIR = path.join(ROOT, "packages");
const OUT = path.join(ROOT, "assets", "flow.svg");
const CHECK = process.argv.includes("--check");

/* pica-verify's own phase order. Keeping a second copy here would be the drift this file exists to
   prevent, so read it out of the source rather than restating it. */
const verifySrc = fs.readFileSync(path.join(PKG_DIR, "core/scripts/pica-verify.mjs"), "utf8");
const m = /const PHASES = \[([\s\S]*?)\];/.exec(verifySrc);
if (!m) {
  console.error("FAIL  could not read PHASES from pica-verify.mjs. Nothing was drawn, and that is not a pass.");
  process.exit(2);
}
const PHASES = [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]);

const manifests = [];
for (const name of fs.readdirSync(PKG_DIR).sort()) {
  const f = path.join(PKG_DIR, name, "package.json");
  if (fs.existsSync(f)) manifests.push(JSON.parse(fs.readFileSync(f, "utf8")));
}
if (manifests.length < 2) {
  console.error(`FAIL  found ${manifests.length} manifest(s). Nothing was drawn.`);
  process.exit(2);
}

/* A package sits in the earliest phase any of its checks declares. core has checks in four phases
   and is infrastructure rather than a step, so it is drawn as the spine underneath. */
const phaseIndex = Object.fromEntries(PHASES.map((p, i) => [p, i]));
const placed = [];
/* One entry per (package, phase), not per package. Taking only the earliest phase dropped scope
   and close from the diagram entirely — core has checks in four phases, and the two it owns alone
   are the freeze and the close, which is to say the last two hard stops. The chain ended three
   lanes early and looked complete. */
for (const j of manifests) {
  const agents = (j.owns && j.owns.agents) || [];
  const phases = [...new Set((j.checks || []).map((c) => c.phase).filter((p) => p in phaseIndex))];
  for (const phase of phases) {
    placed.push({
      name: j.name,
      phase,
      agent: agents.length ? agents[0].replace(/\.md$/, "") : null,
      agents: agents.length,
      checks: (j.checks || []).filter((c) => c.phase === phase).length,
      fanOut: /researcher|discoverer|evaluator/.test(agents.join(" ")),
      infra: j.name === "core",
    });
  }
}
/* core has checks in four phases and is the spine rather than a step. It is drawn in a lane only
   where it is the ONLY thing acting — the freeze and the close are real phases with real stops, and
   dropping them because core owns them left the diagram ending three phases early. */
const soloCore = new Set(PHASES.filter((p) =>
  placed.some((x) => x.phase === p && x.infra) && !placed.some((x) => x.phase === p && !x.infra)));
const used = PHASES.filter((p) => placed.some((x) => x.phase === p));
const visible = (p) => placed.filter((x) => x.phase === p && (!x.infra || soloCore.has(p)));

/* Stops are human decisions. No manifest knows one exists, so they are declared, and declared next
   to the phase they follow so a reader can see which work each one gates. */
const STOPS = [
  { after: "intake", kind: "hard", label: "engagement scope" },
  { after: "discover", kind: "soft", label: "audience profile" },
  { after: "analyse", kind: "soft", label: "the problem, restated" },
  { after: "design", kind: "hard", label: "the design system" },
  { after: "scope", kind: "hard", label: "PRD · scope · demo" },
];

/* ---- render -------------------------------------------------------------- */
const W = 1180, LANE_H = 92, PAD = 40, TOP = 96;
const H = TOP + used.length * LANE_H + 96;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const L = [];
L.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`);
L.push(`<rect width="${W}" height="${H}" fill="#0d1117"/>`);
L.push(`<text x="${PAD}" y="46" fill="#e6edf3" font-size="22" font-weight="600">pica ${manifests.length} packages · ${manifests.reduce((a, j) => a + (((j.owns || {}).agents || []).length), 0)} agents · ${used.length} phases</text>`);
L.push(`<text x="${PAD}" y="70" fill="#8b949e" font-size="13">Generated from the package manifests. Lanes are phases, boxes are packages, stops are where a human decides.</text>`);

used.forEach((phase, i) => {
  const y = TOP + i * LANE_H;
  L.push(`<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#21262d" stroke-width="1"/>`);
  L.push(`<text x="${PAD}" y="${y + 26}" fill="#7d8590" font-size="11" letter-spacing="1.4">${esc(phase.toUpperCase())}</text>`);

  const inPhase = visible(phase);
  let x = PAD + 132;
  for (const p of inPhase) {
    const w = Math.max(150, p.name.length * 9 + 58);
    L.push(`<rect x="${x}" y="${y + 12}" width="${w}" height="52" rx="4" fill="#161b22" stroke="#30363d"/>`);
    L.push(`<text x="${x + 14}" y="${y + 33}" fill="#e6edf3" font-size="13" font-weight="600">${esc(p.name)}</text>`);
    const sub = p.agent ? `${p.agent.replace("pica-", "")}${p.fanOut ? " ×3–5" : ""}` : "main thread";
    L.push(`<text x="${x + 14}" y="${y + 51}" fill="#7d8590" font-size="11">${esc(sub)} · ${p.checks} check${p.checks === 1 ? "" : "s"}</text>`);
    x += w + 14;
  }

  const stop = STOPS.find((s) => s.after === phase);
  if (stop) {
    const hard = stop.kind === "hard";
    const sx = W - PAD - 232;
    L.push(`<rect x="${sx}" y="${y + 14}" width="232" height="48" rx="4" fill="${hard ? "#2d1618" : "#1c1a11"}" stroke="${hard ? "#8b3a3a" : "#7a6a2a"}"/>`);
    L.push(`<text x="${sx + 12}" y="${y + 33}" fill="${hard ? "#f0857d" : "#d4b352"}" font-size="11" font-weight="600">${hard ? "⏸ STOPS HERE" : "▸ shown, continues"}</text>`);
    L.push(`<text x="${sx + 12}" y="${y + 51}" fill="#8b949e" font-size="11">${esc(stop.label)}</text>`);
  }
});

const yEnd = TOP + used.length * LANE_H;
L.push(`<line x1="${PAD}" y1="${yEnd}" x2="${W - PAD}" y2="${yEnd}" stroke="#21262d"/>`);
L.push(`<text x="${PAD}" y="${yEnd + 28}" fill="#7d8590" font-size="11" letter-spacing="1.4">UNDERNEATH</text>`);
L.push(`<text x="${PAD + 132}" y="${yEnd + 28}" fill="#8b949e" font-size="12">core — the state schema, every gate, pica-verify, intake, the freeze and the close. Not a step; everything depends on it.</text>`);
L.push(`<text x="${PAD}" y="${yEnd + 58}" fill="#6e7681" font-size="11">Regenerate with scripts/flow-diagram.mjs. A diagram nobody generates is a diagram that disagrees with the code and looks authoritative doing it.</text>`);
L.push("</svg>");
const svg = L.join("\n") + "\n";

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : null;
  if (cur === svg) { console.log(`flow diagram is current (${used.length} phases, ${placed.length} packages).`); process.exit(0); }
  console.log("STALE  assets/flow.svg does not match the manifests.");
  console.log("       Run `node scripts/flow-diagram.mjs`. A diagram that disagrees with the code is");
  console.log("       worse than none: it is wrong and it looks authoritative.");
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, svg);
console.log(`wrote assets/flow.svg — ${used.length} phase(s), ${placed.length} package(s), ${STOPS.length} stop(s)`);
