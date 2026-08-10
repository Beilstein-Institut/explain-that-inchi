// Regenerates public/og-image.png — the social preview card.
// Colors are the oklch tokens from src/styles.css converted to sRGB hex; type
// is IBM Plex, same as the app. Not part of `npm run build`; run by hand when
// the title, palette, or logo changes:
//
//   node scripts/og-image.mjs                       # writes scripts/og-image.svg
//   npx --yes @resvg/resvg-js-cli --no-system-font \
//     $(for f in <ibm-plex-ttf-dir>/*.ttf; do printf -- "--font-file %s " $f; done) \
//     scripts/og-image.svg public/og-image.png
//
// IBM Plex ships as woff2 in node_modules, which resvg cannot read; fetch the
// TTFs (Sans Regular/SemiBold, Serif Medium/Italic, Mono Regular) from
// https://github.com/IBM/plex/tree/master/packages/*/fonts/complete/ttf.
import { readFileSync, writeFileSync } from 'node:fs';
const f = (x) => {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};
const hex = (L, C, Hdeg) => {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return '#' + [f(r), f(g), f(bl)].map((n) => n.toString(16).padStart(2, '0')).join('');
};

const C = {
  bg: hex(0.985, 0.005, 85),
  canvas: hex(0.995, 0.003, 85),
  ink: hex(0.2, 0.015, 255),
  inkSoft: hex(0.45, 0.015, 255),
  inkFaint: hex(0.65, 0.012, 255),
  line: hex(0.88, 0.008, 250),
  version: hex(0.55, 0.02, 250),
  formula: hex(0.55, 0.14, 245),
  conn: hex(0.55, 0.14, 155),
  hydro: hex(0.62, 0.14, 65),
  versionBg: hex(0.94, 0.01, 250),
  formulaBg: hex(0.95, 0.04, 245),
  connBg: hex(0.95, 0.04, 155),
  hydroBg: hex(0.96, 0.05, 75),
};

// Caffeine, standard InChI (InChIKey RYYVLZVUVIJVGH-UHFFFAOYSA-N), split at a
// layer boundary so both lines fit the card at a size that survives a 600px preview.
const L1 = [
  { t: 'InChI=1S', c: C.version, bg: C.versionBg, label: 'version' },
  { t: '/C8H10N4O2', c: C.formula, bg: C.formulaBg, label: 'formula' },
];
const L2 = [
  { t: '/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(2)6', c: C.conn, bg: C.connBg, label: 'connections' },
  { t: '/h4H,1-3H3', c: C.hydro, bg: C.hydroBg, label: 'hydrogens' },
];

const FS = 33;
const CW = FS * 0.6; // IBM Plex Mono advance is 600/1000 em
const PAD = 36;
const CARD = { x: 72, y: 296, w: 1056, h: 216, r: 12 };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// chunks -> chips + text, laid out left to right from x0 on baseline y
function row(chunks, x0, y) {
  let x = x0, out = '';
  for (const ch of chunks) {
    const w = ch.t.length * CW;
    out += `<rect x="${x - 6}" y="${y - FS * 0.78}" width="${w + 12}" height="${FS * 1.12}" rx="5" fill="${ch.bg}"/>`;
    out += `<text x="${x}" y="${y}" font-family="IBM Plex Mono" font-size="${FS}" font-weight="500" fill="${ch.c}" xml:space="preserve">${esc(ch.t)}</text>`;
    x += w + 12;
  }
  return { svg: out, width: x - 12 - x0 };
}

const y1 = CARD.y + PAD + 34;
const y2 = y1 + 60;
const r1 = row(L1, CARD.x + PAD, y1);
const r2 = row(L2, CARD.x + PAD, y2);
for (const [n, r] of [['line1', r1], ['line2', r2]]) {
  const room = CARD.w - PAD * 2;
  if (r.width > room) throw new Error(`${n} overflows card: ${r.width.toFixed(0)} > ${room}`);
}

// legend: coloured dot + label for each layer on the card
const legend = [...L1, ...L2];
let lx = CARD.x + PAD;
const legendSvg = legend
  .map((ch) => {
    const s = `<circle cx="${lx + 5}" cy="${CARD.y + CARD.h - 30}" r="5" fill="${ch.c}"/>` +
      `<text x="${lx + 18}" y="${CARD.y + CARD.h - 25}" font-family="IBM Plex Sans" font-size="17" fill="${C.inkFaint}">${ch.label}</text>`;
    lx += 18 + ch.label.length * 8.6 + 34;
    return s;
  })
  .join('');

const logo = readFileSync(new URL('../src/assets/beilstein-institut-logo-wide.png', import.meta.url)).toString('base64');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.bg}"/>
  <rect x="0" width="140" height="6" fill="${C.version}"/>
  <rect x="140" width="220" height="6" fill="${C.formula}"/>
  <rect x="360" width="620" height="6" fill="${C.conn}"/>
  <rect x="980" width="220" height="6" fill="${C.hydro}"/>

  <text x="72" y="112" font-family="IBM Plex Mono" font-size="16" letter-spacing="2.2" fill="${C.inkFaint}">IUPAC INTERNATIONAL CHEMICAL IDENTIFIER</text>

  <text x="72" y="212" font-family="IBM Plex Serif" font-weight="500" font-size="86" letter-spacing="-1.6" fill="${C.ink}">Explain that <tspan font-style="italic" font-weight="400" fill="${C.inkSoft}">InChI</tspan></text>

  <text x="72" y="254" font-family="IBM Plex Sans" font-size="27" fill="${C.inkSoft}">Draw a molecule — read its InChI, layer by layer.</text>

  <rect x="${CARD.x}" y="${CARD.y}" width="${CARD.w}" height="${CARD.h}" rx="${CARD.r}" fill="${C.canvas}" stroke="${C.line}"/>
  ${r1.svg}${r2.svg}${legendSvg}
  <text x="${CARD.x + CARD.w - PAD}" y="${y1}" text-anchor="end" font-family="IBM Plex Sans" font-size="19" fill="${C.inkFaint}">caffeine</text>

  <image x="72" y="558" width="176" height="41.7" xlink:href="data:image/png;base64,${logo}"/>
  <text x="1128" y="586" text-anchor="end" font-family="IBM Plex Mono" font-size="17" fill="${C.inkFaint}">cheminfo.beilstein.org/explain-that-inchi</text>
</svg>`;

writeFileSync(new URL('./og-image.svg', import.meta.url), svg);
console.log('ok  line1', r1.width.toFixed(0), ' line2', r2.width.toFixed(0), ' room', CARD.w - PAD * 2);
