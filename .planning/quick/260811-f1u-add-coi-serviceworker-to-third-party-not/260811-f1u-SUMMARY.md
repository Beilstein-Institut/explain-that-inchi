---
id: 260811-f1u
type: quick
status: complete
completed: 2026-08-11
commits:
  - cf624ac
  - ed89385
---

# Quick Task 260811-f1u — Summary

Closed the two text-level gaps found when reviewing Impressum / Privacy / Terms
against the code after `7866ad1` (unconditional purge) and `df4121d` (Pages
dropped). The Impressum needed nothing — no recent change touches it.

## What changed

**`cf624ac` — `THIRD-PARTY-NOTICES.md`**
New `## coi-serviceworker — MIT License` section: v0.1.7, © Guido Zuidhof and
contributors, upstream URL, and the fact that it is vendored in `public/` rather
than installed, which is why it is absent from `package-lock.json` (the file's
own preamble sends readers there for everything else, so the exception has to be
stated).

**`ed89385` — `src/data/legalContent.ts`, `src/lib/__tests__/legalContent.test.ts`**
- `TERMS_HTML`: matching entry in the bundled-component list, in the same
  `<strong>name</strong> — licence` shape as its neighbours, noting that it is
  the cross-origin-isolation fallback and that it stays inert because nginx sends
  COOP/COEP itself.
- `PRIVACY_HTML` § 3 (4): "its stored data for this website" → "its stored data",
  followed by an explicit sentence that `Clear-Site-Data` works per origin, not
  per application, so the request covers everything served from
  `cheminfo.beilstein.org`. The unconditional framing and both limitations
  (reload, Safari) are untouched — existing tests pin those phrases.
- Two new assertions: Terms names coi-serviceworker + Zuidhof; § 3 (4) states the
  origin scope.

## Verification

- `npx vitest run` — 34 files, 541 tests, all green (539 + the 2 added)
- `npx tsc --noEmit` — clean

## Notes

Licence compliance was never at risk: the distributed `coi-serviceworker.js`
carries its MIT permission notice as its own first line, in every copy. The gap
was an incomplete attribution list, not a missing notice.

## Still outstanding (operator, not text)

- **Redeploy.** Privacy § 3 (2)/(4) describe behaviour that only exists locally —
  the live site has no `__leave` endpoint and no leave wipe. The policy is ahead
  of production until the container is rebuilt.
- **Log rotation.** § 2 (2) promises deletion within 2 weeks; `nginx.conf` sets no
  `access_log`, so this rests on host logrotate and is still unverified.
