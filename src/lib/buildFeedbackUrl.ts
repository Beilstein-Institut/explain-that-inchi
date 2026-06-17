// buildFeedbackUrl — pure module, no browser globals, Node-compatible for Vitest.
// Builds a GitHub issues/new URL from a feedback message, category, and context snapshot.
// Implements D-01..D-13 from .planning/phases/09-feedback-url-builder-config-version-injection/09-CONTEXT.md.

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** Five feedback categories users can select (D-06). */
export type FeedbackCategory =
  | 'Bug'
  | 'Explanation wrong/confusing'
  | 'Highlighting wrong'
  | 'Suggestion'
  | 'General';

/** Optional context snapshot captured at submit time (filled by Phase 10 caller). */
export interface FeedbackContext {
  /** Verbatim InChI string from Ketcher, or undefined/empty if none loaded. */
  inchi?: string;
  /** SMILES string from Ketcher, or undefined/empty if none. */
  smiles?: string;
  /** Human-readable preset name, or undefined/empty for custom molecules. */
  presetName?: string;
  /** Navigator.userAgent string. */
  userAgent?: string;
  /** Formatted app version string, e.g. "v1.2.0 (abc1234)" — assembled by caller. */
  appVersion?: string;
}

/** Options object for buildFeedbackUrl. */
export interface BuildFeedbackUrlOpts {
  /** User-supplied feedback message (untrusted free-text). */
  message: string;
  /** Selected feedback category. */
  category: FeedbackCategory;
  /** Context snapshot captured at submit time. */
  context: FeedbackContext;
}

