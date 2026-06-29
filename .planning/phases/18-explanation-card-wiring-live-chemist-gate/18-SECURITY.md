---
phase: 18
slug: explanation-card-wiring-live-chemist-gate
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-06-29
---

# Phase 18 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| WASM → React render | InChI string + AuxInfo computed in-browser by `ketcher-standalone` WASM, rendered into card prose | WASM-derived, offset-only numeric data (atom indices, counts); no user free text |
| User drawing → Ketcher | Molecule drawn in the embedded Ketcher editor | Structure data handled entirely by Ketcher; no app-authored parsing of raw user input |

*No network, no persistence, no server: the entire tool is a static client-side build (CLAUDE.md: "No backend").*

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-18-01 | Tampering / XSS | sub-token card prose render in `Explanation.tsx` | low | mitigate | Card `title`/`body` rendered as React text children only — no `dangerouslySetInnerHTML` in the sub-token branch. Verified: `dangerouslySetInnerHTML` count in `Explanation.tsx` = 1 (pre-existing layer branch, unchanged); 0 in `subTokenInfo.ts` / `LayerText.tsx`. | closed |
| T-18-03 | Denial of service / state corruption | no-remount invariant | low | mitigate | Sub-token branch adds no store field, never conditionally renders `<Editor>`, never recreates `StandaloneStructServiceProvider`. Verified: 0 `<Editor>`/provider references in the changed pure modules (`subTokenInfo.ts`, `LayerText.tsx`, `parseInchi.ts`). | closed |
| T-18-04 | Tampering / correctness | `atomPhrase`/`atomList` de-offset arithmetic in `subTokenInfo.ts` | medium | mitigate | `fragmentOffset` subtracted for DISPLAY only; `SubHover.atoms` stay global canonicals. Guard test `highlightUtils.test.ts` ("GAP-2 guard — resolves via GLOBAL atoms, fragmentOffset is ignored on the highlight path") proves `buildSubHoverSpecs` keys auxMap by the global value, so a wrong de-offset cannot reach the highlight. | closed |
| T-18-06 | Tampering / XSS | card prose render (h-count / mobile-H strings) | low | accept | Card prose is plain HTML-free strings assembled in the pure `subTokenInfo` module and rendered as React text children. No markup, no `dangerouslySetInnerHTML`. Accepted as documented low risk. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-18-01 | T-18-06 | Card prose is HTML-free, assembled from offset-only numeric data in a pure module and rendered as React text children; no injection vector exists. | gsd-secure-phase (L1) | 2026-06-29 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-29 | 4 | 4 | 0 | gsd-secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-29
