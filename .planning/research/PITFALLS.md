# Pitfalls Research: v1.2 In-app Feedback (prefilled GitHub issue)

**Domain:** Client-side prefilled GitHub-issue URL feedback in a static, no-backend React/Vite/GitHub-Pages SPA
**Researched:** 2026-06-17
**Confidence:** HIGH — GitHub's 8191-byte URL limit and prefill query params are officially documented; encoding/popup/markdown behaviors are well-established web-platform facts; repo-specific details from PROJECT.md / CLAUDE.md.

> NOTE: This file was rewritten for the **v1.2 feedback milestone**. The prior contents (v1.0 Ketcher/WASM/Vite pitfalls) are preserved in git history (`PITFALLS.md` at commits up to `cd24091`). If both sets are needed, restore the v1.0 version as `PITFALLS-v1-ketcher.md`.

> Scope: "Explain that InChI" is served at `/explain-that-inchi/` on GitHub Pages, repo `cm-beilstein/explain-that-inchi`. The feature builds a `https://github.com/cm-beilstein/explain-that-inchi/issues/new?...` URL entirely client-side from on-screen state (current InChI string, molecule SMILES + preset name, UA, app version) plus a user message + category. No network call leaves the page until the user clicks through to GitHub.

---

## Critical Pitfalls

### Pitfall 1: URL exceeds GitHub's 8191-byte server-side limit → 414 / silent truncation

**What goes wrong:**
GitHub's new-issue endpoint enforces a server-side limit of **8191 bytes** for the full request URL. Multi-fragment InChI strings (the app's recurring test molecule is ~190 chars; pathological structures are far longer) plus SMILES + UA + version + the user's prose + percent-encoding overhead (each special char → 3 bytes, each newline → `%0A`) can blow past this. Result: either a `414 URI Too Long` GitHub error page instead of a prefilled issue, or a body that GitHub/the browser silently clips — producing a broken issue missing the InChI it was meant to carry. Since the product's whole value is multi-fragment InChI, this is the single most likely real-world failure.

**Why it happens:**
Devs test with short single-component presets (benzene, caffeine) where the URL is ~1KB and never nears the cap, then ship. Encoded length is non-obvious: a 1500-char body of InChI/SMILES encodes to 3000+ bytes once `+ / ; , ( ) #` and newlines are percent-encoded, plus a fixed ~120 bytes of repo slug + param scaffold.

