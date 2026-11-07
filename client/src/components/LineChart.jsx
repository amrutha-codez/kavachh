// A simple line chart drawn with SVG (no chart library needed).
// `values` has one number per label. A value can be null when there is no data.
const W = 360;
const H = 170;
const PAD = { left: 34, right: 16, top: 26, bottom: 30 };

export default function LineChart({ labels, values }) {
  const known = values.map((v, i) => ({ v, i })).filter((p) => p.v != null);
  if (known.length === 0) return null;

  const min = Math.min(...known.map((p) => p.v));
  const max = Math.max(...known.map((p) => p.v));
  const lo = Math.floor((min - 3) / 5) * 5;
  const hi = Math.ceil((max + 3) / 5) * 5;

  const x = (i) => PAD.left + (i / (labels.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  // grid lines every 5 points (at most 4 of them)
  const ticks = [];
  for (let t = lo; t <= hi; t += 5) ticks.push(t);
  const shownTicks = ticks.length > 4 ? ticks.filter((_, i) => i % 2 === 0) : ticks;

  const line = known.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)},${y(p.v)}`).join(" ");
  const area =
    known.length > 1
      ? `${line} L${x(known[known.length - 1].i)},${H - PAD.bottom} L${x(known[0].i)},${H - PAD.bottom} Z`
      : "";
  const last = known[known.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`Score over the last ${labels.length} months. Latest: ${last.v}.`}
    >
      {shownTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-light)">
            {t}
          </text>
        </g>
      ))}

      {area && <path d={area} fill="var(--purple-soft)" opacity="0.7" />}
      {known.length > 1 && (
        <path d={line} fill="none" stroke="var(--purple)" strokeWidth="2.5" strokeLinejoin="round" />
      )}
      {known.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="4" fill="var(--purple)" />
      ))}

      <text x={x(last.i)} y={y(last.v) - 10} textAnchor="end" fontSize="13" fontWeight="700" fill="var(--text)">
        {last.v}
      </text>

      {labels.map((label, i) => (
        <text key={label + i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-light)">
          {label}
        </text>
      ))}
    </svg>
  );
}
