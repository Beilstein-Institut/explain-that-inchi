# Requirements — Milestone v1.4: Reset control & c-layer hover precision

**Milestone goal:** Add a Reset control that returns the whole app to its empty state, and make c-layer (connectivity) hovering pinpoint exactly the right atoms and bonds.

**Core value tie-in:** Sharpens "every chunk is hoverable, explained, and linked back to the atoms" — the connectivity layer's atom numbers, hyphens, and parentheses each map to a precise, minimal canvas highlight instead of a broad one. Reset lets a user clear the slate and start a fresh exploration without reloading.

## v1.4 Requirements

### Reset control (RESET)

- [ ] **RESET-01**: A "Reset" control is present immediately to the left of the "Send feedback" control.
- [ ] **RESET-02**: Activating Reset clears the molecule from the Ketcher canvas, equivalent to Ketcher's own built-in clear/reset action.
- [ ] **RESET-03**: Activating Reset returns all dependent app state to its empty/idle state — InChI strip, InChIKey, explanation card, legend, mapping, and any active hover/highlight — matching the placeholder state shown before any molecule is drawn.
- [ ] **RESET-04**: Reset does not remount the Ketcher canvas or re-initialize WASM (preserves the established leaf-sibling, no-remount invariant).
- [ ] **RESET-05**: Activating Reset on an already-empty canvas is a safe no-op — no error, idle state preserved.

### C-layer hover precision (CLYR)

- [ ] **CLYR-01**: Hovering a canonical atom number in the c-layer highlights only that single atom in the Ketcher canvas (no bonds).
- [ ] **CLYR-02**: Hovering a hyphen (`-`) in the c-layer highlights the bond connecting the two atoms it joins.
- [ ] **CLYR-03**: Hovering an opening or closing parenthesis (`(` / `)`) in the c-layer highlights all bonds involved in that branch.
- [ ] **CLYR-04**: All c-layer atom-number, hyphen, and parenthesis hovers resolve to the correct atoms/bonds for multi-fragment molecules (each token maps within its own fragment).
- [ ] **CLYR-05**: All c-layer hovers resolve correctly for duplicated/repeated fragments (multiplied component prefixes), highlighting the intended fragment instance(s).

## Future Requirements (deferred)

- Carried from prior milestones: MAP-03 (shareable URL), ACCS-01/02 (keyboard nav, screen-reader labels), CONT-01/02 (more presets, search), APPR-01/02 (dark mode, print styles), INKEY-F1/F2/F3 (InChIKey web-search link, charged-species preset, hash-build deep dive).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Undo/redo or multi-step history | Reset is a single clear-to-empty action; full history is a different, larger feature. |
| Confirmation dialog before reset | Clearing a stateless educational canvas is low-stakes and instantly redo-able by drawing again; a confirm step adds friction without protecting real data. |
| Reset that reloads a default/preset molecule | Reset returns to the empty placeholder state, not to a preset — preset loading is the existing EDIT-02 path. |
| Changing non-c-layer hover behavior | This milestone scopes only the connectivity (c) layer; other layers' hover behavior is unchanged. |
| New explanation-card copy for c-layer | Hover *highlight precision* changes only; existing c-layer explanation prose is unaffected unless a phase finds it inaccurate. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RESET-01 | — | Pending |
| RESET-02 | — | Pending |
| RESET-03 | — | Pending |
| RESET-04 | — | Pending |
| RESET-05 | — | Pending |
| CLYR-01 | — | Pending |
| CLYR-02 | — | Pending |
| CLYR-03 | — | Pending |
| CLYR-04 | — | Pending |
| CLYR-05 | — | Pending |

*(Phase column filled by the roadmap.)*