**How to avoid:**
- Build the final URL, then measure `new TextEncoder().encode(url).length` (byte length — NOT `.length`, which counts UTF-16 units and undercounts). Budget **~7500 bytes** (headroom below 8191 for GitHub redirect params / future scaffold growth).
- When over budget, **degrade deterministically**: truncate the InChI/SMILES context block with an explicit `…[truncated — paste full InChI manually]` marker; keep the user's prose + category intact (the human message matters more than auto-context). Shrink auto-context first (drop SMILES, keep InChI; trim UA) before touching the user's words. Never silently drop content.
- Offer "copy InChI to clipboard" in the over-budget path so the user can paste manually (reuse PLSH-04's existing copy-to-clipboard).

**Warning signs:** Feedback issues with empty / mid-string-cut bodies; users reporting a GitHub error page after clicking; QA only ever testing the 10 short presets.

**Phase to address:** URL-construction / context-capture phase. Add a budget-check unit test using the recurring multi-fragment repro molecule from HANDOFF.md as the worst-case fixture.

---

### Pitfall 2: Improper / double `encodeURIComponent` mangles the InChI and SMILES

**What goes wrong:**
InChI/SMILES are dense with chars that are reserved or special in query strings: `+` (decodes to space if unencoded), `/` (InChI layer separator `1S/C12H19N...`), `;` (component separator), `,` `(` `)` `#` `=` (SMILES). Without encoding, GitHub sees `+`→space, `/` splitting the path, or `#` truncating the body as a URL fragment — corrupting the exact InChI the feature exists to send. The mirror bug is **double-encoding**: pre-encoding a value with `encodeURIComponent` and then feeding it to `URLSearchParams` (which encodes again), so the issue shows literal `%2F`/`%2B` instead of `/`/`+`.

**Why it happens:**
Manual concat (`'?title=' + v + '&body=' + v`) without encoding "works" for alphanumeric test input; a later refactor adds `URLSearchParams` to one param but leaves a hand-encoded value → double-encoding. The `#` case is the nastiest: everything after an unencoded `#` is dropped as a fragment and never reaches the server, silently ending the body early.

**How to avoid:**
- Use **exactly one** encoding mechanism. Recommended: a single `URLSearchParams` object (`params.set('title', rawTitle); params.set('body', rawBody)`) — never pre-encode values you put into it. `.toString()` handles all reserved chars. (It encodes space as `+`, which GitHub accepts.)
- Add a round-trip unit test: encode an InChI containing `+ / ; , ( ) # =`, then `new URL(built).searchParams.get('body')` must equal the original raw string.

**Warning signs:** Issues showing `%2F`/`%2B`/`%23` literals (double-encoded), or bodies ending abruptly at the first `#` (unencoded fragment cutoff); InChI separators turning into spaces.

**Phase to address:** URL-construction phase. The round-trip test is the gate.

---

### Pitfall 3: Markdown injection / accidental @-mention pings via unfenced context

**What goes wrong:**
The issue `body` renders as GitHub-Flavored Markdown. If captured InChI/SMILES or the user's free text is dropped in unfenced: backticks break out of code spans; a line-leading `#` renders as an H1; `@username`/`@org/team` sends a **real notification ping**; `- [ ]` becomes a task list; `1.` starts a list. InChI/SMILES rarely contain `@`, but user prose can ("@maintainer this is broken"), and a malicious user could weaponize the prefill to mass-ping. SMILES legitimately contains `#` (triple bond) and `[N+]` brackets that interact with markdown.

**Why it happens:** Treating the body as plain text. Auto-context feels "safe" because it's machine-generated; the user message is fully attacker-controlled.

**How to avoid:**
- Wrap **all** auto-captured context (InChI, SMILES, UA, version) in fenced code blocks (```` ``` ````); markdown is inert inside a fence. Guard the rare case where content contains a closing fence by using a longer fence (` ```` `).
- Neutralize `@` in user prose so it renders visibly but doesn't notify (e.g. insert a zero-width space after `@`, or backtick-wrap mention-like tokens). At minimum, never place user text where `@` can ping.
- Don't build any raw HTML.

**Warning signs:** A SMILES `#` became a heading in a test issue; a maintainer pinged from a test submission; user message rendered as a giant H1.

**Phase to address:** Body-templating phase. Tests asserting context is fenced and `@` is neutralized.

---

### Pitfall 4: Popup/tab blocked because navigation isn't a direct user gesture

**What goes wrong:**
`window.open(url, '_blank')` from inside an async callback (e.g. after `await ketcher.getInchi(true)` or a `setTimeout`/debounce) loses the user-activation token browsers require → the popup is **silently blocked**. User clicks "Send feedback," nothing happens, no error. Safari/Firefox are strictest.

**Why it happens:** The InChI capture is async (app already uses `getInchi(true)` → Promise). The intuitive approach awaits InChI then opens — but by resolve time the gesture is "used up." Any `await` before `window.open` in the same handler breaks it.

**How to avoid:**
- Capture context **synchronously from already-computed Zustand state** at click time (the live InChI/SMILES/preset are already in the store — do NOT recompute InChI in the click handler). Build the URL synchronously, open in the same tick.
- Preferred: render a real `<a href={builtUrl} target="_blank" rel="noopener noreferrer">` with a reactively-updated `href` — native navigation, never blocked. If a `<button>` is needed for styling, call `window.open(url, '_blank', 'noopener')` synchronously in `onClick` with no preceding `await`.
- Always pass `noopener` (anchor `rel` or `window.open` features) so the GitHub tab can't reach `window.opener`.

**Warning signs:** "Nothing happens when I click feedback"; works in dev Chrome but blocked in Safari/Firefox; the open call sits after an `await`.

**Phase to address:** Entry-point/UI phase. Verify anchor approach; manual cross-browser click test.

---

## Moderate Pitfalls

### Pitfall 5: Pretending feedback is anonymous when it requires a GitHub account

**What goes wrong:** An accountless visitor clicks through, lands on GitHub's sign-in/sign-up wall — their feedback evaporates and they feel tricked. The audience (chemists/students) frequently has no GitHub account.

**Why it happens:** Devs all have GitHub accounts and forget the public audience doesn't; the accepted "no backend" tradeoff is invisible unless surfaced.

**How to avoid:** Set expectations **before** the click: e.g. "Opens a public GitHub issue — a free GitHub account is required to submit." Don't label it "anonymous." Consider an accountless fallback: a `mailto:` link or copy-to-clipboard of the prefilled body (mailto has its own length limits — same budget discipline applies).

**Warning signs:** Drop-off; "I clicked feedback and it asked me to sign up."

**Phase to address:** UX/copy phase.

---

### Pitfall 6: Privacy — over-capturing context or hiding that the issue is PUBLIC

**What goes wrong:** Auto-including more than what's on screen (verbose UA with OS build, screen resolution, locale; or anything from localStorage/clipboard) leaks data the user didn't consent to publish. GitHub issues are world-readable, so captured data becomes permanently public and indexed.

**Why it happens:** "More context = better bug reports" instinct; dumping full `navigator.userAgent` + every `navigator` field; not registering the destination is a public repo.

**How to avoid:** Capture **only** what PROJECT.md scopes — current InChI, SMILES + preset name, a **minimal** browser/version string, app version/commit. No storage/cookies/IP/geolocation reads. Show a **preview of the exact body** before submit, and state plainly "This creates a PUBLIC GitHub issue visible to anyone." Trim UA to browser family + major version.

**Warning signs:** UA includes data beyond browser/version; no "public" warning; any `localStorage`/`geolocation` read in the feedback path.

**Phase to address:** Context-capture + UX/copy phases.

---

### Pitfall 7: Empty / invalid canvas state produces a broken or misleading body

**What goes wrong:** User clicks "Send feedback" before drawing (or with an invalid structure where InChI is empty/errored). The body interpolates `undefined`/empty into "Current InChI:" → a confusing empty fenced block, or the code throws on null InChI and the button appears dead.

**Why it happens:** Happy-path assumption that an InChI always exists. The app explicitly has an empty/placeholder state (PLSH-01), so feedback must mirror it.

**How to avoid:** Treat each context field as optional — omit the InChI/SMILES block (or render `_(no structure drawn)_`) when empty rather than emitting an empty fence. Guard against `null`/`undefined`; never call string methods on a possibly-null InChI. Feedback must be submittable with zero structure context.

**Warning signs:** Empty code fences in issues; button throws on empty canvas; "Current InChI:" followed by nothing.

**Phase to address:** Body-templating phase. Test the empty-state body shape.

---

### Pitfall 8: Hardcoded repo slug / base-path mistakes

**What goes wrong:** Two traps:
1. **GitHub target slug** typo'd — owner (`cmbeilstein` vs `cm-beilstein`), wrong repo, or a fork — sends feedback into the void / wrong repo.
2. **App base path** confusion: the app is served under Vite `base: '/explain-that-inchi/'`. Naively building relative URLs or deriving things from `window.location` can pick up the base path. The GitHub URL is absolute so it's mostly immune, but app-version/commit injection and any internal links are not.

**Why it happens:** Copy-paste of owner/repo; assuming root-served app; mixing the absolute GitHub URL with the Pages base path.

**How to avoid:** Define the GitHub target as one constant (`const FEEDBACK_REPO = 'cm-beilstein/explain-that-inchi'`) used everywhere. Inject app version/commit via Vite `import.meta.env`/`define` at build time (e.g. `__APP_VERSION__`, `__GIT_SHA__`), not by parsing the page URL. Keep `https://github.com/${FEEDBACK_REPO}/issues/new` fully qualified; verify `base` is never prepended to a feedback link.

**Warning signs:** 404 on GitHub; link resolving to `cm-beilstein.github.io/explain-that-inchi/github.com/...`; wrong owner casing.

**Phase to address:** URL-construction phase + build-config (version injection).

---

### Pitfall 9: Labels query param silently ignored (permission gate)

**What goes wrong:** `&labels=bug` only applies if the **submitting user has triage/write permission** on the repo. External contributors (the whole audience) don't, so the label is silently dropped — the category→label mapping doesn't work for the people who'll actually use it.

**Why it happens:** Tested by the maintainer (who has write access), so labels appear and seem to work; fails for everyone else.

**How to avoid:** Don't rely on `labels=` for external categorization. Encode the category in the **title prefix** (`[Bug] …`, `[Suggestion] …`, `[Unclear explanation] …`) — always survives — and/or use a GitHub **issue template** (`template=` param). Maintainers can auto-label via a workflow. If you also send `labels=`, treat it as best-effort.

**Warning signs:** Issues from non-maintainers arrive unlabeled despite the param.

**Phase to address:** Category-mapping phase.

---

### Pitfall 10: GitHub mobile-app deeplink steals the prefill

**What goes wrong:** On a device with the GitHub mobile app installed, clicking a `github.com/.../issues/new?...` link can deep-link into the app, which historically **ignores the prefill query params** (community discussion #113726) — the user gets a blank form, losing all auto-context.

**Why it happens:** OS-level universal-link interception; out of the web app's control.

**How to avoid:** Largely unavoidable from client code; mitigate with a "copy feedback to clipboard" fallback so mobile-app users can paste. PROJECT.md notes Ketcher's canvas is poor on touch (mobile is secondary), so document this as a known limitation rather than over-engineering.

**Warning signs:** Mobile users reporting blank issue forms.

**Phase to address:** UX/copy phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Manual string concat instead of `URLSearchParams` | Fewer lines | Encoding / double-encoding bugs; breaks on `#`/`+`/`/` (P2) | Never |
| Recompute InChI in the click handler via `await getInchi()` | "Always fresh" | Breaks popup gesture (P4); slow click | Never — read store synchronously |
| Skip the byte-length budget check | Ships faster | 414s / truncated bodies on real multi-fragment molecules (P1) | Never — most likely real failure |
| Hardcode repo slug inline in JSX | Quick | Drift/typos; hard to audit (P8) | Only if extracted to one constant |
| Full `navigator.userAgent` dump | One line | Privacy over-capture (P6) | Acceptable only if trimmed + previewed |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GitHub new-issue prefill | Relying on `labels=` for external categorization | Title prefix and/or issue template; labels are write-gated (P9) |
| GitHub new-issue prefill | Assuming any body length works | Respect 8191-byte cap; budget ~7500 encoded (P1) |
| GitHub Markdown rendering | Treating body as plain text | Fence all auto-context; neutralize `@` (P3) |
| Browser popup policy | `window.open` after `await` | Synchronous open or `<a target=_blank rel=noopener>` (P4) |
| GitHub mobile universal links | Expecting prefill on mobile app | Clipboard fallback; document limitation (P10) |
| Vite `base` path | Relative feedback URL picks up `/explain-that-inchi/` | Fully-qualified absolute `https://github.com/...` (P8) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rebuilding the feedback URL on every keystroke | Jank in the message textarea | Memoize URL build; recompute on submit or debounced | Negligible at this scale; only matters with a long message + reactive `<a href>` |

(Performance is essentially a non-issue — pure client-side string work, no network/runtime scaling. Listed for completeness.)

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unfenced user text in body | `@`-mention pings real users/teams; markdown injection | Fence context; neutralize `@` (P3) |
| `window.open` without `noopener` | Opened GitHub tab accesses `window.opener` (reverse tabnabbing) | `rel="noopener noreferrer"` / `noopener` feature (P4) |
| Capturing more than on-screen state | Publishing PII to a world-readable issue | Capture only scoped fields; show preview (P6) |
| Public prefilled link enables spam | Junk issues in the repo | Repo-side mitigations (below) — not solvable in app code |

**Spam / abuse mitigation (repo-side, NOT app code):**
- Add GitHub **issue templates / issue forms** so the prefill targets a structured template.
- Configure repo **issue interaction limits**; sign-in is inherently required.
- Use a **label + GitHub Action** to auto-triage/label feedback by title prefix.
- Document these as maintainer configuration tasks, separate from the code phase.

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Implying anonymity / no preview | Surprised by sign-in wall + public visibility | "Opens a PUBLIC GitHub issue; free account required"; show body preview (P5, P6) |
| Dead button on empty canvas | Confusion | Submittable with no structure; omit empty context (P7) |
| Silent failure when over budget | Lost feedback | Truncate-with-marker + clipboard fallback (P1) |
| Category that doesn't survive (labels) | Maintainer can't triage | Title-prefix categorization (P9) |

## "Looks Done But Isn't" Checklist

- [ ] **URL builder:** Often missing the **byte-length** check — verify with `TextEncoder` on the multi-fragment repro molecule (HANDOFF.md), not just short presets.
- [ ] **Encoding:** Often double-encodes — verify a round-trip test reconstructs raw InChI containing `+ / ; , ( ) # =`.
- [ ] **Markdown:** Often unfenced — verify a SMILES `#` doesn't become a heading and `@x` doesn't ping.
- [ ] **Popup:** Often blocked in Safari/Firefox — verify the open is synchronous / native anchor, no `await` before it.
- [ ] **Empty state:** Often throws on null InChI — verify feedback works before any molecule is drawn.
- [ ] **Account expectation:** Often missing the "public / account required" note — verify copy is present pre-click.
- [ ] **Repo slug:** Often typo'd — verify exact `cm-beilstein/explain-that-inchi`, absolute URL, no base-path prefix.
- [ ] **Labels:** Often relied upon — verify category still works as a title prefix for a logged-in non-collaborator.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Over-budget URL shipped (414s) | LOW | Add `TextEncoder` budget check + truncation marker; redeploy (static, fast) |
| Double-encoding shipped | LOW | Collapse to single `URLSearchParams`; redeploy |
| `@`-ping incident | LOW | Patch `@` neutralization; sent pings can't be unsent — fix forward |
| Wrong repo slug | LOW | Fix constant; redeploy; manually migrate any misfiled issues |
| Spam flood | MEDIUM | Add issue template + interaction limits + auto-label workflow (repo settings) |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. URL byte-length cap | URL-construction / context-capture | `TextEncoder` budget test on multi-fragment repro; truncation marker present |
| 2. Encoding / double-encoding | URL-construction | Round-trip test with all special chars |
| 3. Markdown injection / @-ping | Body-templating | Fenced-context + `@`-neutralization tests |
| 4. Popup blocking | Entry-point/UI | Synchronous-open / anchor; cross-browser manual click |
| 5. Account expectation | UX/copy | Copy review; "account required" note present |
| 6. Privacy over-capture | Context-capture + UX/copy | Audit captured fields; body preview shown |
| 7. Empty/invalid state | Body-templating | Empty-canvas body-shape test |
| 8. Repo slug / base path | URL-construction + build-config | Constant audit; absolute-URL assertion; env version injection |
| 9. Labels permission gate | Category-mapping | Title-prefix categorization verified for non-collaborator |
| 10. Mobile deeplink | UX/copy | Documented limitation + clipboard fallback |

## Testing Pitfalls (project-specific)

- **Asserting on raw encoded URLs is brittle.** Don't string-match `%2F`/`%2B` — parse with `new URL(built)` and assert `url.searchParams.get('body')`/`get('title')` against the **decoded** expected value. Survives any valid encoding scheme and catches double-encoding.
- **`window.open` in jsdom:** jsdom doesn't implement `window.open` navigation (returns `null`, logs "Not implemented"). Mock it (`vi.spyOn(window, 'open').mockReturnValue(null)`) and assert called once with the expected URL + `'noopener'`. With the `<a>` approach, assert on rendered `href`/`rel`/`target` — cleaner, no mock.
- **Byte-length tests** must use `new TextEncoder().encode(url).length`, not `url.length`.
- **Reuse the recurring repro molecule** from `src/lib/__tests__/remapAuxToPoolIds.realRepro.test.ts` / HANDOFF.md as the large-input fixture so the budget path is exercised against a realistic worst case.

## Sources

- GitHub server-side URL length limit (8191 bytes → 414): https://github.com/github/docs/issues/5136
- Passing long body to issues/new (length discussion): https://github.com/orgs/community/discussions/22946
- GitHub mobile app ignores prefill query params: https://github.com/orgs/community/discussions/113726
- Creating an issue with query parameters (title/body/labels/template, permission gates): https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue
- new-github-issue-url (reference client-side prefill impl): https://github.com/sindresorhus/new-github-issue-url
- HTTP 414 URI Too Long (MDN): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/414
- Project context: `.planning/PROJECT.md`, `.planning/HANDOFF.md` (multi-fragment repro molecule), `CLAUDE.md` (Vite base `/explain-that-inchi/`, static GitHub Pages, no backend)

---
*Pitfalls research for: v1.2 client-side prefilled-GitHub-issue feedback*
*Researched: 2026-06-17*