/** Result returned by buildFeedbackUrl. */
export interface BuildFeedbackUrlResult {
  /** The fully-composed GitHub issues/new URL. */
  url: string;
  /** True if auto-context was reduced to fit the ~7.5 KB byte budget (D-13). */
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Module Constants
// ---------------------------------------------------------------------------

/** GitHub issues/new base URL for the explain-that-inchi repo. */
const REPO_ISSUES_URL = 'https://github.com/cm-beilstein/explain-that-inchi/issues/new';

/** Byte budget for the final URL (~7.5 KB; GitHub silently truncates above ~8 KB). */
const BYTE_BUDGET = 7680;

/** Max excerpt length for the issue title (D-04). */
const EXCERPT_MAX = 60;

// ---------------------------------------------------------------------------
// Category Mapping (D-06)
// ---------------------------------------------------------------------------

interface CategoryMeta {
  prefix: string;
  slug: string;
}

/**
 * Maps each FeedbackCategory to its title prefix and labels= slug (D-06).
 * Title prefix is the categorizer of record; slug is redundant (D-07).
 */
const CATEGORY_MAP: Record<FeedbackCategory, CategoryMeta> = {
  'Bug': { prefix: '[Bug]', slug: 'bug' },
  'Explanation wrong/confusing': { prefix: '[Explanation]', slug: 'explanation' },
  'Highlighting wrong': { prefix: '[Highlighting]', slug: 'highlighting' },
  'Suggestion': { prefix: '[Suggestion]', slug: 'suggestion' },
  'General': { prefix: '[General]', slug: 'feedback' },
};

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Neutralizes @ characters in user-supplied text so submissions cannot
 * accidentally ping or impersonate GitHub users (D-12).
 * Replaces @ with "(at)" — a human-readable, non-functional substitute
 * that contains no @ character and therefore cannot trigger GitHub mentions.
 */
function neutralizeMentions(text: string): string {
  return text.replace(/@/g, '(at)');
}

/**
 * Builds the issue title from the category prefix and user message (D-04/D-05).
 * - Newlines in message collapse to single spaces.
 * - Trimmed and capped at ~60 chars with trailing ellipsis when longer.
 * - Empty/whitespace-only message → static fallback title (D-05).
 * - @ mentions in message are neutralized (D-12).
 */
function buildTitle(prefix: string, rawMessage: string): string {
  const normalized = neutralizeMentions(rawMessage.replace(/\n/g, ' ').trim());

  if (normalized.length === 0) {
    // D-05: static fallback — never a bare prefix
    return `${prefix} Explain that InChI feedback`;
  }

  const excerpt =
    normalized.length > EXCERPT_MAX
      ? normalized.slice(0, EXCERPT_MAX).trimEnd() + '…'
      : normalized;

  return `${prefix} ${excerpt}`;
}

/**
 * Renders a single fenced code block (D-02).
 */
function codeBlock(value: string): string {
  return `\`\`\`\n${value}\n\`\`\``;
}

/**
 * Builds the issue body (D-01/D-02/D-03).
 * - Message first (@ neutralized), then separator, then ### Context.
 * - InChI, SMILES, and user-agent each in fenced code blocks.
 * - Preset and App version as short labeled single-line fields.
 * - Missing values use stable inline placeholders (D-03).
 */
function buildBody(
  category: FeedbackCategory,
  rawMessage: string,
  ctx: FeedbackContext,
  inchiOverride?: string,
  smilesOverride?: string | null,
): string {
  const neutralizedMessage = neutralizeMentions(rawMessage);
  const categoryLabel = category;

  const inchiValue = (inchiOverride !== undefined ? inchiOverride : (ctx.inchi || '')) || '(no structure loaded)';
  const smilesValue = smilesOverride === null
    ? '(none)'
    : ((smilesOverride !== undefined ? smilesOverride : (ctx.smiles || '')) || '(none)');
  const presetValue = (ctx.presetName || '') || '(custom molecule)';
  const appValue = ctx.appVersion || '';
  const uaValue = ctx.userAgent || '';

  return [
    `**Feedback (${categoryLabel})**`,
    '',
    neutralizedMessage,
    '',
    '---',
    '',
    '### Context',
    '',
    'InChI:',
    codeBlock(inchiValue),
    'SMILES:',
    codeBlock(smilesValue),
    `Preset: ${presetValue}`,
    `App: ${appValue}`,
    'User agent:',
    codeBlock(uaValue),
  ].join('\n');
}

/**
 * Assembles the final GitHub issues URL using a single URLSearchParams pass (D-11).
 * No nested encodeURIComponent — URLSearchParams handles encoding in one pass.
 */
function assembleUrl(title: string, body: string, slug: string): string {
  const params = new URLSearchParams({ title, body, labels: slug });
  return `${REPO_ISSUES_URL}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Public Export
// ---------------------------------------------------------------------------

/**
 * Builds a GitHub issues/new URL from a feedback message, category, and context snapshot.
 *
 * Implements D-01..D-13:
 * - Single-pass URLSearchParams encoding (D-11), no double-encoding.
 * - @ neutralization in user message (D-12).
 * - Deterministic truncation: drop SMILES first, then trim InChI (D-13).
 * - Stable inline placeholders for missing context (D-03).
 * - Category prefix in title + redundant labels= slug (D-04/D-06/D-07).
 * - Message-first body with fenced auto-context (D-01/D-02).
 *
 * Synchronous. No DOM, no network, no async.
 */
export function buildFeedbackUrl(opts: BuildFeedbackUrlOpts): BuildFeedbackUrlResult {
  const { message, category, context } = opts;
  const { prefix, slug } = CATEGORY_MAP[category];

  const title = buildTitle(prefix, message);

  // Build the initial URL with full context (D-01..D-03)
  const initialBody = buildBody(category, message, context);
  let url = assembleUrl(title, initialBody, slug);

  // -------------------------------------------------------------------------
  // D-13: Byte budget guard — deterministic truncation loop.
  // Measure the full URL; if over budget, reduce auto-context in order:
  //   Step 1: Drop SMILES (replace with placeholder / null sentinel).
  //   Step 2: If still over, trim InChI with a truncation marker.
  // The user message is NEVER truncated.
  // -------------------------------------------------------------------------

  let truncated = false;

  if (new TextEncoder().encode(url).length > BYTE_BUDGET) {
    // Step 1: Drop SMILES — pass null sentinel to signal "use placeholder"
    const bodyNoSmiles = buildBody(category, message, context, undefined, null);
    url = assembleUrl(title, bodyNoSmiles, slug);
    truncated = true;

    if (new TextEncoder().encode(url).length > BYTE_BUDGET) {
      // Step 2: Trim InChI with truncation marker — shrink until under budget.
      // Start from the full InChI value (or placeholder if absent).
      const rawInchi = (context.inchi || '');
      const marker = '...[truncated]';

      // Binary-search-style shrink: halve remaining chars until under budget.
      // Each iteration we trim the InChI and check the byte length.
      let trimLen = rawInchi.length;
      let trimmedInchi = rawInchi;

      while (trimLen > 0) {
        trimLen = Math.floor(trimLen / 2);
        trimmedInchi = rawInchi.slice(0, trimLen) + marker;
        const bodyTrimmed = buildBody(category, message, context, trimmedInchi, null);
        url = assembleUrl(title, bodyTrimmed, slug);

        if (new TextEncoder().encode(url).length <= BYTE_BUDGET) {
          // Under budget — we're done
          break;
        }
        // Still over — continue shrinking
      }

      // Edge case: even an empty InChI + marker is still over budget
      // (extremely unlikely). Fall back to empty InChI + marker.
      if (new TextEncoder().encode(url).length > BYTE_BUDGET) {
        trimmedInchi = marker;
        const bodyFallback = buildBody(category, message, context, trimmedInchi, null);
        url = assembleUrl(title, bodyFallback, slug);
      }
    }
  }

  return { url, truncated };
}
