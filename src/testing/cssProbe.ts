// Reading declarations back out of a stylesheet, for the tests that assert CSS
// invariants (box heights, presence styling, target sizes). Shared because two of
// them had grown their own copy of the same parser, and the copies had already
// diverged — one stripped comments, one did not, and only one anchored the selector
// at a rule boundary, so `.sw` could match `.muted .sw`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** A stylesheet under src/, comments stripped so they cannot hide a declaration. */
export function readCss(relativeToSrc: string): string {
  return readFileSync(resolve(__dirname, '..', relativeToSrc), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * The declaration block of one rule.
 * Anchored at a rule boundary, so `.sw` cannot match `.muted .sw`.
 */
export function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.]/g, '\\.');
  const m = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`rule "${selector}" not found`);
  return m[1];
}

/** One declaration's value, or undefined when the rule does not set it. */
export function decl(ruleBody: string, prop: string): string | undefined {
  const m = ruleBody.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`));
  return m?.[1].trim();
}
