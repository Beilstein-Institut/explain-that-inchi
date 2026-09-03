// Two explanation registers. Every user-facing string that differs between
// them is stored as a Copy pair at its own site and resolved with pick().
export type Audience = 'chemist' | 'plain';
export type Copy = Record<Audience, string>;

export const DEFAULT_AUDIENCE: Audience = 'chemist';

export function pick(copy: Copy, audience: Audience): string {
  return copy[audience];
}
