import { ChevronDown } from "lucide-react";
import LineChart from "../components/LineChart";
import Badge, { ScoreBadge } from "../components/Badge";
import { useApp } from "../context/AppContext";
import { nearest } from "../utils/geo";
import {
  SLOTS,
  SLOT_LABEL,
  SLOT_RANGE,
  getScoreLevel,
  formatClock,
} from "../utils/score";
import "./Charts.css";

const BREAKDOWN = [
  ["theft", "Theft"],
  ["nightSafety", "Night safety"],
  ["roadSafety", "Road safety"],
  ["womenSafety", "Women’s safety"],
];

// Compare table rows. These are RISK scores for the first two, so lower is better.
const COMPARE_ROWS = [
  ["incidentScore", "Incident risk"],
  ["nightRiskScore", "Night risk"],
  ["communityScore", "Community"],
  ["infrastructureScore", "Infrastructure"],
];

// The last 6 months, ending with this month: ["Jun", "Jul", ... "Nov"]
function lastSixMonths(now) {
  const out = [];
  for (let i = 5; i >= 0; i--) {
    out.push(new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleString("en-US", { month: "short" }));
  }
  return out;
}

export default function Charts() {
  const { locations, place, setPlaceName, slot, setSlot, autoSlot, isAuto, now } = useApp();

  const known = place.trend.filter((v) => v != null);
  const change = known.length > 1 ? known[known.length - 1] - known[0] : null;

  const compare = [place, ...nearest(locations, place, 2, place.name)];

  // Safest and least safe areas for the chosen time of day
  const ranked = [...locations].sort(
    (a, b) => b.slots[slot].score - a.slots[slot].score || a.name.localeCompare(b.name)
  );
  const safest = ranked.slice(0, 3);
  const least = ranked.slice(-3).reverse();

  return (
    <div>
      <header className="charts-header">
        <h1 className="page-title">Charts</h1>
        <label className="area-select">
          <span className="visually-hidden">Choose an area</span>
          <select value={place.name} onChange={(e) => setPlaceName(e.target.value)}>
            {[...locations]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((l) => (
                <option key={l.name}>{l.name}</option>
              ))}
          </select>
          <ChevronDown size={18} aria-hidden="true" />
        </label>
      </header>

      <div className="charts-grid">
        {/* LEFT COLUMN */}
        <div>
          <div className="card">
            <div className="card-head">
              <p className="small-title">{place.name} · by time of day</p>
              <Badge level="dark">Now: {SLOT_LABEL[autoSlot]}</Badge>
            </div>
            <div className="slot-cards" role="group" aria-label="Time of day">
              {SLOTS.map((s) => {
                const score = place.slots[s].score;
                return (
                  <button
                    key={s}
                    className={"slot-card" + (slot === s ? " active" : "")}
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                  >
                    <b>{SLOT_LABEL[s]}</b>
                    <small>{SLOT_RANGE[s]}</small>
                    <span className={"badge " + getScoreLevel(score)}>{score}</span>
                  </button>
                );
              })}
            </div>
            <p className="note">
              {isAuto
                ? `Auto-selected from your device's clock · ${formatClock(now)}`
                : `Chosen by you · tap ${SLOT_LABEL[autoSlot]} above to go back to auto`}
            </p>
          </div>

          <div className="card">
            <div className="card-head">
              <p className="small-title">Trend · last 6 months</p>
              {change !== null && (
                <Badge level={change >= 0 ? "safe" : "risky"}>
                  {change >= 0 ? "+" : ""}
                  {change} pts · {change >= 0 ? "safer" : "less safe"}
                </Badge>
              )}
            </div>
            <LineChart labels={lastSixMonths(now)} values={place.trend} />
            {known.length < 2 && (
              <p className="note">
                Only this month's score is available for {place.name} so far. The line fills in as more
                monthly data arrives.
              </p>
            )}
          </div>

          <div className="card">
            <p className="small-title">What makes up the score</p>
            {BREAKDOWN.map(([key, label]) => {
              const value = place.breakdown[key];
              return (
                <div className="bar-row" key={key}>
                  <span>{label}</span>
                  <div className="bar-track" aria-hidden="true">
                    <div className="bar-fill" style={{ width: `${value}%`, background: `var(--${getScoreLevel(value)})` }} />
                  </div>
                  <b>{value}</b>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          <div className="card">
            <p className="small-title">Compare areas</p>
            <div className="table-wrap">
              <table className="compare">
                <thead>
                  <tr>
                    <th />
                    {compare.map((a) => (
                      <th key={a.name}>
                        <div className="compare-name">{a.name}</div>
                        <span className={"badge " + getScoreLevel(a.slots[slot].score)}>{a.slots[slot].score}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map(([key, label]) => (
                    <tr key={key}>
                      <th scope="row">{label}</th>
                      {compare.map((a) => (
                        <td key={a.name}>{a[key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note">{SLOT_LABEL[slot]} scores shown · risk scores: lower is better.</p>
          </div>

          <div className="card">
            <p className="small-title">Safest areas · {SLOT_LABEL[slot]}</p>
            {safest.map((a, i) => (
              <button className="list-row" key={a.name} onClick={() => setPlaceName(a.name)}>
                <span className="row-name">
                  <b className="rank">{i + 1}</b> {a.name}
                </span>
                <ScoreBadge score={a.slots[slot].score} />
              </button>
            ))}
          </div>

          <div className="card">
            <p className="small-title">Least safe areas · {SLOT_LABEL[slot]}</p>
            {least.map((a, i) => (
              <button className="list-row" key={a.name} onClick={() => setPlaceName(a.name)}>
                <span className="row-name">
                  <b className="rank">{i + 1}</b> {a.name}
                </span>
                <ScoreBadge score={a.slots[slot].score} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
