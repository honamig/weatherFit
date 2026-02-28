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