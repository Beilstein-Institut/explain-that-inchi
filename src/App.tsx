import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
// Editor stylesheet lives here, not in main.tsx, so it ships in App's lazy chunk
// instead of on every legal-page visit.
import 'ketcher-react/dist/index.css';
import { StandaloneStructServiceProvider } from 'ketcher-standalone';
import type { Ketcher } from 'ketcher-core';
import { Header } from './components/Header';
import { KetcherPanel } from './components/KetcherPanel';
import { InchiSection } from './components/InchiSection';
import { InchiKeySection } from './components/InchiKeySection';
import { Explanation } from './components/Explanation';
import { parseInchiWithAux, remapAuxToPoolIds } from './lib/parseAuxMapping';
import { isExplicitHydrogenLabel } from './lib/highlightUtils';
import { useInchiStore } from './store';
import { useKetcherHighlights } from './hooks/useKetcherHighlights';
import { MOLECULES } from './data/molecules';
import { handleMolSelectLogic } from './lib/handleMolSelectLogic';
import { FeedbackDialog } from './components/FeedbackDialog';
import { HelpTour } from './components/HelpTour';
import { buildFeedbackUrl } from './lib/buildFeedbackUrl';
import type { FeedbackCategory, FeedbackContext, BuildFeedbackUrlResult } from './lib/buildFeedbackUrl';

