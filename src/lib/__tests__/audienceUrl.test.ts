import { describe, it, expect } from 'vitest';
import { readAudience, writeAudience } from '../audienceUrl';

describe('audienceUrl without a window', () => {
  it('reads chemist when there is no window', () => {
    expect(readAudience()).toBe('chemist');
  });
  it('write is a no-op without a window', () => {
    expect(() => writeAudience('plain')).not.toThrow();
  });
});
