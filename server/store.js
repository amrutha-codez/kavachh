import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");

// ---------- read-only dataset (the 4 files you gave us) ----------
function readDataset(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8"));
}

export const locations = readDataset("locations.json");
export const seedReports = readDataset("reports.json");
export const busStops = readDataset("bus_stops.json");
export const policeStations = readDataset("police_stations.json");
export const locationNames = new Set(locations.map((l) => l.locationName));

// ---------- small JSON "database" for things users create ----------
// users.json and user_reports.json are created automatically.
function loadList(file) {
  const full = path.join(DATA_DIR, file);
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch {
    return [];
  }
}

function saveList(file, list) {
  const full = path.join(DATA_DIR, file);
  const temp = full + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(list, null, 2));
  fs.renameSync(temp, full); // swap in one step so the file is never half-written
}

const users = loadList("users.json");
const userReports = loadList("user_reports.json");

export const db = {
  users,
  userReports,
  saveUsers: () => saveList("users.json", users),
  saveUserReports: () => saveList("user_reports.json", userReports),
};

export { DATA_DIR };
