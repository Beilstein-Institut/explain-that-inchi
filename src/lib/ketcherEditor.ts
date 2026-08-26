// The one place in the app that reaches into Ketcher's private render tree.
//
// `ketcher.editor` is typed by ketcher-core, but everything this app needs from it —
// the atom pool, the SVG root, the highlight API, the legacy render options — lives on
// undocumented internals (`editor.render.ctab.molecule`, `editor.highlights`). Those
// reaches used to sit inline in App.tsx and useKetcherHighlights.ts behind seven
// `as any` casts, which meant a Ketcher upgrade could move a property and the app
// would keep type-checking, keep passing its (mocked) tests, and silently stop
// highlighting.
//
// So: every cast lives here, behind functions named for domain concepts, and
// assertEditorShape() runs once at init so a moved property fails loudly at mount
// instead of quietly at first hover.
import type { Ketcher } from 'ketcher-core';

/** One atom as it currently sits on the canvas. */
export interface CanvasAtom {
  /** Ketcher Pool ID — NOT an index. Pool IDs are cumulative across draws. */
  poolId: number;
  /** Atom label as Ketcher renders it: 'C', 'N', but also 'D' and 'T' for isotopes. */
  label: string;
  x: number;
  y: number;
}

/** The private surface this app depends on. Named so a breakage reads as a shape error. */
interface EditorInternals {
  render: {
    ctab: { molecule: AtomPoolHost };
    paper: { canvas: Element };
  };
  highlights: { clear(): void; create(...specs: unknown[]): void };
  setOptions(json: string): void;
}

interface AtomPoolHost {
  atoms: {
    size: number;
    forEach(cb: (atom: { label: string; pp: { x: number; y: number } }, id: number) => void): void;
  };
}

function internals(ketcher: Ketcher): EditorInternals {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ketcher.editor as unknown as EditorInternals;
}

/** Thrown by assertEditorShape so the message names the missing path, not just "undefined". */
export class KetcherShapeError extends Error {
  constructor(missingPath: string) {
    super(
      `Ketcher's editor internals changed: ${missingPath} is missing. ` +
      `Atom mapping and canvas highlighting depend on it. See src/lib/ketcherEditor.ts.`,
    );
    this.name = 'KetcherShapeError';
  }
}

/**
 * Verifies every internal path this module reads, once, at init.
 *
 * Deliberately loud: without it a Ketcher upgrade that moves `render.ctab` produces a
 * working editor whose highlights silently never appear — the failure mode the casts
 * used to hide. Returns the first missing path rather than throwing, so the caller
 * decides between a console error and a user-visible message.
 */
export function checkEditorShape(ketcher: Ketcher): string | null {
  const e = internals(ketcher);
  if (!e) return 'editor';
  if (typeof e.setOptions !== 'function') return 'editor.setOptions';
  if (!e.render) return 'editor.render';
  if (!e.render.ctab?.molecule?.atoms) return 'editor.render.ctab.molecule.atoms';
  if (typeof e.render.ctab.molecule.atoms.forEach !== 'function') {
    return 'editor.render.ctab.molecule.atoms.forEach';
  }
  if (!e.render.paper?.canvas) return 'editor.render.paper.canvas';
  if (!e.highlights || typeof e.highlights.create !== 'function') return 'editor.highlights';
  return null;
}

/**
 * Every atom on the canvas, in pool-iteration order, in one pass.
 *
 * Callers used to walk this pool three times for three different projections (pool IDs,
 * explicit-hydrogen IDs, coordinates). One read of one domain concept replaces that, and
 * the projections are ordinary array work on the result.
 */
export function readCanvasAtoms(ketcher: Ketcher): CanvasAtom[] {
  const out: CanvasAtom[] = [];
  internals(ketcher).render.ctab.molecule.atoms.forEach((atom, poolId) => {
    out.push({ poolId, label: atom.label, x: atom.pp.x, y: atom.pp.y });
  });
  return out;
}

/** The molecule struct the highlight builder reads (findBondId, bonds, atoms). */
export function moleculeStruct<T>(ketcher: Ketcher): T {
  return internals(ketcher).render.ctab.molecule as unknown as T;
}

/** Root SVG element of the canvas — the highlight pass restyles nodes inside it. */
export function canvasSvgRoot(ketcher: Ketcher): Element {
  return internals(ketcher).render.paper.canvas;
}

/** Ketcher's highlight API: clear() and create(...specs). */
export function highlightApi<S>(ketcher: Ketcher): { clear(): void; create(...specs: S[]): void } {
  return internals(ketcher).highlights as { clear(): void; create(...specs: S[]): void };
}

/**
 * Canonical render defaults, overriding whatever stale values localStorage holds.
 * The micro-mode editor exposes setOptions() on its legacy Raphaël editor object;
 * bondLength is in px and 40px per Å is Ketcher's own default.
 */
export function setRenderDefaults(ketcher: Ketcher): void {
  internals(ketcher).setOptions(
    JSON.stringify({ bondLength: 40, bondLengthUnit: 'px', zoom: 1 }),
  );
}
