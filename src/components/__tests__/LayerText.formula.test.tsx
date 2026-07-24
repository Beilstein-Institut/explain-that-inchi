import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LayerText } from '../LayerText';
import type { Layer } from '../../lib/parseInchi';

describe('LayerText formula Jmol colors', () => {
  it('colors the O letter span with its Jmol color and leaves H uncolored', () => {
    const layer = { type: 'formula', text: 'C2H6O' } as unknown as Layer;
    const { container } = render(<LayerText layer={layer} rawText="C2H6O" />);
    const spans = Array.from(container.querySelectorAll('span'));

    const oSpan = spans.find((s) => s.textContent?.startsWith('O'));
    expect(oSpan).toBeTruthy();
    expect(oSpan!.style.getPropertyValue('--el-color')).toBe('#ff0d0d');

    const hSpan = spans.find((s) => s.textContent?.startsWith('H'));
    expect(hSpan).toBeTruthy();
    // H renders black (var(--ink)) — never the Jmol white, and never the
    // inherited blue formula color. No per-element --el-color is set.
    expect(hSpan!.style.color).toBe('var(--ink)');
    expect(hSpan!.style.getPropertyValue('--el-color')).toBe('');
  });
});
