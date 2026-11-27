// Draws the gold line-art for the classic cards (classic-*.html) as three small SVG files
// next to this script, so the cards need no photos:
//
//   classic-crest.svg    two olive sprigs rising from the centre, top of the card
//   classic-divider.svg  two short sprigs lying either side of a diamond, between sections
//   classic-corner.svg   a diamond with a sprig along each edge, for the four corners of the frame
//   classic-rule.svg     a hairline with a diamond in the middle, above the QR spot
//
//   node scripts/invites/classic-ornaments.mjs
//
// Each sprig is a cubic curve for the stem with leaves placed along it, alternating sides and
// shrinking towards the tip. The right-hand sprig is the left one mirrored. Gold is a symmetric
// gradient (dark, light, dark) so the mirror joins seamlessly and it reads like foil.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const f = (n) => String(Math.round(n * 100) / 100);

const gradient = (width) =>
  `<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${width}" y2="0">` +
  `<stop offset="0" stop-color="#a3823a"/><stop offset=".5" stop-color="#e2c77e"/><stop offset="1" stop-color="#a3823a"/>` +
  `</linearGradient>`;

const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [0, 1].map((k) => w[0] * p0[k] + w[1] * p1[k] + w[2] * p2[k] + w[3] * p3[k]);
};
const tangent = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [0, 1].map(
    (k) => 3 * u * u * (p1[k] - p0[k]) + 6 * u * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]),
  );
};

/** A pointed leaf from (0,0) to (len,0), rotated by `angle` degrees at (x,y). */
const leaf = (x, y, angle, len, w) =>
  `<path d="M0 0Q${f(len * 0.45)} ${f(-w)} ${f(len)} 0Q${f(len * 0.45)} ${f(w)} 0 0Z" ` +
  `transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})"/>`;

/** One sprig: stem p0..p3 (base to tip), `count` leaves between t=from and t=to, plus a tip leaf. */
function sprig({ p0, p1, p2, p3, count, from = 0.1, to = 0.9, spread = 40, len = [15, 8], width = [4.4, 2.2], berries = [] }) {
  let out = `<path d="M${f(p0[0])} ${f(p0[1])}C${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(p3[0])} ${f(p3[1])}" fill="none" stroke="url(#g)" stroke-width="1.2" stroke-linecap="round"/>`;
  for (let i = 0; i < count; i++) {
    const k = i / (count - 1);
    const t = from + (to - from) * k;
    const [x, y] = cubic(p0, p1, p2, p3, t);
    const [dx, dy] = tangent(p0, p1, p2, p3, t);
    const a = (Math.atan2(dy, dx) * 180) / Math.PI;
    const side = i % 2 === 0 ? 1 : -1;
    out += leaf(x, y, a + side * spread, len[0] + (len[1] - len[0]) * k, width[0] + (width[1] - width[0]) * k);
  }
  const [tx, ty] = p3;
  const [dx, dy] = tangent(p0, p1, p2, p3, 1);
  out += leaf(tx - dx * 0.02, ty - dy * 0.02, (Math.atan2(dy, dx) * 180) / Math.PI, len[1] * 1.15, width[1]);
  for (const [t, side, r] of berries) {
    const [x, y] = cubic(p0, p1, p2, p3, t);
    const [dx2, dy2] = tangent(p0, p1, p2, p3, t);
    const n = Math.hypot(dx2, dy2);
    out += `<circle cx="${f(x + (-dy2 / n) * side * 4)}" cy="${f(y + (dx2 / n) * side * 4)}" r="${f(r)}"/>`;
  }
  return out;
}

const diamond = (cx, cy, r) => `<path d="M${f(cx)} ${f(cy - r)}L${f(cx + r)} ${f(cy)}L${f(cx)} ${f(cy + r)}L${f(cx - r)} ${f(cy)}Z"/>`;

const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${gradient(w)}</defs>` +
  `<g fill="url(#g)">${body}</g></svg>\n`;

/** Draw `inner` on the left, and again mirrored on the right. */
const mirrored = (w, inner) => `<g>${inner}</g><g transform="translate(${w} 0) scale(-1 1)">${inner}</g>`;

// Crest: 200 x 96. Both stems start at the bottom centre and rise outwards.
const crestSprig = sprig({
  p0: [100, 92],
  p1: [74, 86],
  p2: [40, 66],
  p3: [18, 20],
  count: 9,
  from: 0.1,
  to: 0.9,
  spread: 42,
  len: [16, 8],
  width: [4.6, 2.2],
  berries: [
    [0.3, -1, 1.6],
    [0.5, 1, 1.4],
  ],
});
writeFileSync(join(here, "classic-crest.svg"), svg(200, 96, mirrored(200, crestSprig) + diamond(100, 93.5, 2.6)));

// Divider: 180 x 24. A diamond in the middle, a short sprig lying outwards on each side.
const dividerSprig = sprig({
  p0: [82, 12],
  p1: [62, 13.5],
  p2: [36, 14],
  p3: [8, 7],
  count: 6,
  from: 0.14,
  to: 0.9,
  spread: 44,
  len: [11, 6],
  width: [3.2, 1.6],
});
writeFileSync(join(here, "classic-divider.svg"), svg(180, 24, mirrored(180, dividerSprig) + diamond(90, 12, 3.2)));

// Corner: 90 x 90. A diamond in the corner with a short sprig running along each edge; the card
// rotates it for the other three corners.
const cornerSprig = sprig({
  p0: [16, 10],
  p1: [36, 11],
  p2: [60, 12],
  p3: [84, 7],
  count: 6,
  from: 0.12,
  to: 0.9,
  spread: 44,
  len: [10, 5.5],
  width: [3, 1.5],
});
writeFileSync(
  join(here, "classic-corner.svg"),
  svg(90, 90, `<g>${cornerSprig}</g><g transform="matrix(0 1 1 0 0 0)">${cornerSprig}</g>` + diamond(10, 10, 3)),
);

// Rule: 160 x 12. Hairlines either side of a small diamond.
writeFileSync(
  join(here, "classic-rule.svg"),
  svg(
    160,
    12,
    `<path d="M2 6H70M90 6H158" fill="none" stroke="url(#g)" stroke-width="1" stroke-linecap="round"/>` + diamond(80, 6, 3),
  ),
);
console.log("wrote classic-crest.svg, classic-divider.svg, classic-corner.svg, classic-rule.svg in", here);
