// The Threat Owls owl, from the product's logo: three outline shapes (ink) and the beak and eyes (signal orange).
export const OWL = {
  viewBox: [1040, 337, 253, 251],
  ink: [
    'M 1067.62 387.05 L 1041.43 338.62 L 1165.95 437.09 L 1291.23 338 L 1265.08 387.12 L 1165.66 465.14 Z',
    'M 1153.44 586.73 L 1085.55 531.25 L 1067.77 514.89 C 1052.30 500.70 1040.92 480.84 1041 459.11 L 1041.21 381.27 L 1064.88 427.14 C 1060.31 440.16 1058.88 454.03 1061.30 467.60 C 1063.67 480.91 1071.35 490.17 1080.06 499.82 C 1105.59 528.17 1129.99 556.34 1153.44 586.70 Z',
    'M 1226.16 548.40 L 1179.74 585.64 C 1205.35 551.40 1234.10 520.85 1261.94 488.15 C 1276.42 471.14 1274.08 447.00 1267.75 427.17 C 1275.62 411.30 1282.67 405.96 1291.71 390.63 L 1292.30 454.68 C 1291.71 501.47 1259.26 519.87 1226.12 548.44 Z',
  ],
  accent: [
    'M 1166.35 541.34 L 1145.57 493.06 L 1166.28 475.72 L 1187.09 493.46 Z',
    'M 1144.11 466.42 C 1140.09 474.43 1132.59 480.62 1123.15 482.63 C 1106.58 486.21 1090.27 475.64 1086.68 459.07 C 1085.07 451.50 1086.35 444.00 1089.87 437.75 L 1103.33 444.99 C 1100.76 448.46 1099.67 452.92 1100.66 457.46 C 1102.45 465.84 1110.72 471.18 1119.09 469.39 C 1124.65 468.18 1128.90 464.16 1130.54 459.11 Z',
    'M 1250.63 457.57 C 1247.92 474.29 1232.16 485.66 1215.41 482.96 C 1206.00 481.42 1198.32 475.79 1193.82 468.18 L 1206.96 460.21 C 1208.97 464.96 1213.28 468.62 1218.77 469.53 C 1227.22 470.92 1235.23 465.18 1236.58 456.69 C 1237.32 452.27 1236.07 447.95 1233.51 444.69 L 1246.53 436.80 C 1250.19 442.79 1251.76 450.11 1250.56 457.57 Z',
  ],
};

// The owl as an inline SVG element (React).
export function Owl({ size = '1em', accent = '#FF5309', className }) {
  const [x, y, w, h] = OWL.viewBox;
  return (
    <svg className={className} width={size} height={size} viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" focusable="false">
      {OWL.ink.map((d) => <path key={d} d={d} fill="currentColor" />)}
      {OWL.accent.map((d) => <path key={d} d={d} fill={accent} />)}
    </svg>
  );
}

// The owl on a canvas, centred at (cx, cy), `size` px wide.
export function drawOwl(c, cx, cy, size, ink, accent) {
  const [x, y, w, h] = OWL.viewBox, k = size / w;
  c.save(); c.translate(cx - (w * k) / 2, cy - (h * k) / 2); c.scale(k, k); c.translate(-x, -y);
  c.fillStyle = ink; for (const d of OWL.ink) c.fill(new Path2D(d));
  c.fillStyle = accent; for (const d of OWL.accent) c.fill(new Path2D(d));
  c.restore();
}
