---
name: handing-over-as-an-artifact
description: Publish the built demo as a Claude Artifact so the client's corrections arrive as comment threads attached to the screen they are about.
argument-hint: "[the built demo directory, and what the client should look at first]"
intent: >-
  The correction loop is the expensive part of an engagement, not the building. A comment on the
  artifact carries its own location, so nothing has to be transcribed between the client's
  reaction and the record of it.
theme: handover
best_for:
  - "Putting a demo in front of a client where their remarks attach to the thing itself"
  - "Closing low-confidence assumptions by asking them on the screen that shows them"
  - "Keeping one stable link across review rounds so no thread is orphaned"
scenarios:
  - "The demo is built and somebody outside the team is about to see it for the first time"
  - "A review round produced twenty remarks in an email and nobody can tell which screen each is about"
  - "The assumptions register is a document the client has not read"
estimated_time: "20–40 minutes for the first publish, minutes per round after"
---


## Why this rather than a link and an email

The correction loop is the expensive part of a design engagement, not the building. A client who
opens a deployed demo writes back "the confirm screen is wrong" and now two people spend a day
working out which screen, which state, and what "wrong" meant.

A comment attached to the artifact carries its own location. The client marks the thing; the
thread is the finding. Nothing has to be transcribed, and nothing is lost between the reaction and
the record.

**This is a handover mechanism, not a hosting one.** It does not replace the demo's own repository
or its checks — it replaces the round trip.

## Before publishing: the frame refuses things, silently

An artifact runs in a locked-down frame. What it refuses, it refuses with no visible error, which
is the dangerous part — the page looks fine and one piece of it never arrives.

Run `artifact-readiness-check.mjs --dir <build output>` and fix what it names. The two that catch
a real demo every time:

**State in the query string never arrives.** Only a bare `#anchor` — letters, digits, `.` `_` `~`
`-` — reaches the page. No query string, no `#key=value`. A demo that deep-links its screens as
`?scr=WL-02&state=empty` will land every one of those links on its default view, and the client
will report a screen they were never shown. Encode the route as one token: `#WL-02-empty`.

**Cross-origin anything is refused.** Scripts only from the CDNs the check lists, stylesheets only
from Google Fonts, and no runtime `fetch` to another host at all. Mock data ships with the page.

Also inert, and worth knowing before a client finds them: `window.print()`, `alert`/`confirm`/
`prompt`, download links, real form submissions, iframes, camera and microphone.

## Publishing

Build first — `build-check.mjs` — because a demo that has only ever run on a dev server is a demo
nobody has built. On one project the production build had been broken for the entire engagement by
a stray brace in a stylesheet while every one of eleven checks passed against `npm run dev`.

Publish the built entry point with the Artifact tool, give it a short noun-phrase title and a
one-line description, and keep the same file path on every update so the link stays stable. The
client's URL must not change between rounds; a new link is a new thread and the old comments are
orphaned.

## What to say when you hand it over

Three things, in this order, and no more:

1. **What to look at** — the two or three flows that carry the decisions, named by what the client
   would call them, not by screen id
2. **What is deliberately unfinished** — the assumptions register, most consequential first, each
   as a question they can answer by commenting on the screen that shows it
3. **That nobody has used it yet** — evaluation is not user testing, and saying so is what keeps
   the comments honest

## Two forms, and they are not interchangeable

**The built application.** The demo itself, published so the client works it. It carries every
state, the interactions are real, and the frame's refusals apply in full — run
`artifact-readiness-check` first.

**The design canvas.** One artboard per screen laid out on an infinite canvas, from the Design
Artifact type: `project/canvas.json` as the index and one `.dc.html` per board, joined by
`<a href="Other.dc.html">` so a flow is clickable in Play. Section titles and sticky notes sit
beside the boards.

Pick the canvas when the conversation is about the DESIGN — which screens exist, what each state
looks like, what is still undecided. A client sees twelve screens at once and points at one. Pick
the built app when the conversation is about the BEHAVIOUR. Most engagements want the canvas
first and the app second.

**The canvas is a second copy of the screens, and a second copy diverges.** Say in the handover
which one is the source of truth — the repository is — and never fix a defect on the canvas alone.
A canvas whose screens no longer match the build is worse than no canvas, because the client
reviews the one they were given.

## Sizing an artboard

An artboard is the size of the DESIGN, not of a device. A 1280×800 frame holding 572px of content
shows the client a quarter-screen of nothing and reads as unfinished, however truthful "that is
what the viewport looks like" may be.

Measure where the ink actually ends and cut the frame to it, keeping the width — the width is a
layout decision and carries meaning; the trailing height carries none. Phone boards are the
exception: 390×844 is the design, because a phone screen's edges are part of it.

Keep `$preview` in each file equal to its `boards` entry. They drift silently.

## Reading the comments back

A comment is a finding with a location. Triage it the way a review finding is triaged:

- it names a **defect** → fix it, reply on the thread with what changed
- it names a **decision that was assumed** → this is the answer the assumptions register was
  waiting for; record it in state and say which assumption it closed
- it names a **new requirement** → it is scope, and it goes to the exclusions conversation, not
  into the build. Say so on the thread rather than quietly absorbing it

Answer every thread, including the ones you disagree with. A thread with no reply reads as a
finding that was ignored, and it is the cheapest way to lose a client's trust in the loop.

## When the type says not to verify

The Design type's own instructions end with "never verify unless the user asked" — do not render,
screenshot or open the canvas after publishing. Follow that: it is the type's contract, and the
canvas is theirs to look at.

It also means the artboards ship unmeasured, so **measure them before publishing**, locally: render
each `.dc.html` with its `<helmet>` styles in a browser at the declared frame, and check the frame
matches `boards`, nothing spills out, nothing overflows, every hit area clears the floor and every
text clears contrast. Four of nine boards failed that on a first pass, and three of the four were
real.

## Done when

- `build-check` and `artifact-readiness-check` both pass on the built output
- the artifact opens at phone width and at desktop width
- every deep link the handover message quotes actually lands where it says
- the assumptions register is visible from inside the demo, not only in a document
