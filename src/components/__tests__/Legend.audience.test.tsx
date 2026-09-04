import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Legend } from '../Legend';
import { useInchiStore } from '../../store';

describe('Legend register', () => {
  afterEach(() => useInchiStore.getState().setAudience('chemist'));

  it('chemist names by default', () => {
    render(<Legend activeType={undefined} />);
    expect(screen.getByText('Tetrahedral')).toBeInTheDocument();
    expect(screen.getByText('Chirality centres')).toBeInTheDocument();
  });

  it('plain names when the audience is plain', () => {
    useInchiStore.getState().setAudience('plain');
    render(<Legend activeType={undefined} />);
    expect(screen.getByText('Handedness')).toBeInTheDocument();
    expect(screen.queryByText('Tetrahedral')).toBeNull();
  });
});
