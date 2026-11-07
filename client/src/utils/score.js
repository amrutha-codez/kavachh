// ---------------------------------------------------------------
// KAVACH RULES - the one place every page gets them from
//   Score colours : 65-100 Safe, 45-64 Medium, 0-44 Risky
//   Time of day   : Morning 5AM-12PM, Afternoon 12PM-6PM, Night 6PM-5AM
// (The server has the same rules in server/scoring.js)
// ---------------------------------------------------------------

export const SLOTS = ["morning", "afternoon", "night"];
export const SLOT_LABEL = { morning: "Morning", afternoon: "Afternoon", night: "Night" };
export const SLOT_RANGE = { morning: "5 AM–12 PM", afternoon: "12–6 PM", night: "6 PM–5 AM" };

export function getScoreLevel(score) {
  if (score >= 65) return "safe";
  if (score >= 45) return "medium";
  return "risky";
}

export const LEVEL_LABEL = { safe: "Safe", medium: "Medium", risky: "Risky" };
export const SEVERITY_BY_LEVEL = { safe: "Low", medium: "Medium", risky: "High" };

export function getTimeOfDay(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "night";
}

// "9:15 AM"
export function formatClock(date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// "09:15" (what the server stores for a report)
export function formatHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Good night";
}

export function daysAgoText(n) {
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
