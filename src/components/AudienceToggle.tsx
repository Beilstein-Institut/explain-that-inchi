import { useInchiStore } from '../store';
import type { Audience } from '../lib/audience';

// Order = display order. Labels per the 2026-09-03 amendment; ids unchanged.
const MODES: { id: Audience; label: string }[] = [
  { id: 'chemist', label: 'Expert' },
  { id: 'plain', label: 'Simple' },
];

// Register switch on the section-label row, left of Help. Radios, not a
// checkbox: both options are always visible and neither is "off".
export function AudienceToggle() {
  const audience = useInchiStore(state => state.audience);
  const setAudience = useInchiStore(state => state.setAudience);

  return (
    <div className="audience-toggle" role="radiogroup" aria-label="Explanation style">
      {MODES.map(m => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={audience === m.id}
          onClick={() => setAudience(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
