import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Badge from "../components/Badge";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { SLOTS, SLOT_LABEL, formatClock, formatHHMM, daysAgoText } from "../utils/score";
import "./Community.css";

const WHAT_HAPPENED = [
  ["poor_lighting", "Poor lighting"],
  ["harassment", "Harassment"],
  ["felt_unsafe", "Felt unsafe"],
  ["felt_safe", "Felt safe"],
];
const SEVERITIES = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];
// The badge colour of a report: Low is green, Medium is yellow, High is red
const SEVERITY_LEVEL = { low: "safe", medium: "medium", high: "risky" };

export default function Community() {
  const { locations, place, setPlaceName, replaceLocation, slot, setSlot, isAuto, now } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reload, setReload] = useState(0);

  // the list of recent reports for this area and time of day
  useEffect(() => {
    let cancelled = false;
    setLoadingReports(true);
    api
      .get(`/api/reports?location=${encodeURIComponent(place.name)}&slot=${slot}&limit=20`)
      .then((list) => !cancelled && setReports(list))
      .catch(() => !cancelled && setReports([]))
      .finally(() => !cancelled && setLoadingReports(false));
    return () => {
      cancelled = true;
    };
  }, [place.name, slot, reload]);

  function nextSlot() {
    setSlot(SLOTS[(SLOTS.indexOf(slot) + 1) % SLOTS.length]);
  }

  async function submit(e) {
    e.preventDefault();
    setMessage(null);
    if (!user) return navigate("/login", { state: { from: "/community" } });
    if (!category) return setMessage({ type: "error", text: "Please choose what happened." });
    if (description.trim().length < 10)
      return setMessage({ type: "error", text: "Please describe what you saw or felt (at least 10 letters)." });

    setBusy(true);
    try {
      const result = await api.post("/api/reports", {
        location: place.name,
        category,
        severity,
        description,
        slot,
        time: formatHHMM(new Date()),
      });
      replaceLocation(result.location);
      setCategory("");
      setDescription("");
      setReload((n) => n + 1);
      setMessage({
        type: "ok",
        text: `Thank you! Your report is saved. ${place.name} · ${SLOT_LABEL[slot]} is now ${result.location.slots[slot].score}.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="page-title">Community</h1>
      <p className="page-sub">Share what you saw or felt in your neighborhood</p>

      <div className="community-grid">
        <form className="card report-form" onSubmit={submit}>
          {!user && (
            <p className="notice info">
              Please <Link to="/login" state={{ from: "/community" }}>log in</Link> to share a report.
            </p>
          )}

          <p className="small-title">New report</p>
          <div className="chip-wrap">
            <label className="chip active select-chip">
              <span className="visually-hidden">Area</span>
              <select value={place.name} onChange={(e) => setPlaceName(e.target.value)}>
                {[...locations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name}
                    </option>
                  ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </label>
            <button type="button" className="chip" onClick={nextSlot} title="Tap to change the time of day">
              {isAuto ? `Auto · ${formatClock(now)} · ${SLOT_LABEL[slot]}` : `${SLOT_LABEL[slot]} · chosen by you`}
            </button>
          </div>

          <p className="small-title">What happened?</p>
          <div className="chip-wrap" role="group" aria-label="What happened">
            {WHAT_HAPPENED.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={"chip" + (category === value ? " active" : "")}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="small-title">Severity</p>
          <div className="chip-wrap" role="group" aria-label="Severity">
            {SEVERITIES.map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={"chip" + (severity === value ? " active" : "")}
                aria-pressed={severity === value}
                onClick={() => setSeverity(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="field">
            <span className="visually-hidden">Describe what you saw or felt</span>
            <textarea
              className="input"
              placeholder="Describe what you saw or felt…"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {message && <p className={"notice " + message.type}>{message.text}</p>}

          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Sending…" : user ? "Submit report" : "Log in to submit"}
          </button>
        </form>

        <section>
          <p className="small-title list-title">
            Recent reports · {SLOT_LABEL[slot]} · {place.name}
          </p>
          {loadingReports && <p className="empty">Loading reports…</p>}
          {!loadingReports && reports.length === 0 && (
            <div className="card">
              <p className="empty">No reports for {place.name} in the {SLOT_LABEL[slot].toLowerCase()} yet.</p>
            </div>
          )}
          {reports.map((r) => (
            <article className="card report" key={r.id}>
              <div className="report-head">
                <h3>{r.title}</h3>
                <Badge level={SEVERITY_LEVEL[r.severity]}>{r.severity[0].toUpperCase() + r.severity.slice(1)}</Badge>
              </div>
              <p className="report-meta">
                {r.location} · {r.time} · {daysAgoText(r.daysAgo)}
              </p>
              <p className="report-text">{r.description}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
