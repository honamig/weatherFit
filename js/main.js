// js/main.js
'use strict';

import { geocodeCity, fetchForecast } from "./api.js";
import {
  getUnit,
  setUnit,
  saveForecastBundle,
  loadForecastBundle,
  saveTodayPlan,
  loadTodayPlan
} from "./storage.js";
import { setStatus, setButtonLoading, renderAll } from "./ui.js";

/* -------------------------------------------------------
   Utility
------------------------------------------------------- */

// Converts unit value to a symbol for display
function unitSymbol(unit) {
  return unit === "celsius" ? "°C" : "°F";
}

// Validates city input before calling the API
function validateCityInput(value) {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return { ok: false, message: "Enter at least 2 letters." };
  }
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return { ok: false, message: "Letters and spaces only." };
  }
  return { ok: true, message: "" };
}

function getWeatherWarning(forecast) {
  const current = forecast?.current || {};
  const hourly = forecast?.hourly || {};
  const daily = forecast?.daily || {};

  const unit = getUnit();
  const temp = current.temperature_2m;
  const wind = current.wind_speed_10m || 0;
  const precipitationNow = hourly.precipitation?.[0] || 0;
  const snowfallToday = daily.snowfall_sum?.[0] || 0;

  const heatThreshold = unit === "celsius" ? 32 : 90;

  if (typeof temp === "number" && temp >= heatThreshold) {
    return "Heat Warning: High temperatures may make outdoor activities uncomfortable or unsafe. Stay hydrated and limit time in direct sun.";
  }

  if (wind >= 20) {
    return "Strong Wind Warning: Windy conditions may affect outdoor activities. Use caution when outside.";
  }

  if (precipitationNow >= 2) {
    return "Rain Alert: Wet weather may affect outdoor plans. Consider indoor activities or bring rain gear.";
  }

  if (snowfallToday > 0) {
    return "Snow Alert: Snowy conditions may make travel and outdoor activities more difficult.";
  }

  return "";
}

function renderWeatherWarning(message) {
  const warningBox = document.getElementById("weatherWarning");
  const warningText = document.getElementById("weatherWarningText");

  if (!warningBox || !warningText) return;

  if (!message) {
    warningText.textContent = "";
    warningBox.classList.add("hidden");
    return;
  }

  warningText.textContent = message;
  warningBox.classList.remove("hidden");
}

/* -------------------------------------------------------
   Search Flow
------------------------------------------------------- */

// Runs a search: geocode -> forecast -> render -> save
async function runSearch(city) {
  const unit = getUnit();

  setStatus("");
  setButtonLoading(true);

  try {
    const place = await geocodeCity(city);

    if (!place) {
      setStatus("City not found.");
      return;
    }

    const forecast = await fetchForecast(place.lat, place.lon, unit);

    renderAll({
      place,
      forecast,
      unitSymbol: unitSymbol(unit)
    });

    renderWeatherWarning(getWeatherWarning(forecast));

    // Save to localStorage
    saveForecastBundle({
      place,
      forecast,
      unit,
      savedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);
    setStatus("Error fetching weather.");
  } finally {
    setButtonLoading(false);
  }
}

/* -------------------------------------------------------
   Weekly Card Clicks (URL Parameters Requirement)
------------------------------------------------------- */

function wireDailyClicks() {
  const row = document.getElementById("weeklyRow");
  if (!row) return;

  const go = (card) => {
    const day = card?.dataset?.day;
    if (day == null) return;
    window.location.href = `details.html?day=${encodeURIComponent(day)}`;
  };

  row.addEventListener("click", (e) => {
    const card = e.target.closest(".week-card");
    if (!card) return;
    go(card);
  });

  row.addEventListener("keydown", (e) => {
    const card = e.target.closest(".week-card");
    if (!card) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go(card);
    }
  });
}

/* -------------------------------------------------------
   Unit Dropdown
------------------------------------------------------- */

function initUnitDropdown() {
  const select = document.getElementById("unitSelect");
  if (!select) return;

  const saved = getUnit();

  if (saved === "celsius" || saved === "fahrenheit") {
    select.value = saved;
  } else {
    select.value = ""; // placeholder "Temp"
  }

  select.addEventListener("change", async () => {
    // Ignore placeholder selection
    if (!select.value) return;

    setUnit(select.value);

    const bundle = loadForecastBundle();
    if (bundle?.place?.name) {
      await runSearch(bundle.place.name);
    } else {
      await runSearch("Seattle");
    }
  });
}

/* -------------------------------------------------------
   Search Form
------------------------------------------------------- */

function initForm() {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchCity");
  if (!form || !input) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const check = validateCityInput(input.value);
    if (!check.ok) {
      setStatus(check.message);
      return;
    }

    await runSearch(input.value.trim());
  });
}

/* -------------------------------------------------------
   Auto Load Saved Forecast
------------------------------------------------------- */

function initAutoLoad() {
  const bundle = loadForecastBundle();
  if (!bundle?.forecast || !bundle?.place) return;

  renderAll({
    place: bundle.place,
    forecast: bundle.forecast,
    unitSymbol: unitSymbol(bundle.unit || getUnit())
  });

  renderWeatherWarning(getWeatherWarning(bundle.forecast));
}

/* -------------------------------------------------------
   Default Location (Geolocation)
------------------------------------------------------- */

function initDefaultLocation() {
  const existing = loadForecastBundle();
  if (existing?.forecast) return;

  if (!navigator.geolocation) {
    runSearch("Seattle");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const unit = getUnit();
      const { latitude, longitude } = pos.coords;

      try {
        const forecast = await fetchForecast(latitude, longitude, unit);

        const place = {
          name: "Current Location",
          country: "",
          lat: latitude,
          lon: longitude
        };

        renderAll({
          place,
          forecast,
          unitSymbol: unitSymbol(unit)
        });

        renderWeatherWarning(getWeatherWarning(forecast));

        saveForecastBundle({
          place,
          forecast,
          unit,
          savedAt: new Date().toISOString()
        });

      } catch (err) {
        console.error(err);
        runSearch("Seattle");
      }
    },
    () => runSearch("Seattle"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

/* -------------------------------------------------------
   Today's Plan (LocalStorage Requirement)
------------------------------------------------------- */

function initTodayPlan() {
  const input = document.getElementById("todayPlanInput");
  if (!input) return;

  // Load saved plan
  input.value = loadTodayPlan();

  // Save on typing
  input.addEventListener("input", () => {
    saveTodayPlan(input.value);
  });
}

/* -------------------------------------------------------
   Init
------------------------------------------------------- */

function init() {
  initUnitDropdown();
  initForm();
  wireDailyClicks();
  initAutoLoad();
  initDefaultLocation();
  initTodayPlan();
}

init();