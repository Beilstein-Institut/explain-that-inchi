import { useInchiStore } from '../store';
import type { Audience } from '../lib/audience';

// Order = display order. Labels are the spec's exact words.
const MODES: { id: Audience; label: string }[] = [
  { id: 'chemist', label: 'Chemist' },
  { id: 'plain', label: 'Plain language' },
];

export function Header() {
  const audience = useInchiStore(state => state.audience);
  const setAudience = useInchiStore(state => state.setAudience);

  return (
    <header className="header">
      <h1>
        Explain that <em>InChI</em>
      </h1>
      <div className="meta">
        <div>InChI v<b>1.06</b> · standard</div>
        <div><a href="https://www.inchi-trust.org/" target="_blank" rel="noopener noreferrer">International Chemical Identifier</a></div>
        {/* Register switch. Radios, not a checkbox: both options are always
            visible and neither is "off". */}
        <div className="audience" role="radiogroup" aria-label="Explanation style">
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
      </div>
    </header>
  );
}
