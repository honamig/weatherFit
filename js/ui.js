// js/ui.js
"use strict";

/* =========================
   STATUS + LOADING UI
   ========================= */

export function setStatus(message) {
  const el = document.getElementById("statusMsg");
  if (!el) return;
  el.textContent = message || "";
}

export function setButtonLoading(isLoading) {
  const btn = document.getElementById("searchBtn");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Loading…" : "Search";
}

/* =========================
   DATE/TIME HELPERS
   ========================= */

function formatDayTimeLocal(currentTimeISO) {
  const d = new Date(currentTimeISO);
  const day = d.toLocaleDateString(undefined, { weekday: "long" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} • ${time}`;
}

function weekdayShortFromISO(dateISO) {
  const d = new Date(dateISO + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function hourLabelFromISO(dateTimeISO) {
  const d = new Date(dateTimeISO);
  return d.toLocaleTimeString(undefined, { hour: "numeric" }).replace(":00", "");
}

/* =========================
   WMO MAPPERS
   ========================= */

function wmoText(code) {
  const c = Number(code);
  if (c === 0) return "Clear";
  if ([1, 2, 3].includes(c)) return "Cloudy";
  if ([45, 48].includes(c)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(c)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(c)) return "Snow";
  if ([95, 96, 99].includes(c)) return "Storm";
  return "Weather";
}

function heroImageFromWmo(code) {
  const c = Number(code);
  if (c === 0) return "clear.jpg";
  if ([1, 2, 3].includes(c)) return "cloudy.jpg";
  if ([45, 48].includes(c)) return "fog.jpg";
  if ([51, 53, 55, 56, 57].includes(c)) return "rain.jpg";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return "rain.jpg";
  if ([71, 73, 75, 77, 85, 86].includes(c)) return "snow.jpg";
  if ([95, 96, 99].includes(c)) return "storm.jpg";
  return "default.jpg";
}

function iconSrcFromWmo(code) {
  const c = Number(code);
  if (c === 0) return "img/icons/clear.png";
  if ([1, 2, 3].includes(c)) return "img/icons/cloudy.png";
  if ([45, 48].includes(c)) return "img/icons/fog.png";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return "img/icons/rain.png";
  if ([71, 73, 75, 77, 85, 86].includes(c)) return "img/icons/snow.png";
  if ([95, 96, 99].includes(c)) return "img/icons/storm.png";
  return "img/icons/default.png";
}

/* =========================
   MAIN SECTIONS RENDERERS
   ========================= */

function renderHeroImage(forecast) {
  const img = document.getElementById("weatherImage");
  if (!img) return;
  const code = forecast?.current?.weather_code;
  const file = heroImageFromWmo(code);
  img.src = `img/hero/${file}`;
  img.onerror = () => {
    img.onerror = null;
    img.src = "img/hero/default.jpg";
  };
}

function renderLocation(place, forecast) {
  const countryEl = document.getElementById("country");
  const cityEl    = document.getElementById("cityName");
  const timeEl    = document.getElementById("dayTime");
  if (countryEl) countryEl.textContent = place.country || "";
  if (cityEl)    cityEl.textContent    = place.name || "City";
  if (timeEl)    timeEl.textContent    = forecast?.current?.time
    ? formatDayTimeLocal(forecast.current.time) : "";
}

function renderCurrentHero(forecast, unitSymbol) {
  const tempNow = document.getElementById("tempNow");
  const cond    = document.getElementById("conditionText");
  const feels   = document.getElementById("feelsLike");

  const t      = forecast?.current?.temperature_2m;
  const w      = forecast?.current?.weather_code;
  const nowISO = forecast?.current?.time;
  const times  = forecast?.hourly?.time || [];
  const idx    = nowISO ? times.indexOf(nowISO) : 0;
  const apparent = forecast?.hourly?.apparent_temperature?.[idx >= 0 ? idx : 0];

  if (tempNow) tempNow.textContent = t != null ? `${Math.round(t)}${unitSymbol}` : "--";
  if (cond)    cond.textContent    = w != null ? wmoText(w) : "Weather";
  if (feels)   feels.textContent   = apparent != null ? `${Math.round(apparent)}${unitSymbol}` : "--";
}

function renderStats(forecast, unitSymbol) {
  const humidityEl = document.getElementById("humidity");
  const windEl     = document.getElementById("wind");
  const highEl     = document.getElementById("tempHigh");
  const lowEl      = document.getElementById("tempLow");

  const hum  = forecast?.current?.relative_humidity_2m;
  const wind = forecast?.current?.wind_speed_10m;
  const hi   = forecast?.daily?.temperature_2m_max?.[0];
  const lo   = forecast?.daily?.temperature_2m_min?.[0];

  if (humidityEl) humidityEl.textContent = hum  != null ? `${Math.round(hum)}%`          : "--";
  if (windEl)     windEl.textContent     = wind != null ? `${Math.round(wind)} mph`       : "--";
  if (highEl)     highEl.textContent     = hi   != null ? `${Math.round(hi)}${unitSymbol}` : "--";
  if (lowEl)      lowEl.textContent      = lo   != null ? `${Math.round(lo)}${unitSymbol}` : "--";
}

function renderSun(forecast) {
  const sunriseEl = document.getElementById("sunrise");
  const sunsetEl  = document.getElementById("sunset");
  const sunrise   = forecast?.daily?.sunrise?.[0];
  const sunset    = forecast?.daily?.sunset?.[0];

  const fmt = (iso) => {
    if (!iso) return "--";
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  if (sunriseEl) sunriseEl.textContent = fmt(sunrise);
  if (sunsetEl)  sunsetEl.textContent  = fmt(sunset);
}

function renderDaily(forecast, unitSymbol) {
  const row = document.getElementById("weeklyRow");
  if (!row) return;

  const times = forecast?.daily?.time    || [];
  const highs = forecast?.daily?.temperature_2m_max || [];
  const lows  = forecast?.daily?.temperature_2m_min || [];
  const codes = forecast?.daily?.weather_code       || [];

  row.innerHTML = "";
  row.classList.add("daily-grid");

  const count = Math.min(7, times.length, highs.length, lows.length, codes.length);

  for (let i = 0; i < count; i++) {
    const card = document.createElement("article");
    card.className  = "week-card";
    card.dataset.day = String(i);
    card.tabIndex   = 0;

    const iconSrc = iconSrcFromWmo(codes[i]);
    card.innerHTML = `
      <p class="week-day">${weekdayShortFromISO(times[i])}</p>
      <div class="week-icon" aria-hidden="true">
        <img src="${iconSrc}" alt="" width="24" height="24" />
      </div>
      <p class="week-hi">${Math.round(highs[i])}${unitSymbol}</p>
      <p class="week-lo">${Math.round(lows[i])}${unitSymbol}</p>
    `;
    row.appendChild(card);
  }
}

function renderHourly(forecast, unitSymbol) {
  const row = document.getElementById("hourlyRow");
  if (!row) return;

  const times = forecast?.hourly?.time            || [];
  const temps = forecast?.hourly?.temperature_2m  || [];
  const codes = forecast?.hourly?.weather_code    || [];

  row.innerHTML = "";

  const nowISO     = forecast?.current?.time;
  const startIndex = nowISO ? times.indexOf(nowISO) : 0;
  const start      = startIndex >= 0 ? startIndex : 0;
  const end        = Math.min(start + 8, times.length, temps.length, codes.length);

  for (let i = start; i < end; i++) {
    const card    = document.createElement("div");
    card.className = "hour-card";
    const iconSrc  = iconSrcFromWmo(codes[i]);
    card.innerHTML = `
      <p class="hour">${hourLabelFromISO(times[i])}</p>
      <img src="${iconSrc}" alt="" width="22" height="22" />
      <p class="hour-temp">${Math.round(temps[i])}${unitSymbol}</p>
    `;
    row.appendChild(card);
  }
}

/* =========================
   PUBLIC RENDER ENTRY
   ========================= */

export function renderAll({ place, forecast, unitSymbol }) {
  renderLocation(place, forecast);
  renderHeroImage(forecast);
  renderCurrentHero(forecast, unitSymbol);
  renderStats(forecast, unitSymbol);
  renderSun(forecast);
  renderDaily(forecast, unitSymbol);
  renderHourly(forecast, unitSymbol);
}

export function renderWeatherWarning(forecast, unit = "fahrenheit") {
  const warningBox  = document.getElementById("weatherWarning");
  const warningText = document.getElementById("weatherWarningText");
  if (!warningBox || !warningText) return;

  const current   = forecast?.current  || {};
  const daily     = forecast?.daily    || {};
  const hourly    = forecast?.hourly   || {};

  let temp             = current.temperature_2m;
  const windSpeed      = current.wind_speed_10m    || 0;
  const precipNow      = hourly.precipitation?.[0] || 0;
  const snowfallToday  = daily.snowfall_sum?.[0]   || 0;

  // Convert to Fahrenheit if needed for threshold comparison
  const heatThreshold = unit === "celsius" ? 35 : 95;

  let message = "";
  if (typeof temp === "number" && temp >= heatThreshold) {
    message = "Heat Warning: High temperatures may make outdoor activities unsafe. Stay hydrated and limit time in direct sun.";
  } else if (windSpeed >= 25) {
    message = "Strong Wind Warning: Windy conditions may affect outdoor activities. Use caution if spending time outside.";
  } else if (precipNow >= 5) {
    message = "Heavy Rain Alert: Rain may affect outdoor plans. Consider indoor activities or bring rain gear.";
  } else if (snowfallToday > 0) {
    message = "Snow Alert: Snowy conditions may make travel and outdoor activities more difficult.";
  }

  if (message) {
    warningText.textContent = message;
    warningBox.classList.remove("hidden");
  } else {
    warningText.textContent = "";
    warningBox.classList.add("hidden");
  }
}