// Module-level — created once for the page lifetime. NEVER move inside a component.
// (D-13: provider inside component re-creates WASM worker on every render)
const structServiceProvider = new StandaloneStructServiceProvider();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [selectedMolId, setSelectedMolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // smiles is fetched once per dialog-open (handleFeedbackOpen); undefined until the user
  // opens the dialog or if getSmiles() throws (D-12).
  const [previewSmiles, setPreviewSmiles] = useState<string | undefined>(undefined);
  // useRef, not useState — storing in state triggers unnecessary re-renders (D-15)
  const ketcherRef = useRef<Ketcher | null>(null);
  // Prevents highlight-triggered editor.update() from re-firing handleChange.
  // highlights.create/clear call editor.update() synchronously, which dispatches
  // the editor change event — without this guard that re-triggers getInchi() in a loop.
  const isHighlightingRef = useRef(false);
  // Prevents selectedMolId from resetting to null when the 'change' event fires
  // after setMolecule() — separate from isHighlightingRef (RESEARCH.md Pitfall 4)
  const isSettingMoleculeRef = useRef(false);
  // Ref to the native <dialog> element — passed to FeedbackDialog; showModal()/close() called on it
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Bridge hover state → Ketcher canvas highlights (Phase 4)
  useKetcherHighlights(ketcherRef, isReady, isHighlightingRef);

  const handleInit = (ketcher: Ketcher) => {
    ketcherRef.current = ketcher;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).ketcher = ketcher;
    // Reset render settings to canonical defaults, overriding any stale localStorage
    // values. The micro-mode editor exposes setOptions() on its legacy Raphaël editor
    // object; bondLength (px) === microModeScale, default is 40px per Å.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ketcher.editor as any).setOptions(
      JSON.stringify({ bondLength: 40, bondLengthUnit: 'px', zoom: 1 }),
    );
    setIsReady(true);
  };

  const handleMolSelect = async (id: string) => {
    await handleMolSelectLogic({
      id,
      molecules: MOLECULES,
      ketcherRef,
      setSelectedMolId,
      setIsLoading,
      isSettingMoleculeRef,
    });
  };

  // Context snapshot for the FeedbackDialog preview — re-computed on each render so it
  // reflects the current selectedMolId. smiles is fetched once per dialog-open
  // (handleFeedbackOpen); undefined until the user opens the dialog or if getSmiles()
  // throws (D-12).
  const contextPreview: FeedbackContext = {
    inchi: useInchiStore.getState().inchi || undefined,
    smiles: previewSmiles,
    presetName: MOLECULES.find(m => m.id === selectedMolId)?.name,
    userAgent: navigator.userAgent,
    appVersion: `v${__APP_VERSION__} (${__APP_COMMIT__.slice(0, 7)})`,
  };

  // Opens the feedback dialog. Fetches SMILES once per open so the preview reflects the
  // current molecule; falls back to undefined silently if getSmiles() throws (D-12 / T-10-04-02).
  // flushSync forces the state update to render BEFORE showModal() opens the dialog — otherwise
  // React 18 batching defers the re-render and the dialog flashes the previous open's SMILES
  // (the value is computed into a local so there is no stale-state window across repeated opens).
  const handleFeedbackOpen = async () => {
    let smiles: string | undefined;
    try {
      smiles = (await ketcherRef.current?.getSmiles()) ?? undefined;
    } catch {
      smiles = undefined;
    }
    flushSync(() => setPreviewSmiles(smiles));
    dialogRef.current?.showModal();
  };

  // Clears the Ketcher canvas and resets all store state to idle in a single action (RESET-01..05).
  // 1. setMolecule('') uses Ketcher's own clear path — fires a 'change' event which triggers
  //    handleChange waterfall (debounced 150ms) → setInchiData('', [], {}, {}, [], '').
  // 2. resetAll() clears hover fields immediately — no debounce wait (RESET-03).
  // 3. setSelectedMolId(null) deselects any active preset in the examples list.
  // RESET-04: no conditional rendering — ketcherRef.current is only null-checked, never toggles state.
  // RESET-05: setMolecule('') on an already-empty canvas is safe (Ketcher no-ops it).
  const handleReset = async () => {
    if (!ketcherRef.current) return;
    await ketcherRef.current.setMolecule('');
    useInchiStore.getState().resetAll();
    setSelectedMolId(null);
  };

  // Opens the Help tour. If the canvas is empty, auto-loads Caffeine first so every
  // step has real content (D-02, spec line 107). The sample STAYS after the tour closes —
  // onClose only sets tourOpen false, never calls setMolecule('') or resetAll() (spec line 108).
  const handleHelpClick = async () => {
    const isEmpty = useInchiStore.getState().layers.length === 0;
    if (isEmpty && ketcherRef.current) {
      await handleMolSelect('caffeine');
    }
    setTourOpen(true);
  };

  // Assembles FeedbackContext at submit time with a live getSmiles() call (D-12 / D-13 / D-14).
  // Reads inchi from store via getState() (not a hook subscription — avoids extra re-renders).
  const handleFeedbackSubmit = async (
    message: string,
    category: FeedbackCategory,
  ): Promise<BuildFeedbackUrlResult> => {
    const inchi = useInchiStore.getState().inchi || undefined;
    let smiles: string | undefined;
    try {
      smiles = await ketcherRef.current?.getSmiles() ?? undefined;
    } catch {
      smiles = undefined; // silent fallback per D-12 discretion
    }
    const presetName = MOLECULES.find(m => m.id === selectedMolId)?.name;
    const context: FeedbackContext = {
      inchi,
      smiles,
      presetName,
      userAgent: navigator.userAgent,
      appVersion: `v${__APP_VERSION__} (${__APP_COMMIT__.slice(0, 7)})`,
    };
    return buildFeedbackUrl({ message, category, context });
  };

  // Generation counter: synchronous useRef (not useState) so it updates before the
  // async WASM call resolves. Prevents a slow prior result from overwriting newer state (D-05).
  const generationRef = useRef(0);

  useEffect(() => {
    const ketcher = ketcherRef.current;
    if (!isReady || !ketcher) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleChange = () => {
      if (isHighlightingRef.current) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        // Reset selectedMolId when user draws freely (not during setMolecule()).
        // Read the guard, then release it so a subsequent genuine free-draw resets the
        // selection. The guard is held true across the debounce window for preset loads
        // (handleMolSelectLogic no longer clears it in finally), so this read is the one
        // place it gets cleared on the success path.
        const wasSettingMolecule = isSettingMoleculeRef.current;
        isSettingMoleculeRef.current = false;
        if (!wasSettingMolecule) setSelectedMolId(null);
        // Increment before the async call; capture for stale-result comparison after
        const thisGen = ++generationRef.current;
        try {
          const [inchiResult, keyResult] = await Promise.allSettled([
            ketcher.getInchi(true),
            ketcher.getInChIKey(),
          ]);
          // Discard if a newer draw event fired while this WASM call was in flight
          if (thisGen !== generationRef.current) return;
          // Both failure paths below blank the data. Whether that reads as "nothing
          // drawn yet" or "this structure was refused" depends entirely on whether
          // atoms are on the canvas — so ask the canvas, don't guess from the string.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hasAtoms = (ketcher.editor as any).render.ctab.molecule.atoms.size > 0;
          const FAILED = 'No InChI could be generated for this structure — check for unusual valences or unsupported atoms.';

          // D-02: rejected InChI blanks both inchi and inchiKey — asymmetric treatment
          if (inchiResult.status === 'rejected') {
            useInchiStore.getState().setInchiFailure(hasAtoms ? FAILED : null);
            return;
          }
          const raw = inchiResult.value;
          const result = parseInchiWithAux(raw);
          // D-12/D-13: empty canvas guard — no formula layer means empty or disconnected
          if (result.layers.length < 2) {
            useInchiStore.getState().setInchiFailure(hasAtoms ? FAILED : null);
            return;
          }
          // parseInchiWithAux returns canonical → 0-based mol-file rank (from AuxInfo N: field).
          // Ketcher atom Pool IDs are NOT sequential from 0 — they are cumulative across draws.
          // We must read actual Pool IDs and remap rank → poolId so highlights.create() works.
          const poolIds: number[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ketcher.editor as any).render.ctab.molecule.atoms.forEach((_: unknown, id: number) => poolIds.push(id));
          // Collect explicit H atom pool IDs from Ketcher render struct (INCHI-05).
          // isExplicitHydrogenLabel, not label === 'H': deuterium and tritium come
          // through as their own labels ('D', 'T'), and this one pool feeds every
          // hydrogen-aware highlight in the app.
          const hAtomPoolIds: number[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ketcher.editor as any).render.ctab.molecule.atoms.forEach(
            (atom: { label: string }, id: number) => {
              if (isExplicitHydrogenLabel(atom.label)) hAtomPoolIds.push(id);
            }
          );
          // Build live-atom coordinates for coordinate-based canonical→poolId remap.
          // For multi-component molecules, AuxInfo molfile rank order (which poolIds[rank]
          // assumes) diverges from pool-ID iteration order, so a rank→poolId index lookup
          // mismaps fragments. remapAuxToPoolIds matches by (x, -y) coordinate instead,
          // with iteration-order `poolIds` as the per-rank fallback (no regression).
          const liveAtoms: { poolId: number; x: number; y: number }[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ketcher.editor as any).render.ctab.molecule.atoms.forEach(
            (atom: { pp: { x: number; y: number } }, id: number) => {
              liveAtoms.push({ poolId: id, x: atom.pp.x, y: atom.pp.y });
            }
          );
          const actualAuxMap = remapAuxToPoolIds(
            result.auxMap,
            result.molfileCoords ?? [],
            liveAtoms,
            poolIds,
          );
          // D-02: rejected key call produces '' — it does NOT blank the InChI result
          const inchiKey = keyResult.status === 'fulfilled' ? keyResult.value : '';
          useInchiStore.getState().setInchiData(result.inchi, result.layers, actualAuxMap, result.atomElements, hAtomPoolIds, inchiKey);
        } catch {
          // Discard if a newer draw event fired while this WASM call was in flight —
          // a stale rejection must not blank the store under a newer generation.
          if (thisGen !== generationRef.current) return;
          // getInchi() can throw on empty or disconnected canvas — reset to empty (D-12)
          useInchiStore.getState().setInchiData('', [], {}, {}, [], '');
        }
      }, 150);
    };

    // CRITICAL: subscribe returns a subscriber OBJECT — store it.
    // unsubscribe must receive this object, not the handler function.
    // Passing the handler to unsubscribe silently fails (verified: ketcher-react/dist/index.js lines 27315–27355).
    const subscription = ketcher.editor.subscribe('change', handleChange);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      ketcher.editor.unsubscribe('change', subscription);
    };
  }, [isReady]); // ketcherRef is a ref — not a React dependency

  return (
    <main className="app">
      <Header />
      <FeedbackDialog
        dialogRef={dialogRef}
        onSubmit={handleFeedbackSubmit}
        contextPreview={contextPreview}
      />
      <HelpTour open={tourOpen} onClose={() => setTourOpen(false)} />
      <KetcherPanel
        isReady={isReady}
        onInit={handleInit}
        structServiceProvider={structServiceProvider}
        selectedMolId={selectedMolId}
        onMolSelect={handleMolSelect}
        isLoading={isLoading}
        onFeedbackClick={handleFeedbackOpen}
        onResetClick={handleReset}
        onHelpClick={handleHelpClick}
      />
      <InchiSection />
      <InchiKeySection />
      <Explanation />
    </main>
  );
}
