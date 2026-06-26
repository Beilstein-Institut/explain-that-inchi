---
status: testing
phase: 17-sub-token-copy-core-element-table-pure-module-tests
source: [17-VERIFICATION.md]
started: 2026-06-26T13:16:58Z
updated: 2026-06-26T13:16:58Z
---

## Current Test

number: 1
name: Chemist reads the four card body strings (element, hAtoms, mobileH, stereo) emitted by subTokenInfo for real molecules
expected: |
  Prose is chemically accurate — hAtoms names no functional group, mobileH is
  shared/tautomeric with no count, stereo carries the parity≠R/S caveat and the
  correct sign, element count/scope is correct.
awaiting: user response

## Tests

### 1. Chemist reads the four card body strings (element, hAtoms, mobileH, stereo) emitted by subTokenInfo for real molecules
expected: Prose is chemically accurate — hAtoms names no functional group, mobileH is shared/tautomeric with no count, stereo carries the parity≠R/S caveat and the correct sign, element count/scope is correct.
result: [pending]

note: |
  Deferred by design to the Phase-18 live chemist gate (SUBEX-10). The regex pins
  (/parity/, /not.*R\/S/i, no-functional-group, no-count) catch the documented error
  classes in automated tests, but full chemical-prose correctness is a judgment call.
  subTokenInfo is not yet wired to any UI (Phase 18 does that), so the cards cannot be
  read live until Phase 18 — this item is realistically exercised there.

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
