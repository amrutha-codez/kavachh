import { useEffect, useState } from "react";

// Free weather from open-meteo.com (no sign-up, no key).
// If it can't be reached, the page simply hides the weather.
function describe(code, isDay) {
  if (code === 0) return isDay ? "Sunny" : "Clear";
  if (code === 1 || code === 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

export default function useWeather(latitude, longitude) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    const controller = new AbortController();
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`;

    fetch(url, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const c = d.current;
        setWeather({
          text: `${Math.round(c.temperature_2m)}°C · ${describe(c.weather_code, c.is_day === 1)}`,
        });
      })
      .catch(() => setWeather(null));

    return () => controller.abort();
  }, [latitude, longitude]);

  return weather;
}
