import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ExternalLink, X } from "lucide-react";
import ScoreCircle from "../components/ScoreCircle";
import PlaceSearch from "../components/PlaceSearch";
import { ScoreBadge } from "../components/Badge";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { distanceKm, closest, pointsAlong, getBrowserPosition } from "../utils/geo";
import {
  SLOTS,
  SLOT_LABEL,
  getScoreLevel,
  LEVEL_LABEL,
  formatClock,
} from "../utils/score";
import "./Navigate.css";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const LIGHT_COLORS = { adequate: "#2fa866", partial: "#e5a100", none: "#d64545", unknown: "#9aa0aa" };
const SHORT_NAMES = {
  "Electronic City": "Elec. City",
  "Rajarajeshwari Nagar": "RR Nagar",
  "Bannerghatta Road": "Bannerghatta Rd",
  "CMRIT, AECS Layout": "AECS Layout",
  "Ramamurthy Nagar": "R.M. Nagar",
};

// Names come from our own data, but we still make them safe before putting them in map HTML.
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown");

export default function MapPage() {
  const { locations, place, setPlaceName, slot, setSlot, isAuto, now } = useApp();

  const mapBox = useRef(null);
  const cardRef = useRef(null);
  const mapRef = useRef(null);
  const layers = useRef({});

  const [selectedName, setSelectedName] = useState(place.name);
  const [on, setOn] = useState({ score: true, lights: false, bus: false, police: false });
  const [busStops, setBusStops] = useState(null);
  const [police, setPolice] = useState(null);
  const [layerError, setLayerError] = useState("");
  const [route, setRoute] = useState(null);
  const [routeBusy, setRouteBusy] = useState(false);

  const selected = locations.find((l) => l.name === selectedName) || place;
  const sel = selected.slots[slot];
  const selLevel = getScoreLevel(sel.score);

  // ---------- 1. create the map once ----------
  useEffect(() => {
    const map = L.map(mapBox.current, { zoomControl: false, preferCanvas: true }).setView(
      [place.latitude, place.longitude],
      13
    );
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    layers.current = {
      area: L.layerGroup().addTo(map),
      lights: L.layerGroup().addTo(map),
      bus: L.layerGroup().addTo(map),
      police: L.layerGroup().addTo(map),
      route: L.layerGroup().addTo(map),
      here: L.layerGroup().addTo(map),
    };

    // zoomed far out: hide the area names so bubbles do not pile up
    const updateZoomClass = () => mapBox.current?.classList.toggle("zoom-far", map.getZoom() < 13);
    map.on("zoomend", updateZoomClass);
    updateZoomClass();

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 2. coloured bubbles for every area ----------
  useEffect(() => {
    const group = layers.current.area;
    group.clearLayers();
    if (!on.score) return;
    for (const loc of locations) {
      const s = loc.slots[slot];
      const level = getScoreLevel(s.score);
      const isSel = loc.name === selectedName;
      const icon = L.divIcon({
        className: "bubble-wrap",
        html:
          `<div class="bubble ${level}${isSel ? " sel" : ""}">` +
          `<span class="b-name">${esc(SHORT_NAMES[loc.name] || loc.name)}</span><b>${s.score}</b></div>`,
        iconSize: [104, 50],
        iconAnchor: [52, 25],
      });
      L.marker([loc.latitude, loc.longitude], {
        icon,
        title: `${loc.name}: ${s.score} (${LEVEL_LABEL[level]})`,
        zIndexOffset: isSel ? 1000 : 0,
        keyboard: false,
      })
        .on("click", () => setSelectedName(loc.name))
        .addTo(group);
    }
  }, [locations, slot, on.score, selectedName]);

  // ---------- 3. purple dot for "you are here" (your chosen place) ----------
  useEffect(() => {
    const group = layers.current.here;
    group.clearLayers();
    L.marker([place.latitude, place.longitude], {
      icon: L.divIcon({ className: "here-dot", iconSize: [22, 22], iconAnchor: [11, 11] }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 2000,
    }).addTo(group);
  }, [place]);

  // ---------- 4. load bus stop / police data only when it is first needed ----------
  useEffect(() => {
    if ((on.lights || on.bus) && !busStops) {
      api.get("/api/bus-stops").then(setBusStops).catch((e) => setLayerError(e.message));
    }
    if (on.police && !police) {
      api.get("/api/police-stations").then(setPolice).catch((e) => setLayerError(e.message));
    }
  }, [on.lights, on.bus, on.police, busStops, police]);

  // ---------- 5. streetlights (lighting at bus stops, from the 2026 audit) ----------
  useEffect(() => {
    const group = layers.current.lights;
    group.clearLayers();
    if (!on.lights || !busStops) return;
    for (const s of busStops) {
      L.circleMarker([s.latitude, s.longitude], {
        radius: 7,
        color: "#fff",
        weight: 1.5,
        fillColor: LIGHT_COLORS[s.lighting] || LIGHT_COLORS.unknown,
        fillOpacity: 0.95,
      })
        .bindPopup(`<b>${esc(s.name)}</b><br>Lighting: ${esc(cap(s.lighting))}`)
        .addTo(group);
    }
  }, [on.lights, busStops]);

  // ---------- 6. bus stops ----------
  useEffect(() => {
    const group = layers.current.bus;
    group.clearLayers();
    if (!on.bus || !busStops) return;
    for (const s of busStops) {
      const cctv = s.hasCCTV === true ? "Yes" : s.hasCCTV === false ? "No" : "Unknown";
      L.circleMarker([s.latitude, s.longitude], {
        radius: 4.5,
        color: "#fff",
        weight: 1.5,
        fillColor: "#3d2663",
        fillOpacity: 1,
      })
        .bindPopup(
          `<b>${esc(s.name)}</b><br>Shelter: ${esc(s.shelter || "Unknown")}` +
            `<br>Night safety: ${esc(cap(s.nightSafety))}<br>CCTV: ${cctv}`
        )
        .addTo(group)
        .bringToFront();
    }
  }, [on.bus, busStops, on.lights]);

  // ---------- 7. police stations ----------
  useEffect(() => {
    const group = layers.current.police;
    group.clearLayers();
    if (!on.police || !police) return;
    for (const s of police) {
      L.marker([s.latitude, s.longitude], {
        icon: L.divIcon({ className: "police-wrap", html: '<div class="police-pin">P</div>', iconSize: [24, 24], iconAnchor: [12, 12] }),
        title: s.name,
        keyboard: false,
      })
        .bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.location)}`)
        .addTo(group);
    }
  }, [on.police, police]);

  // ---------- 8. the route line ----------
  useEffect(() => {
    const group = layers.current.route;
    group.clearLayers();
    if (!route) return;
    const from = [route.from.latitude, route.from.longitude];
    const to = [selected.latitude, selected.longitude];
    L.polyline([from, to], { color: "#5b3a8c", weight: 5, dashArray: "4 10", lineCap: "round" }).addTo(group);
    L.circleMarker(from, { radius: 8, color: "#fff", weight: 3, fillColor: "#5b3a8c", fillOpacity: 1 }).addTo(group);
    // zoom so the whole line shows in the free part of the screen (not under the card or the chips)
    const laptop = window.matchMedia("(min-width: 768px)").matches;
    const cardHeight = cardRef.current?.offsetHeight || 0;
    mapRef.current?.fitBounds([from, to], {
      paddingTopLeft: [laptop ? 460 : 30, laptop ? 130 : 160],
      paddingBottomRight: [30, laptop ? 60 : cardHeight + 50],
      maxZoom: 15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // choosing another area ends the route
  useEffect(() => setRoute(null), [selectedName]);

  // ---------- actions ----------
  function toggle(key) {
    setOn((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function pickFromSearch(name) {
    const loc = locations.find((l) => l.name === name);
    setSelectedName(name);
    if (loc) mapRef.current?.flyTo([loc.latitude, loc.longitude], 14);
  }

  function nextSlot() {
    setSlot(SLOTS[(SLOTS.indexOf(slot) + 1) % SLOTS.length]);
  }

  async function startRoute() {
    setRouteBusy(true);
    let origin = await getBrowserPosition();
    let fromLabel = "Your location";
    let note = "";
    const found = origin ? closest(locations, origin) : null;
    if (!origin || found.km > 25) {
      note = origin
        ? `You seem to be outside Bengaluru, so we started from ${place.name}.`
        : `We couldn't get your location, so we started from ${place.name}.`;
      origin = { latitude: place.latitude, longitude: place.longitude };
      fromLabel = place.name;
    }

    // which areas does the straight line pass near? Their average is the "route score".
    const seen = new Set();
    const along = [];
    for (const p of pointsAlong(origin, selected, 12)) {
      const c = closest(locations, p);
      if (c && c.km <= 2.5 && !seen.has(c.item.name)) {
        seen.add(c.item.name);
        along.push(c.item);
      }
    }
    if (!seen.has(selected.name)) along.push(selected);
    const average = Math.round(along.reduce((sum, a) => sum + a.slots[slot].score, 0) / along.length);

    let stations = police;
    if (!stations) {
      try {
        stations = await api.get("/api/police-stations");
        setPolice(stations);
      } catch {
        stations = [];
      }
    }
    const station = closest(stations, selected);
    const km = distanceKm(origin, selected);

    setRoute({
      from: origin,
      fromLabel,
      note,
      along,
      average,
      km,
      minutes: Math.max(1, Math.round(((km * 1.3) / 5) * 60)), // roads are not straight, walking ~5 km/h
      station: station && station.km <= 5 ? station : null,
    });
    setRouteBusy(false);
  }

  const mapsLink = route
    ? `https://www.google.com/maps/dir/?api=1&origin=${route.from.latitude},${route.from.longitude}` +
      `&destination=${selected.latitude},${selected.longitude}&travelmode=walking`
    : "";

  return (
    <div className="nav-page">
      <div className="map" ref={mapBox} />

      {/* search + filter chips */}
      <div className="nav-top">
        <PlaceSearch locations={locations} onPick={pickFromSearch} placeholder="Search a place" className="nav-search" />
        <div className="chip-row">
          <button className="chip active" onClick={nextSlot} title="Tap to change the time of day">
            {SLOT_LABEL[slot]}
            {isAuto ? ` · ${formatClock(now)}` : ""}
          </button>
          <button className={"chip" + (on.score ? " active" : "")} aria-pressed={on.score} onClick={() => toggle("score")}>
            Safety score
          </button>
          <button className={"chip" + (on.lights ? " active" : "")} aria-pressed={on.lights} onClick={() => toggle("lights")}>
            Streetlights
          </button>
          <button className={"chip" + (on.bus ? " active" : "")} aria-pressed={on.bus} onClick={() => toggle("bus")}>
            Bus stops
          </button>
          <button className={"chip" + (on.police ? " active" : "")} aria-pressed={on.police} onClick={() => toggle("police")}>
            Police
          </button>
        </div>
        {layerError && <p className="notice error map-note">{layerError}</p>}

        {/* legend (sits under the chips, so it never covers them) */}
        {(on.score || on.lights) && (
          <div className="map-legend">
            {on.score && (
              <>
                <p><i className="dot" style={{ background: "var(--safe)" }} /> <b>Safe</b></p>
                <p><i className="dot" style={{ background: "var(--medium)" }} /> <b>Medium</b></p>
                <p><i className="dot" style={{ background: "var(--risky)" }} /> <b>Risky</b></p>
              </>
            )}
            {on.lights && (
              <>
                <p className="legend-head">Lighting at bus stops</p>
                <p><i className="dot" style={{ background: LIGHT_COLORS.adequate }} /> Adequate</p>
                <p><i className="dot" style={{ background: LIGHT_COLORS.partial }} /> Partial</p>
                <p><i className="dot" style={{ background: LIGHT_COLORS.none }} /> None</p>
                <p><i className="dot" style={{ background: LIGHT_COLORS.unknown }} /> Unknown</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* bottom card */}
      <div className="nav-card" ref={cardRef}>
        {!route ? (
          <>
            <div className="nav-card-top">
              <div>
                <h2 className="nav-card-name">{selected.name}</h2>
                <p className="nav-card-sub">
                  {sel.severity} severity · {SLOT_LABEL[slot]} · {selected.reportCount}{" "}
                  {selected.reportCount === 1 ? "report" : "reports"}
                </p>
              </div>
              <ScoreCircle score={sel.score} size={72} />
            </div>
            <button className="btn" onClick={startRoute} disabled={routeBusy}>
              {routeBusy ? "Finding your route…" : "Start safe route"}
            </button>
          </>
        ) : (
          <div className="route-panel">
            <div className="route-head">
              <h2 className="nav-card-name">Route to {selected.name}</h2>
              <button className="icon-btn" onClick={() => setRoute(null)} aria-label="Close route">
                <X size={20} />
              </button>
            </div>
            {route.note && <p className="notice info">{route.note}</p>}
            <p className="nav-card-sub">
              From {route.fromLabel} · about {route.km.toFixed(1)} km in a straight line · roughly{" "}
              {route.minutes} min on foot
            </p>

            <p className="small-title">Areas along the way · {SLOT_LABEL[slot]}</p>
            <div className="route-areas">
              {route.along.map((a) => (
                <div key={a.name} className="route-area">
                  <span>{a.name}</span>
                  <ScoreBadge score={a.slots[slot].score} />
                </div>
              ))}
            </div>
            <p className="route-summary">
              Overall for this route: <ScoreBadge score={route.average} />
            </p>
            {getScoreLevel(route.average) === "risky" && (
              <p className="notice error">
                This route is risky at this time. Please travel with someone or use a cab if you can.
              </p>
            )}
            {route.station && (
              <p className="nav-card-sub">
                Nearest police station to your destination: <b>{route.station.item.name}</b> (
                {route.station.km.toFixed(1)} km)
              </p>
            )}
            <a className="btn" href={mapsLink} target="_blank" rel="noopener noreferrer">
              Open walking directions <ExternalLink size={16} style={{ verticalAlign: "-2px" }} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
