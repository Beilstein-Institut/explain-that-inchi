import { describe, it, expect } from 'vitest';
import { pick, DEFAULT_AUDIENCE } from '../audience';
import type { Copy } from '../audience';

const COPY: Copy = { chemist: 'stereogenic unit', plain: 'handed atom' };

describe('pick', () => {
  it('returns the chemist register', () => {
    expect(pick(COPY, 'chemist')).toBe('stereogenic unit');
  });
  it('returns the plain register', () => {
    expect(pick(COPY, 'plain')).toBe('handed atom');
  });
  it('default audience is chemist', () => {
    expect(DEFAULT_AUDIENCE).toBe('chemist');
  });
});
