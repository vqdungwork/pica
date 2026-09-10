/**
 * permissions-check.mjs — who may do what to which thing, answered rather than assumed.
 *
 * BABOK names the roles-and-permissions matrix as a technique for exactly this knowledge area, and
 * pica has been asking for half of it in the wrong place since 0.8.0: the contract demanded a
 * data-ownership table at INTAKE, "per entity, who owns it and what this surface may create, change
 * or only read" — before anybody knew what the entities were. It belongs after the domain model.
 *
 * This is the artefact that makes an admin console designable. Without it the designer guesses at
 * scope per role, and a leak between roles arrives looking like a layout choice.
 *
 * Four checks:
 *
 *   1. CELL ANSWERED   every entity × role pair carries a value. An ABSENT cell is a question
 *                      nobody asked; "" is the answer "no access". Those are different, and a
 *                      check that conflated them would contradict its own instruction.
 *   2. ENTITY OWNED    something can create every entity. An entity nothing creates arrives by magic.
 *   3. ROLE KNOWN      every role in the matrix is a stakeholder the register names.
 *   4. USE CASE BACKS  no permission that no use case justifies. A role that may delete something no
 *                      use case has it deleting is a missing use case or a permission that should
 *                      not exist, and both are worth finding before the console is built on it.
 *
 * Usage: node permissions-check.mjs <state.json>
 */
import fs from "fs";

const [, , statePath] = process.argv;
if (!statePath) { console.error("usage: node permissions-check.mjs <state.json>"); process.exit(2); }

let state;
try { state = JSON.parse(fs.readFileSync(statePath, "utf8")); }
catch (e) {
  console.error(`FAIL  ${statePath} could not be read or parsed (${e.message}). Nothing was checked.`);
  process.exit(2);
}

const matrix = state.rolesPermissions;
if (!matrix || !Object.keys(matrix).length) {
  console.log("NOT APPLICABLE  state.rolesPermissions is absent, so the modeller has not drawn it yet.");
  console.log("                Nothing was checked. This is an abstention, not a pass.");
  process.exit(0);
}

const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });
const OPS = ["c", "r", "u", "d"];

const entities = (state.domainModel || []).map((e) => String(e.entity ?? e.name ?? "")).filter(Boolean);
const roles = [...new Set(Object.keys(matrix))];
const stakeholders = new Set((state.stakeholders || [])
  .map((s) => String(s.role ?? s.name ?? s).toLowerCase()));

/* Every use case names an actor and, ideally, what it does to what. Where a use case declares
   `touches`, that is the justification a permission needs. Where none do, check 4 abstains rather
   than inventing a standard the project was never told about. */
const justified = new Set();
let anyTouches = false;
for (const uc of state.useCases || []) {
  const actor = String(uc.actor || "").toLowerCase();
  for (const t of uc.touches || []) {
    anyTouches = true;
    const ent = String(t.entity ?? t).toLowerCase();
    for (const op of String(t.ops ?? "crud").toLowerCase()) justified.add(`${actor}|${ent}|${op}`);
  }
}

let cellBad = 0, ownedBad = 0, roleBad = 0, backedBad = 0, cells = 0;

/* ---- 1. CELL ANSWERED & 3. ROLE KNOWN ---- */
for (const role of roles) {
  if (stakeholders.size && !stakeholders.has(role.toLowerCase())) {
    roleBad++;
    fail("role-known", `role "${role}"`,
      "is in the matrix and not in the stakeholder register. A role nobody listed is a role nobody " +
      "interviewed, and it will be the one that blocks the project in week nine.");
  }
  const row = matrix[role] || {};
  for (const ent of entities) {
    cells++;
    const cell = row[ent];
    /* "" IS an answer — it means no access — and the message below says so. Treating it as
       unanswered would contradict the instruction the check itself gives, and a check that
       does that teaches people to stop reading it. Only absent is absent. */
    if (cell === undefined || cell === null) {
      cellBad++;
      fail("cell-answered", `${role} × ${ent}`,
        'carries no value. Write "" for no access if that is the answer — a blank cell and an ' +
        "unasked question look identical, and only one of them is safe to build on.");
      continue;
    }
    const ops = String(cell).toLowerCase().replace(/[^crud]/g, "");
    /* ---- 4. USE CASE BACKS ---- */
    if (!anyTouches) continue;
    for (const op of ops) {
      if (justified.has(`${role.toLowerCase()}|${ent.toLowerCase()}|${op}`)) continue;
      backedBad++;
      fail("use-case-backs", `${role} may "${op}" ${ent}`,
        "and no use case has them doing it. Either a use case is missing or the permission is, and " +
        "the second one is how a console ends up able to delete things nobody intended.");
    }
  }
}

/* ---- 2. ENTITY OWNED ---- */
for (const ent of entities) {
  const creators = roles.filter((r) => String((matrix[r] || {})[ent] || "").toLowerCase().includes("c"));
  if (creators.length) continue;
  ownedBad++;
  fail("entity-owned", `${ent}`,
    "can be created by nobody in the matrix. Either a role is missing a permission, or the entity " +
    "arrives from somewhere the model does not describe — an import, an integration — and that " +
    "belongs in the model too.");
}

const table = [
  ["cell-answered", cellBad, `${cells} cell(s): ${roles.length} role(s) × ${entities.length} entity(ies)`],
  ["entity-owned", ownedBad, `${entities.length} entity(ies)`],
  ["role-known", roleBad, stakeholders.size ? `${stakeholders.size} stakeholder(s) registered`
    : "no stakeholder register, so roles were not cross-checked"],
  ["use-case-backs", backedBad, anyTouches ? `${justified.size} justified permission(s) from use cases`
    : "no use case declares what it touches, so permissions were not cross-checked"],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(18)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  for (const f of findings) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
}
console.log(`\n${findings.length} finding(s).`);
process.exit(findings.length ? 1 : 0);
