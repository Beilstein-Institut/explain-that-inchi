import { create } from 'zustand';
import type { Layer, AuxMap, SubHover, LayerType } from './lib/parseInchi';

// All v1 fields defined here per D-02.
// hoverIdx and subHover are null until Phase 3 writes them.
// hAtomPoolIds added in Phase 6 (INCHI-05) for explicit H atom highlighting.
// inchiKey added in Phase 11 (INKEY-01/02, D-03).
// keyHoverKind added in Phase 12 (INKEY-03/05, D-04) — NOT wired to highlights (Invariant #2).
// pinned added in Phase 16 (Feature 1, pin-to-freeze) — gating setHover/setSubHover.

/**
 * The 4 hover zones of the InChIKey strip (D-07/D-08).
 * 4 zones, NOT 5: flag and version share the 'flagVersion' zone for ergonomic hover targeting
 * while the parser data stays 5-segment granular (each still individually colored).
 * NEVER wire this to setHover/setSubHover or useKetcherHighlights (Invariant #2).
 */
export type KeyHoverZone = 'skeleton' | 'hash' | 'flagVersion' | 'protonation';

/**
 * UAT-13: a legend row being hovered. Carries the layer `type` (for card precedence
 * and the "present in molecule" check) and the canonical `eg` snippet (shown as the
 * example for layers not present on the canvas, where no live reading exists).
 */
export interface LegendHover {
  type: LayerType;
  eg: string;
}

interface InchiState {
  // Data fields
  inchi: string;
  layers: Layer[];
  auxMap: AuxMap;
  atomElements: Record<number, string>;
  hAtomPoolIds: number[];
  inchiKey: string;
  hoverIdx: number | null;
  subHover: SubHover | null;
  // pinned: frozen highlight target; null = nothing frozen (Phase 16, Feature 1).
  // While non-null, setHover/setSubHover are no-ops (single enforcement point per spec line 48).
  pinned: { idx: number; sub: SubHover | null } | null;
  keyHoverKind: KeyHoverZone | null;
  // UAT-13: legend-hover payload. Lets the explanation card show a layer's static
  // info (incl. layers NOT present in the molecule) instead of a floating tooltip.
  // Present layers still drive the rich card via hoverIdx (higher precedence).
  legendHover: LegendHover | null;
  // Empty and failed are different states. null with no layers = nothing drawn yet;
  // a message = the canvas holds a structure the generator would not accept. Without
  // this the strip told a user with a molecule on screen that they had drawn nothing.
  inchiError: string | null;
  // Actions
  setInchiData: (inchi: string, layers: Layer[], auxMap: AuxMap, atomElements: Record<number, string>, hAtomPoolIds?: number[], inchiKey?: string) => void;
  // Blanks every data field and records why. Pass null for a genuinely empty canvas.
  setInchiFailure: (message: string | null) => void;
  setHover: (idx: number | null) => void;
  setSubHover: (sub: SubHover | null) => void;
  setPinned: (p: { idx: number; sub: SubHover | null } | null) => void;
  clearPinned: () => void;
  setKeyHoverKind: (kind: KeyHoverZone | null) => void;
  setLegendHover: (hover: LegendHover | null) => void;
  resetAll: () => void;
}

// Zustand 5 TypeScript pattern: create<State>()() — double-call required.
// The outer () binds the generic; the inner () receives the initialiser.
export const useInchiStore = create<InchiState>()(
    (set, get) => ({
      inchi: '',
      layers: [],
      auxMap: {},
      atomElements: {},
      hAtomPoolIds: [],
      inchiKey: '',
      hoverIdx: null,
      subHover: null,
      pinned: null,
      keyHoverKind: null,
      legendHover: null,
      inchiError: null,
      // CR-01: reset keyHoverKind on every data transition. setInchiData fires only
      // after a debounced structure change; at that point a stale key-hover (from an
      // emptied key or a preset swap) must be dropped so it cannot mask the panel.
      setInchiData: (inchi, layers, auxMap, atomElements, hAtomPoolIds = [], inchiKey = '') => set({ inchi, layers, auxMap, atomElements, hAtomPoolIds, inchiKey, keyHoverKind: null, pinned: null, inchiError: null }),
      // Same blanking as a data transition, plus the reason. One code path for both
      // failure modes (generator rejection, unparseable result) so they cannot drift.
      setInchiFailure: (message) => set({
        inchi: '', layers: [], auxMap: {}, atomElements: {}, hAtomPoolIds: [], inchiKey: '',
        hoverIdx: null, subHover: null, pinned: null, keyHoverKind: null, legendHover: null,
        inchiError: message,
      }),
      // Gate: while pinned is non-null, setHover/setSubHover are no-ops (single enforcement point).
      setHover: (idx) => { if (get().pinned) return; set({ hoverIdx: idx }); },
      setSubHover: (sub) => { if (get().pinned) return; set({ subHover: sub }); },
      setPinned: (p) => set({ pinned: p }),
      clearPinned: () => set({ pinned: null }),
      setKeyHoverKind: (kind) => set({ keyHoverKind: kind }),
      setLegendHover: (hover) => set({ legendHover: hover }),
      // RESET-02/03: atomically resets ALL fields to idle in a single set() call.
      // Uses set() directly — do NOT call other actions from here (Zustand 5 anti-pattern).
      resetAll: () => set({
        inchi: '',
        layers: [],
        auxMap: {},
        atomElements: {},
        hAtomPoolIds: [],
        inchiKey: '',
        hoverIdx: null,
        subHover: null,
        pinned: null,
        keyHoverKind: null,
        legendHover: null,
        inchiError: null,
      }),
    }),
);

// Usage patterns for Phase 3+ components:
//
// Selector-based read — component re-renders only when this slice changes:
//   const layers = useInchiStore(state => state.layers);
//
// Dispatching without subscribing (App.tsx) — avoids adding caller as subscriber:
//   useInchiStore.getState().setInchiData(inchi, layers, auxMap);
