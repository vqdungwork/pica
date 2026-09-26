# Content rules

Load this while screens are being built, at 3.4 and 3.5, and again at 7.5 when the words go into code.

**A screen without real words has not been designed.** Length changes layout, tone changes the product,
and the writing that matters most lives in the states nobody demos.

---

## Terms come from the glossary, always

The interface may not invent a third word for a thing the business and the database already agree on.

The client says "consignment", the schema says `consignment`, and the screen says "shipment". Nobody
notices until a support ticket about shipments cannot be reproduced, because that word appears nowhere
in the product.

Every label, button, heading, empty state and error message is checked against `glossary`. A term the
glossary declares in `notOurTerm` is a defect, not a stylistic choice.

---

## Length-realistic, never lorem

Use the **longest plausible real value**, not the prettiest one.

A name field designed around "Anna" breaks on a real roster. A card designed around "Read" breaks on
"Read twenty pages of something long before bed". The layout that survives is the one that was drawn
against the worst case, and the worst case is ordinary in production.

Lorem ipsum is worse than wrong: it is uniformly medium-length, so it makes every layout look fine.

---

## Every state needs its words

The state matrix at 3.0c lists them. Each one is a writing task:

| State | Must say |
|---|---|
| **Empty** | Why it is empty, and how to fill it. "No habits yet" is half a sentence |
| **Loading** | What is happening, if it will take long enough to notice |
| **Error** | **What happened, and what to do next.** An error that only says what happened is a dead end |
| **Long content** | Nothing extra, but it must survive without truncating meaning |
| **Unauthorised** | Why, and who to ask. Not "forbidden" |
| **Success** | What changed, and where it went |

An error message that says "Something went wrong" tells the user nothing and tells support less.

---

## Mock data is where quiet wrongness lives

**Realistic-looking data is self-certifying, and that is what makes it dangerous. Nobody checks a
screen that reads correctly.**

Four defect shapes recur, and every one of them renders as a plausible screen: a name paired with
somebody else's job title, an identifier that belongs to a different record in the same set, a feed whose
newest item predates the screen's own "today", and an item no screen in the flow could have produced.

So:

- **Cross-reference against the source, and assert ownership rather than membership.** Confirming a
  value exists somewhere in the data is exactly why an identifier belonging to somebody else passed
- **Bind each value to the nearest name in the markup**, and **strip relationship fields**
  (`manager`, `approver`, `reviewer`) first, or a row resolves to the person it references instead of
  the person it is about
- **Identify a row by the name beside it, never by initials.** In a 32-person roster, 14 initial forms
  were ambiguous
- **A nullable field is two states and both are content.** If 12 of 32 people have a photo and 9 are
  usable, the prototype shows photographs and initials side by side, because that is what the product
  renders. Filling the gap with a generated face designs away a state the build has to handle
- **Internal consistency is a check, not a proofread.** Dates monotonic against the screen's own today,
  counts equal to the rows they count, every referenced entity reachable from some screen

---

## House rules become executables

A rule stated in conversation lasts about a day. Each one goes into `copyRules` with something that
greps for it.

```json
"copyRules": [
  { "rule": "no em dash in product copy", "pattern": "—", "expect": 0 },
  { "rule": "wordmark is picaFlow, never Picaflow", "pattern": "(?i)picaflow", "exactCase": "picaFlow" }
]
```

Two details a punctuation ban needs before it can run, and both were found by running one: **script,
style and comment text are not product copy** and must be skipped, and **a mark at the boundary between
two inline tags is joining them**, so deleting it welds two words together. Substitute by what follows
the mark rather than deleting blindly.

---

## Restricted claims come from the domain

`domainConstraints` carries a `restricted claims` category. Medical outcomes, investment returns and
legal advice are not phrasing preferences: they are the sentences that turn a product into a liability.

Every restricted claim becomes a `copyRule` with a pattern, or it is not being enforced.

---

## Definition of done

- [ ] Zero lorem ipsum, zero placeholder text, in any state
- [ ] Every interface term appears in `glossary`, none appear in `notOurTerm`
- [ ] Every error says what happened **and what to do next**
- [ ] Every empty state says why it is empty and how to fill it
- [ ] Longest realistic value used, not the shortest
- [ ] Every `copyRule` has a pattern and returns its expected count
- [ ] Mock data bound to the nearest real name, relationship fields stripped first
- [ ] Nullable fields shown in both states where both occur in the source
- [ ] `copy-check.mjs` returns zero

## The rule goes in the sentence; its identifier stays in the PRD

<!-- enforced-by: internal-reference-check -->

Analysis numbers its rules so they can be argued about — BR-06, FR-16a, NFR-02. The person writing
the screen is reading the rule while they write the sentence, so the citation comes along, and on
the page it feels like provenance. It is not. *"Quản lý không thể tự sửa gì ở đây (BR-06)"* tells a
director nothing they can act on, and tells them what they are looking at was assembled out of a
document they have never seen.

Seven of these shipped into one demo, across five screens, each written weeks apart — which is the
signature of a defect that needs a check rather than a reviewer: nobody writes them all in one
sitting, so nobody ever sees them together, and each one looks defensible on its own.

Cite the rule in a comment beside the code that implements it, where the citation earns its keep
and no user meets it. `internal-reference-check.mjs` reads text nodes and the attributes a screen
reader speaks, and deliberately ignores comments and props.

## Read it as the person who receives it, not as the person who wrote it

<!-- enforced-by: none — judgement, not decidable by a script -->

A specification is signed by someone who knows the business and not the method. Reading it in
their chair, out loud, finds in ten minutes what a week of building did not — and the published
plain-language test is exactly that: can the intended reader **find** what they need, **understand**
what they find, and **use** it. Every defect below came from that reading of a document its author
thought was finished.

**The title was a machine field.** `Đặc tả — professional services` — the sector key, printed as a
headline. The reader looks for their own product and meets an industry classification. The title
is the product's name.

**The opening paragraph was the analyst's evidence note**, ending *"interviews=0, xem
docs/as-is.md"*, and then cut mid-word by a 300-character slice. The first paragraph is the one
thing everybody reads. Write it; never slice a field into it.

**Half the pictures were in English.** `work item`, `assignee`, `unconfirmed` — in a Vietnamese
document, drawn from a glossary that already held `việc`, `người được giao`, `chưa xác nhận`, and
which no diagram had ever consulted. Keep the original term in a quiet mono label beside the
translation: both readers exist, and only one of them decides.

**A permissions matrix read `r` and `cru`**, twenty times, with no key anywhere on the page. That
is not a dense notation, it is an unanswered question printed twenty times. `xem`, `tạo · xem`,
`tạo · xem · sửa` are words the reader already has.

**Numbering implied an order that did not exist.** Cards numbered 01–07 down a lane told the
reader that three independent triggers were steps two, three and four of a process. Number the
*stage*, so things that happen at the same time share a number, and say which cards merely start
a chain.

**Emphasis by SHOUTING.** `KÉO`, `ĐẨY`, `MỌI`, `THEO NGƯỜI` — how a register gets read back by the
person who wrote it, not how anyone wants to be spoken to. Bold carries emphasis; capitals carry
volume.

**Text cut mid-word.** `Xem một dự án đang chạy t` is not a shorter label, it is a broken one, and
it appeared on every card with more than one next step. Cut at a word, or show one label whole and
count the rest.

The habit underneath all seven: a document assembled from a register inherits the register's
voice. Someone has to read it as the recipient before it goes out, and that someone cannot be the
register.
