#!/usr/bin/env node
/**
 * Fails when a URL-addressable demo answers an unrecognised parameter — or an unrecognised value
 * for a known one — by quietly rendering something else.
 *
 * Every pica demo is addressed by URL so that a state can be linked, screenshotted and argued
 * about. That makes the URL the review instrument, and an instrument that silently substitutes
 * its default is worse than one that breaks: `?viewport=mobile` on an app that reads `vp` returns
 * the DESKTOP frame in a narrow window, and the reviewer captures it, looks at it, and reasons
 * about it as the phone. On one engagement that happened three times, twice while the reviewer was
 * specifically checking a claim that mobile had never been reviewed — so the harness defect
 * manufactured the exact false conclusion the review existed to test.
 *
 * The check is deliberately crude, because the guarantee is crude: request a route with a
 * parameter nothing could plausibly accept, and assert the page does NOT render a screen.
 *
 *   node url-param-guard.mjs --url http://localhost:5173/ [--screen-selector .frame]
 *       [--params viewport,mode] [--valid "vp=mobile&scr=WL-02"]
 *
 * SKIPPED (exit 0, and says so) when playwright is absent or the URL does not answer: an
 * abstention is reported as an abstention, never folded into a pass.
 */
/* The check ids this script reports, declared so rule-coverage-check can read them. */
const CHECKS = ["url-param-guard"];

const args = process.argv.slice(2);
const arg = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);

const url = arg("--url");
const sel = arg("--screen-selector", ".frame");
const bogus = arg("--params", "viewport,mode,theme_").split(",").map((s) => s.trim()).filter(Boolean);
const valid = arg("--valid", "");

if (!url) {
  console.log("url-param-guard: SKIPPED — no --url given, so no demo was driven. This is not a pass.");
  process.exit(0);
}

let chromium;
try { ({ chromium } = await import("playwright")); }
catch {
  console.log("url-param-guard: SKIPPED — playwright is not installed here. This is not a pass.");
  process.exit(0);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 940 } });
const findings = [];
const sep = (u) => (u.includes("?") ? "&" : "?");

try {
  // The control first. A guard that "passes" because NOTHING ever renders proves nothing, so the
  // valid route must render a screen before any rejection below is allowed to count.
  const control = valid ? `${url}${sep(url)}${valid}` : url;
  // A URL that does not answer is an abstention, not a finding and not a crash. The docstring
  // already promised this; the code threw instead, and the throw surfaced as a failing baseline
  // in pica's own mutation gate rather than as the SKIPPED line it was supposed to be.
  try { await page.goto(control, { waitUntil: "networkidle" }); }
  catch {
    console.log(`url-param-guard: SKIPPED — nothing answered at ${control}. This is not a pass.`);
    await browser.close();
    process.exit(0);
  }
  const controlRendered = await page.locator(sel).count();
  if (controlRendered === 0) {
    console.log(`url-param-guard: SKIPPED — the valid route rendered no "${sel}", so a rejection below would prove nothing. This is not a pass.`);
    await browser.close();
    process.exit(0);
  }

  for (const key of bogus) {
    const u = `${control}${sep(control)}${key}=mobile`;
    await page.goto(u, { waitUntil: "networkidle" });
    if (await page.locator(sel).count() > 0) {
      findings.push([`unknown parameter "${key}"`, u]);
    }
  }
  // An unknown VALUE for a known key is the same defect wearing a familiar name.
  if (valid) {
    const [k, v] = valid.split("&")[0].split("=");
    const typo = `${url}${sep(url)}${valid.replace(`${k}=${v}`, `${k}=${v}__nonexistent`)}`;
    await page.goto(typo, { waitUntil: "networkidle" });
    if (await page.locator(sel).count() > 0) findings.push([`unknown value for "${k}"`, typo]);
  }
} finally {
  await browser.close();
}

if (findings.length === 0) {
  console.log(`url-param-guard: every unrecognised parameter and value refused to render "${sel}"`);
  process.exit(0);
}
for (const [what, u] of findings) {
  console.error(`FINDING  [${CHECKS[0]}] ${what} still rendered a screen\n         ${u}`);
}
console.error(`\n${findings.length} finding(s). A reviewer who mistypes a parameter is handed a confident screenshot of the wrong state.`);
process.exit(1);
