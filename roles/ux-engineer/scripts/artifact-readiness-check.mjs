#!/usr/bin/env node
/* Can this build actually run as a Claude Artifact?
 *
 * Handing a client a link they can open, poke at, and COMMENT ON — a comment thread attached to
 * the thing itself rather than a list of remarks in an email — is the cheapest correction loop
 * this process has. But an artifact runs in a locked-down frame, and a build that works on a dev
 * server can be inert there in ways nothing else in this suite looks at: a blocked font, a
 * cross-origin fetch that silently never resolves, a download button that does nothing.
 *
 * This reads the built output and reports what the frame will refuse. It cannot prove the page
 * works — only that it does not obviously depend on something the frame does not allow.
 *
 * Usage: artifact-readiness-check.mjs --dir demo/dist [--entry index.html] [--max-mb 16]
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = arg("--dir", "");
const entry = arg("--entry", "index.html");
const maxMB = Number(arg("--max-mb", 16));
const fails = [];
const fail = (id, msg) => fails.push(`  [${id}] ${msg}`);

if (!dir || !existsSync(dir)) {
  console.log(`artifact-readiness-check: SKIPPED — ${dir || "no --dir"} does not exist, so nothing was read. This is not a pass.`);
  process.exit(0);
}

const walk = (d) => readdirSync(d, { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const files = walk(dir);
/* An EMPTY directory means nothing was built here, which is an abstention. Reporting it as "no
 * entry point" reads as a broken build and sent the mutation harness a false dirty-fixture report
 * after it had correctly undone its own files. */
if (!files.length) {
  console.log(`artifact-readiness-check: SKIPPED — ${dir} is empty, so nothing was read. This is not a pass.`);
  process.exit(0);
}
const text = files.filter((f) => [".html", ".js", ".mjs", ".css", ".json"].includes(extname(f)));
const src = Object.fromEntries(text.map((f) => [f, readFileSync(f, "utf8")]));
const html = files.find((f) => f.endsWith(entry));

/* The allowlist the artifact frame enforces. Everything else is refused with no visible error,
 * which is the dangerous part: the page looks fine and one piece of it silently never arrives. */
const SCRIPT_HOSTS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net/npm/", "unpkg.com", "cdn.tailwindcss.com", "code.jquery.com"];
const STYLE_HOSTS = ["fonts.googleapis.com"];
const FONT_HOSTS = ["fonts.gstatic.com"];

for (const [f, s] of Object.entries(src)) {
  for (const m of s.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    const u = m[1];
    if (/^https?:\/\//.test(u) && !SCRIPT_HOSTS.some((h) => u.includes(h)))
      fail("artifact-blocked-resource", `${f} loads a script from ${new URL(u).host}, which the artifact frame refuses silently. Allowed: ${SCRIPT_HOSTS.join(", ")}`);
  }
  for (const m of s.matchAll(/<link[^>]+href=["'](https?:\/\/[^"']+)["']/g)) {
    const u = m[1];
    if (!STYLE_HOSTS.concat(FONT_HOSTS).some((h) => u.includes(h)))
      fail("artifact-blocked-resource", `${f} loads a stylesheet from ${new URL(u).host}. Only ${STYLE_HOSTS.join(", ")} is allowed; inline everything else`);
  }
  for (const m of s.matchAll(/(?:fetch|XMLHttpRequest|WebSocket)\s*\(\s*["'`](https?:\/\/[^"'`]+)/g))
    fail("artifact-blocked-resource", `${f} calls out to ${new URL(m[1]).host} at runtime. Cross-origin requests are refused; ship the data with the page`);
  if (/<iframe|<object|<embed/.test(s))
    fail("artifact-blocked-resource", `${f} embeds another document. Iframes, object and embed are refused — link out instead`);
  if (/\bwindow\.print\s*\(/.test(s))
    fail("artifact-inert-control", `${f} calls window.print(), which does nothing in the frame. Do not offer a Print or Save-as-PDF button`);
  if (/(?:^|[^.\w$])(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(s))
    fail("artifact-inert-control", `${f} uses alert/confirm/prompt. The frame never shows them: confirm() returns false and prompt() returns null immediately. Build the step into the page`);
  /* Markup only for this one. A bundler's minified output contains the framework's own attribute
   * table — `case "download":` — and scanning JS for the word reported React itself as a download
   * link. A check that cannot tell a library's internals from the page's behaviour will cry wolf
   * on every build. */
  const isMarkup = extname(f) === ".html";
  if (isMarkup && /<a[^>]+\bdownload\b/.test(s))
    fail("artifact-inert-control", `${f} offers a download link, which is inert for viewers. Show the content instead, or offer copy-to-clipboard`);
  if (!isMarkup && /\.download\s*=\s*["'`]/.test(s))
    fail("artifact-inert-control", `${f} sets a download filename in script. Script-driven saves are inert in the frame`);
  if (/<form[^>]+action=["']https?:/.test(s) || /<form[^>]+action=["']mailto:/.test(s))
    fail("artifact-inert-control", `${f} points a form at a real action. A submission has nowhere to go — handle submit in script with preventDefault()`);
}

if (!html) {
  fail("artifact-no-entry", `${dir} holds no ${entry}`);
} else {
  const s = src[html] ?? "";
  if (!/<title>[^<]{2,}<\/title>/.test(s))
    fail("artifact-no-title", `${entry} has no <title>. The title names the artifact in the gallery and the browser tab`);
  if (!/<meta[^>]+name=["']viewport["']/.test(s))
    fail("artifact-not-responsive", `${entry} declares no viewport meta, so it will not lay out on a phone`);
  // state carried in the query string never survives: only a bare #anchor reaches the page
  for (const [f, t] of Object.entries(src))
    if (/location\.search|URLSearchParams\s*\(\s*(?:window\.)?location\.search/.test(t)) {
      fail("artifact-state-in-the-url",
        `${f} reads the query string. An artifact link delivers only a bare #anchor — no query string and no #key=value — ` +
        "so every deep link into a screen or state will land on the default view");
      break;
    }
}

const bytes = files.reduce((t, f) => t + statSync(f).size, 0);
if (bytes > maxMB * 1024 * 1024)
  fail("artifact-too-large", `${(bytes / 1024 / 1024).toFixed(1)}MB exceeds the ${maxMB}MB limit`);

if (fails.length) {
  console.error(`FAIL  artifact-readiness-check  ${fails.length} finding(s)   (${files.length} file(s) in ${dir})\n` + fails.join("\n"));
  process.exit(1);
}
console.log(`pass  artifact-readiness-check  0 finding(s)   (${files.length} file(s), ${(bytes / 1024).toFixed(0)}KB)`);
