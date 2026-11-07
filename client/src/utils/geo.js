// Distance in km between two points on Earth (haversine formula)
export function distanceKm(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// The `count` closest items to `from` (not counting `from` itself)
export function nearest(items, from, count, skipName) {
  return items
    .filter((i) => i.name !== skipName)
    .map((i) => ({ item: i, km: distanceKm(from, i) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count)
    .map((x) => x.item);
}

export function closest(items, from) {
  let best = null;
  let bestKm = Infinity;
  for (const item of items) {
    const km = distanceKm(from, item);
    if (km < bestKm) {
      best = item;
      bestKm = km;
    }
  }
  return best ? { item: best, km: bestKm } : null;
}

// Evenly spaced points on the straight line from a to b
export function pointsAlong(a, b, steps) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    });
  }
  return out;
}

// Ask the browser for the person's position. Always answers (null if not allowed).
export function getBrowserPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 7000, maximumAge: 60000 }
    );
  });
}
