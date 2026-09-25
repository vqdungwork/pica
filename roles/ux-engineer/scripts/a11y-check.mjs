/**
 * a11y-check.mjs: the half of design the geometry checks cannot see.
 *
 * This did not exist, and could not have been written, until the capture recorded what
 * a control IS rather than only where it sits. The evidence that it was needed: a
 * project passed `verify-html`, `contrast-check`, `spacing-check` and `parity-check` —
 * 664 contrast runs, zero overflow, every assertion green — and shipped a product that
 * could not be operated without a mouse. Converting all 68 buttons in a board to divs
 * produced byte-identical output from every existing check.
 *
 * `contrast-check` already owns colour. This owns everything else, and deliberately
 * checks only what the artefact can prove:
 *
 *   1. KEYBOARD REACH   a control a pointer can use, a keyboard cannot. The single
 *                       most common way a product becomes unusable while looking fine.
 *   2. FOCUS VISIBLE    a focusable control with no focus outline. A keyboard user
 *                       loses their place and there is nothing on screen to find.
 *   3. TARGET SIZE      against WCAG 2.5.5. The capture has held control sizes since
 *                       the controls array existed and nothing ever compared them.
 *   4. ACCESSIBLE NAME  a control a screen reader announces as "button".
 *   5. NAME IN ROLE     a div carrying a click handler and no role, which is a button
 *                       to a mouse and nothing at all to assistive technology.
 *
 * WHAT IT CANNOT DO: judge whether a name is GOOD, whether the tab order is sensible,
 * or whether a live region announces at the right moment. Those need a person. It
 * finds the ones that are decidable, which is most of them.
 *
 * Usage: node a11y-check.mjs <html-reference.json> <state.json>
 */
import fs from "fs";

const [, , refPath, statePath] = process.argv;
if (!refPath || !statePath) {
  console.error("usage: node a11y-check.mjs <html-reference.json> <state.json>");
  process.exit(2);
}
let ref, state;
try {
  ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
  state = JSON.parse(fs.readFileSync(statePath, "utf8"));
} catch (e) {
  console.error(`FAIL  could not read an input (${e.message}).`);
  process.exit(2);
}

const frames = [];
for (const [pkg, list] of Object.entries(ref.frames || {}))
  for (const f of list) frames.push({ ...f, pkg });

if (!frames.length) {
  console.error("FAIL  the capture contains no frames. Nothing was checked, which is not a pass.");
  process.exit(2);
}

/* A control captured before this check existed is [tag,x,y,w,h,parent,class] with no
 * eighth element. Measuring those would report every control as nameless and
 * unfocusable, which is a false finding about an old artefact, not a finding about the
 * product. Refuse rather than lie. */
const withMeta = frames.flatMap((f) => (f.controls || []).map((c) => ({ f, c, m: c[7] })));
if (!withMeta.length || withMeta.every((x) => !x.m)) {
  console.error("FAIL  this capture predates the interaction record: no control carries role, tabindex,");
  console.error("      focusability or an accessible name. Re-capture before reading any result here.");
  console.error("      A pass over an artefact that cannot answer the question is not a pass.");
  process.exit(2);
}

const TARGET_MIN = Number(state.a11y?.targetMin ?? 44);   /* WCAG 2.5.5 AA */
const exempt = new Set((state.a11yExemptions || []).map((e) => String(e.control ?? e).trim()));
const findings = [];
const fail = (check, where, detail) => findings.push({ check, where, detail });

let controls = 0, interactive = 0, unreachable = 0, noFocus = 0, small = 0, unnamed = 0, roleless = 0;

