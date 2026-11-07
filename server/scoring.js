// ---------------------------------------------------------------
// KAVACH RULES (same on the server and in client/src/utils/score.js)
//   Score colours : 65-100 Safe, 45-64 Medium, 0-44 Risky
//   Time of day   : Morning 5AM-12PM, Afternoon 12PM-6PM, Night 6PM-5AM
// ---------------------------------------------------------------

export const SLOTS = ["morning", "afternoon", "night"];

export function slotForHour(hour) {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

export function bandFor(score) {
  if (score >= 65) return "Safe";
  if (score >= 45) return "Medium";
  return "Risky";
}

export function severityFor(band) {
  return { Safe: "Low", Medium: "Medium", Risky: "High" }[band];
}

// ---------------------------------------------------------------
// How a community report changes a score.
// The dataset scores already include the old (seed) reports, so only
// reports submitted through the website in the last 7 days count.
// Each slot can move by at most +10 / -10 points in total.
// ---------------------------------------------------------------
const POINTS = {
  felt_safe: { low: 2, medium: 2, high: 2 },
  poor_lighting: { low: -2, medium: -3, high: -4 },
  felt_unsafe: { low: -3, medium: -4, high: -5 },
  harassment: { low: -4, medium: -6, high: -8 },
};
const MAX_CHANGE = 10;
const WINDOW_DAYS = 7;

export function reportPoints(report) {
  return POINTS[report.category]?.[report.severity] ?? 0;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function buildLocations(locations, reports, now = new Date()) {
  const windowStart = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // total points per "location|slot" from recent website reports
  const adjust = new Map();
  const counts = new Map();
  for (const r of reports) {
    counts.set(r.location, (counts.get(r.location) || 0) + 1);
    if (r.source !== "user") continue;
    if (new Date(r.createdAt).getTime() < windowStart) continue;
    const key = `${r.location}|${r.slot}`;
    adjust.set(key, (adjust.get(key) || 0) + reportPoints(r));
  }

  return locations.map((loc) => {
    const slots = {};
    for (const slot of SLOTS) {
      const base = loc.timeSlotScores[slot].score;
      const change = clamp(adjust.get(`${loc.locationName}|${slot}`) || 0, -MAX_CHANGE, MAX_CHANGE);
      const score = clamp(base + change, 0, 100);
      const band = bandFor(score);
      slots[slot] = { score, base, change, band, severity: severityFor(band) };
    }
    return {
      name: loc.locationName,
      latitude: loc.latitude,
      longitude: loc.longitude,
      overallScore: loc.locationScore,
      incidentScore: loc.incidentScore,
      nightRiskScore: loc.nightRiskScore,
      communityScore: loc.communityScore,
      infrastructureScore: loc.infrastructureScore,
      slots,
      breakdown: {
        theft: loc.scoreBreakdown.theft,
        nightSafety: loc.scoreBreakdown.nightSafety,
        roadSafety: loc.scoreBreakdown.roadSafety,
        womenSafety: loc.scoreBreakdown.womenSafety,
      },
      // 6 numbers, oldest first. Some months are null (no history yet).
      trend: loc.trend.scores,
      reportCount: counts.get(loc.locationName) || 0,
    };
  });
}
