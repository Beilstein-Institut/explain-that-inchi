import { describe, it, expect } from 'vitest';
import { buildFeedbackUrl } from '../buildFeedbackUrl';

// ---------------------------------------------------------------------------
// FEED-04: title prefix + labels
// ---------------------------------------------------------------------------

describe('FEED-04: title prefix + labels', () => {
  it('Bug category → [Bug] prefix in title and labels=bug', () => {
    const { url } = buildFeedbackUrl({
      message: 'Something is broken',
      category: 'Bug',
      context: {},
    });
    const params = new URL(url).searchParams;
    expect(params.get('title')).toMatch(/^\[Bug\]/);
    expect(params.get('labels')).toBe('bug');
  });

  it('Explanation wrong/confusing → [Explanation] prefix and labels=explanation', () => {
    const { url } = buildFeedbackUrl({
      message: 'The explanation is wrong',
      category: 'Explanation wrong/confusing',
      context: {},
    });
    const params = new URL(url).searchParams;
    expect(params.get('title')).toMatch(/^\[Explanation\]/);
    expect(params.get('labels')).toBe('explanation');
  });

  it('Highlighting wrong → [Highlighting] prefix and labels=highlighting', () => {
    const { url } = buildFeedbackUrl({
      message: 'Wrong atoms highlighted',
      category: 'Highlighting wrong',
      context: {},
    });
    const params = new URL(url).searchParams;
    expect(params.get('title')).toMatch(/^\[Highlighting\]/);
    expect(params.get('labels')).toBe('highlighting');
  });

  it('Suggestion → [Suggestion] prefix and labels=suggestion', () => {
    const { url } = buildFeedbackUrl({
      message: 'Please add dark mode',
      category: 'Suggestion',
      context: {},
    });
    const params = new URL(url).searchParams;
    expect(params.get('title')).toMatch(/^\[Suggestion\]/);
    expect(params.get('labels')).toBe('suggestion');
  });

  it('General → [General] prefix and labels=feedback', () => {
    const { url } = buildFeedbackUrl({
      message: 'Great tool!',
      category: 'General',
      context: {},
    });
    const params = new URL(url).searchParams;
    expect(params.get('title')).toMatch(/^\[General\]/);
    expect(params.get('labels')).toBe('feedback');
  });

  it('excerpt: short message appears verbatim in title after prefix', () => {
    const { url } = buildFeedbackUrl({
      message: 'Short message',
      category: 'Bug',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    expect(title).toBe('[Bug] Short message');
  });

  it('excerpt: message longer than ~60 chars is trimmed with ellipsis', () => {
    const longMsg = 'This is a very long feedback message that exceeds sixty characters easily';
    const { url } = buildFeedbackUrl({
      message: longMsg,
      category: 'Bug',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    // Must be trimmed to ~60 chars + ellipsis
    const excerpt = title.replace('[Bug] ', '');
    expect(excerpt.endsWith('…') || excerpt.endsWith('...')).toBe(true);
    // Original is 73 chars; excerpt must be shorter
    expect(excerpt.length).toBeLessThan(longMsg.length);
  });

  it('excerpt: newlines in message collapse to single spaces', () => {
    const { url } = buildFeedbackUrl({
      message: 'Line one\nLine two\nLine three',
      category: 'Bug',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    expect(title).not.toContain('\n');
    expect(title).toContain('Line one');
  });

  it('empty message falls back to static title with prefix — not a bare prefix', () => {
    const { url } = buildFeedbackUrl({
      message: '',
      category: 'Bug',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    expect(title).toBe('[Bug] Explain that InChI feedback');
  });

  it('whitespace-only message falls back to static title', () => {
    const { url } = buildFeedbackUrl({
      message: '   ',
      category: 'Suggestion',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    expect(title).toBe('[Suggestion] Explain that InChI feedback');
  });
});

// ---------------------------------------------------------------------------
// FEED-04/05: body composition
// ---------------------------------------------------------------------------

describe('FEED-04/05: body composition', () => {
  it('body is message-first, then separator, then Context section', () => {
    const { url } = buildFeedbackUrl({
      message: 'My feedback message',
      category: 'Bug',
      context: {
        inchi: 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H',
        smiles: 'c1ccccc1',
        presetName: 'Benzene',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0',
      },
    });
    const body = new URL(url).searchParams.get('body')!;
    const msgIndex = body.indexOf('My feedback message');
    const ctxIndex = body.indexOf('### Context');
    expect(msgIndex).toBeGreaterThanOrEqual(0);
    expect(ctxIndex).toBeGreaterThan(msgIndex);
  });

  it('body contains a --- separator between message and context', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'General',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('---');
  });

  it('body contains InChI in a code fence', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: { inchi: 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H');
    // Must be inside a code fence
    const inchiPos = body.indexOf('InChI=1S/C6H6');
    const beforeInchi = body.slice(0, inchiPos);
    expect(beforeInchi).toContain('```');
  });

  it('body contains SMILES in a code fence', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: { smiles: 'c1ccccc1' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('c1ccccc1');
    const smilesPos = body.indexOf('c1ccccc1');
    const beforeSmiles = body.slice(0, smilesPos);
    expect(beforeSmiles).toContain('```');
  });

  it('body contains user agent in a code fence', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'General',
      context: { userAgent: 'Mozilla/5.0 (Windows)' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('Mozilla/5.0 (Windows)');
    const uaPos = body.indexOf('Mozilla/5.0 (Windows)');
    const beforeUA = body.slice(0, uaPos);
    expect(beforeUA).toContain('```');
  });

  it('body contains Preset as a labeled single-line field', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'General',
      context: { presetName: 'Aspirin' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('Preset:');
    expect(body).toContain('Aspirin');
  });

  it('body contains App version as a labeled single-line field', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'General',
      context: { appVersion: 'v1.2.0 (abc1234)' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('App:');
    expect(body).toContain('v1.2.0 (abc1234)');
  });

  it('URL starts with the GitHub issues/new base URL', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: {},
    });
    expect(url).toMatch(/^https:\/\/github\.com\/Beilstein-Institut\/explain-that-inchi\/issues\/new\?/);
  });
});

// ---------------------------------------------------------------------------
// FEED-03/D-03: placeholders for missing context
// ---------------------------------------------------------------------------

describe('FEED-03/D-03: placeholders for missing context', () => {
  it('absent inchi → "(no structure loaded)" placeholder, field still present', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('(no structure loaded)');
  });

  it('absent smiles → "(none)" placeholder, field still present', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('(none)');
  });

  it('absent presetName → "(custom molecule)" placeholder, field still present', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('(custom molecule)');
  });

  it('empty string inchi uses placeholder', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: { inchi: '' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('(no structure loaded)');
  });

  it('empty string smiles uses placeholder', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: { smiles: '' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('(none)');
  });

  it('empty string presetName uses placeholder', () => {
    const { url } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: { presetName: '' },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('(custom molecule)');
  });
});

// ---------------------------------------------------------------------------
// FEED-05: round-trip encoding — special chars survive single-pass URLSearchParams
// ---------------------------------------------------------------------------

describe('FEED-05: round-trip encoding', () => {
  it('special chars + / ; , ( ) # = in message survive round-trip decode', () => {
    const specialMsg = 'A+B/C;D,E(F)G#H=I test message';
    const { url } = buildFeedbackUrl({
      message: specialMsg,
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    // All special chars must be present in decoded body
    expect(body).toContain('A+B/C;D,E(F)G#H=I');
  });

  it('newlines in message survive round-trip (not collapsed in body, only in title)', () => {
    const msgWithNewlines = 'First line\nSecond line\nThird line';
    const { url } = buildFeedbackUrl({
      message: msgWithNewlines,
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('First line');
    expect(body).toContain('Second line');
  });

  it('unencoded # does not truncate the body (URL parse integrity)', () => {
    // Body containing # must still be parseable via new URL(url).searchParams
    const msgWithHash = 'This has a #hashtag and more content after';
    const { url } = buildFeedbackUrl({
      message: msgWithHash,
      category: 'General',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    // Body should contain the text both before and after the hash
    expect(body).toContain('more content after');
  });

  it('single-pass encoding: no double-encoding of + signs', () => {
    // If double-encoded, + in message becomes %252B in the raw URL
    const { url } = buildFeedbackUrl({
      message: 'A+B equals C',
      category: 'Bug',
      context: {},
    });
    // The raw URL must not contain %25 (percent-encoded percent sign) before 2B
    expect(url).not.toContain('%2525');
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('A+B equals C');
  });

  it('title special chars: [Bug] brackets survive round-trip', () => {
    const { url } = buildFeedbackUrl({
      message: 'test',
      category: 'Bug',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    expect(title).toMatch(/^\[Bug\]/);
  });
});

// ---------------------------------------------------------------------------
// FEED-05: @-neutralization
// ---------------------------------------------------------------------------

describe('FEED-05: @-neutralization', () => {
  it('@handle in message is neutralized in the decoded body', () => {
    const { url } = buildFeedbackUrl({
      message: 'Hey @octocat please fix this',
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    // The @octocat mention must be neutralized (no literal @octocat)
    expect(body).not.toContain('@octocat');
  });

  it('@handle neutralization preserves the rest of the message', () => {
    const { url } = buildFeedbackUrl({
      message: 'Hey @octocat please fix this',
      category: 'Bug',
      context: {},
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain('please fix this');
  });

  it('@handle in message title excerpt is also neutralized', () => {
    const { url } = buildFeedbackUrl({
      message: '@admin this is broken',
      category: 'Bug',
      context: {},
    });
    const title = new URL(url).searchParams.get('title')!;
    expect(title).not.toContain('@admin');
  });
});

// ---------------------------------------------------------------------------
// FEED-07: byte-budget truncation
// ---------------------------------------------------------------------------

describe('FEED-07: byte-budget truncation', () => {
  // Multi-fragment repro molecule — long InChI/SMILES designed to exceed the ~7680 byte budget.
  // D-13/specifics: truncation must be validated against a multi-fragment repro,
  // not a short preset like ethanol which never exercises the byte-budget path.
  // 100 repetitions of the toluene+benzene InChI fragment (~6400 chars) combined
  // with a long SMILES (~2000 chars) reliably exceeds the 7680-byte URL budget
  // after URLSearchParams encoding and the rest of the body template.
  const LONG_INCHI =
    'InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H'.repeat(100);

  const LONG_SMILES = 'Cc1ccccc1.'.repeat(200);

  it('short input returns truncated: false', () => {
    const { truncated } = buildFeedbackUrl({
      message: 'Short message',
      category: 'Bug',
      context: {
        inchi: 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H',
        smiles: 'c1ccccc1',
        presetName: 'Benzene',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0',
      },
    });
    expect(truncated).toBe(false);
  });

  it('oversized input returns truncated: true', () => {
    const { truncated } = buildFeedbackUrl({
      message: 'My feedback about this long molecule',
      category: 'Bug',
      context: {
        inchi: LONG_INCHI,
        smiles: LONG_SMILES,
        presetName: 'Custom',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    expect(truncated).toBe(true);
  });

  it('oversized input: final URL is within the ~7680 byte budget', () => {
    const { url } = buildFeedbackUrl({
      message: 'My feedback about this long molecule',
      category: 'Bug',
      context: {
        inchi: LONG_INCHI,
        smiles: LONG_SMILES,
        presetName: 'Custom',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const byteLen = new TextEncoder().encode(url).length;
    expect(byteLen).toBeLessThanOrEqual(7680);
  });

  it('oversized input: user message is preserved verbatim', () => {
    const userMessage = 'My feedback about this long molecule';
    const { url } = buildFeedbackUrl({
      message: userMessage,
      category: 'Bug',
      context: {
        inchi: LONG_INCHI,
        smiles: LONG_SMILES,
        presetName: 'Custom',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0',
      },
    });
    const body = new URL(url).searchParams.get('body')!;
    expect(body).toContain(userMessage);
  });

  it('SMILES is dropped before InChI is trimmed', () => {
    // When truncation occurs, the body should not contain LONG_SMILES
    // but may still contain (part of) LONG_INCHI
    const { url, truncated } = buildFeedbackUrl({
      message: 'My feedback about this long molecule',
      category: 'Bug',
      context: {
        inchi: LONG_INCHI,
        smiles: LONG_SMILES,
        presetName: 'Custom',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0',
      },
    });
    if (truncated) {
      const body = new URL(url).searchParams.get('body')!;
      // SMILES value should be dropped (replaced with placeholder or omitted)
      expect(body).not.toContain(LONG_SMILES);
    }
  });

  it('trimmed InChI carries a truncation marker', () => {
    const { url, truncated } = buildFeedbackUrl({
      message: 'My feedback about this long molecule',
      category: 'Bug',
      context: {
        inchi: LONG_INCHI,
        smiles: LONG_SMILES,
        presetName: 'Custom',
        appVersion: 'v1.2.0 (abc1234)',
        userAgent: 'Mozilla/5.0',
      },
    });
    if (truncated) {
      const body = new URL(url).searchParams.get('body')!;
      // Truncated InChI must have a truncation marker
      const hasTruncationMarker =
        body.includes('...[truncated]') || body.includes('…[truncated]');
      expect(hasTruncationMarker).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// D-11: fullBody field — clipboard fallback source of truth
// ---------------------------------------------------------------------------

describe('D-11: fullBody field', () => {
  it('result includes fullBody for non-truncated input', () => {
    const { fullBody } = buildFeedbackUrl({
      message: 'Test',
      category: 'Bug',
      context: {
        inchi: 'InChI=1S/C6H6/c1-2-4-6-5-3-1/h1-6H',
        smiles: 'c1ccccc1',
      },
    });
    expect(fullBody).toBeTruthy();
    expect(fullBody).toContain('Test');
    expect(fullBody).toContain('InChI=1S/C6H6');
  });

  it('fullBody contains the untruncated InChI even when url is truncated', () => {
    const LONG_INCHI =
      'InChI=1S/C7H8.C6H6/c1-7-5-3-2-4-6-7;1-2-4-6-5-3-1/h2-6H,1H3;1-6H'.repeat(100);
    const { truncated, fullBody } = buildFeedbackUrl({
      message: 'My feedback',
      category: 'Bug',
      context: {
        inchi: LONG_INCHI,
        smiles: 'Cc1ccccc1.'.repeat(200),
      },
    });
    expect(truncated).toBe(true);
    expect(fullBody).toContain(LONG_INCHI);
  });
});