for (const { f, c, m } of withMeta) {
  if (!m) continue;
  const [tag, x, y, w, h, , cls] = c;
  const where = `${f.pkg} :: ${f.cap} :: ${tag}${cls ? "." + cls.split(/\s+/)[0] : ""}`;
  const key = `${tag}.${(cls || "").split(/\s+/)[0]}`;
  if (m.hidden) continue;
  controls++;

  /* Does this thing behave like a control? A click target, a declared role, or a
   * native control. An <a> with no href is neither a link nor a button. */
  const nativeCtl = ["button", "input", "select", "textarea", "summary"].includes(tag);
  /* A control's CLASS is a guess and the guess needs corroborating. `.chip` is worn by
   * filter controls and by static status labels alike, so class alone reported ten
   * decorative spans per screen as pointer-operable and keyboard-unreachable. A check
   * that cries wolf on correct markup gets skimmed past, and then it is worth nothing on
   * the day it is right. Class PLUS evidence: a handler, a nav verb, a role, or a
   * tabindex. Older captures carry no `verb` field, so they fall back to the class alone
   * rather than silently reporting nothing. */
  const hasVerb = m.verb === undefined ? true : !!m.verb;
  const clickish = (/\b(btn|button|navitem|tile|key|chip|swatch)\b/.test(cls || "")
      && (hasVerb || m.tabindex != null))
    || (m.role && /button|tab|switch|link|menuitem|option/.test(m.role));
  const looksInteractive = nativeCtl || clickish || (tag === "a");
  if (!looksInteractive) continue;
  interactive++;
  if (exempt.has(key) || exempt.has(where)) continue;

  /* 1. keyboard reach.
   * A DISABLED control is not a defect here. `disabled` removes an element from the tab
   * order by definition, so flagging it reports the platform behaving correctly — and
   * this check said so about every disabled primary action on a form, which is the one
   * place a disabled control is most likely to be right. target-size already excluded
   * them; this did not, and the two disagreed about the same element.
   * (A team that wants disabled controls announced uses aria-disabled on a focusable
   * control, which stays focusable and so never reaches this branch.) */
  if (!m.focusable && !m.disabled) {
    unreachable++;
    fail("keyboard-reach", where,
      `is operable by pointer and unreachable by keyboard${tag === "a" && !m.href ? " (an <a> with no href is not focusable)" : ""}. ` +
      `Give it a native control element, or an href, or tabindex="0" with a key handler`);
    continue;                       /* the rest are moot until it can be reached */
  }

  /* 2. focus visible.
   * Same exclusion, for the same reason: a control that cannot be focused cannot show a
   * focus outline, so measuring one on a disabled button reports the absence of something
   * that could not exist. Excluding it from keyboard-reach and then failing it here would
   * move the false finding rather than fix it.
   * The accessible-name check below still applies — a disabled control IS announced. */
  if (!m.focusOutline && !m.disabled) {
    noFocus++;
    fail("focus-visible", where,
      "is focusable and has no focus outline. A keyboard user reaches it and nothing on screen says so");
  }

  /* 3. target size */
  if ((w < TARGET_MIN || h < TARGET_MIN) && !m.disabled) {
    small++;
    fail("target-size", where,
      `is ${w}x${h}, under the ${TARGET_MIN}px floor (WCAG 2.5.5). Small targets are missed under time pressure, ` +
      `which is when this kind of product is used`);
  }

  /* 4. accessible name */
  if (!String(m.name || "").trim()) {
    unnamed++;
    fail("accessible-name", where,
      'has no accessible name: a screen reader announces it as "button" and nothing else. ' +
      "Give it text, a <label for>, an aria-label, or an aria-labelledby");
  }

  /* 5. a click target that is not a control to assistive technology */
  if (!nativeCtl && !m.role && m.tabindex != null) {
    roleless++;
    fail("name-role", where,
      "is focusable and carries no role, so assistive technology cannot say what it is. " +
      'Use a real element, or add role="button"');
  }
}

console.log(`controls captured:  ${controls} visible, ${interactive} interactive`);
console.log(`target floor:       ${TARGET_MIN}px (${state.a11y?.targetMin ? "from state.a11y.targetMin" : "WCAG 2.5.5 default"})`);
console.log(`exemptions:         ${exempt.size}`);
console.log("");

const table = [
  ["keyboard-reach",  unreachable, `${interactive} interactive control(s)`],
  ["focus-visible",   noFocus,     `${interactive - unreachable} reachable control(s)`],
  ["target-size",     small,       `${interactive - unreachable} reachable control(s), floor ${TARGET_MIN}px`],
  ["accessible-name", unnamed,     `${interactive - unreachable} reachable control(s)`],
  ["name-role",       roleless,    `${interactive} interactive control(s)`],
];
for (const [n, c, scope] of table)
  console.log(`${c ? "FAIL" : "pass"}  ${n.padEnd(16)} ${String(c).padStart(3)} finding(s)   (${scope})`);

if (findings.length) {
  console.log("");
  const shown = findings.slice(0, 30);
  for (const f of shown) console.log(`FINDING  [${f.check}] ${f.where}\n         ${f.detail}`);
  if (findings.length > shown.length) console.log(`... and ${findings.length - shown.length} more`);
}

console.log(`\n${findings.length} finding(s) over ${interactive} interactive control(s).`);
console.log("NOTE  this cannot tell you a name is GOOD, that the tab order is sensible, or that a live");
console.log("      region announces at the right moment. Those need a person. It finds the decidable ones.");
process.exit(findings.length ? 1 : 0);
