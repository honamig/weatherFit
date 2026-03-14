// js/api.js
'use strict';

// Converts city name to coordinates with Open-Meteo Geocoding
export async function geocodeCity(city) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(city)}` +
    `&count=1&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("geocode_failed");

  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) return null;

  return { name: hit.name, country: hit.country, lat: hit.latitude, lon: hit.longitude };
}

// Fetches current + hourly + daily from Open-Meteo
// unit must be "celsius" or "fahrenheit"
export async function fetchForecast(lat, lon, unit) {
  const safeUnit = unit === "celsius" ? "celsius" : "fahrenheit";

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&timezone=auto&forecast_days=7` +
    `&temperature_unit=${safeUnit}` +
    `&wind_speed_unit=mph` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,snowfall_sum`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("forecast_failed");

  const data = await res.json();
  if (data?.error) throw new Error("forecast_failed");

  return data;
}