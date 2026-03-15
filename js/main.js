// js/main.js
'use strict';

import { geocodeCity, fetchForecast } from "./api.js";
import {
  getUnit, setUnit,
  saveForecastBundle, loadForecastBundle,
  saveTodayPlan, loadTodayPlan
} from "./storage.js";
import { setStatus, setButtonLoading, renderAll, renderWeatherWarning } from "./ui.js";

/* -------------------------------------------------------
   Utility
------------------------------------------------------- */

function unitSymbol(unit) {
  return unit === "celsius" ? "°C" : "°F";
}

function validateCityInput(value) {
  const t = value.trim();
  if (t.length < 2) return { ok: false, message: "Enter at least 2 letters." };
  if (!/^[A-Za-z\s\-]+$/.test(t)) return { ok: false, message: "Letters and spaces only." };
  return { ok: true, message: "" };
}

function getActivityCategory(wmoCode, tempValue, unit) {
  const tempC = unit === "celsius" ? tempValue : (tempValue - 32) * 5 / 9;
  if (tempC < 2) return "cold";
  if (wmoCode === 0) return "sunny";
  if ([1,2,3].includes(wmoCode)) return "cloudy";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(wmoCode)) return "rainy";
  if ([71,73,75,77,85,86].includes(wmoCode)) return "snow";
  return "cloudy";
}

/* -------------------------------------------------------
   Today's Plan — localStorage
------------------------------------------------------- */

const TODAY_ITEMS_KEY = "wf_today_items";

function loadTodayItems() {
  try { return JSON.parse(localStorage.getItem(TODAY_ITEMS_KEY) || "[]"); }
  catch { return []; }
}

function saveTodayItems(items) {
  localStorage.setItem(TODAY_ITEMS_KEY, JSON.stringify(items));
}

function renderPlanList() {
  const container = document.getElementById("plannerPlanList");
  if (!container) return;

  const items = loadTodayItems();
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `<p class="plan-empty" style="padding:0.5rem 0">No activities yet.</p>`;
    return;
  }

  items.forEach((text, i) => {
    const id  = `plan-main-${i}`;
    const div = document.createElement("div");
    div.className = "plan-item fade-in";
    div.setAttribute("role", "listitem");
    div.innerHTML = `
      <input type="checkbox" class="plan-checkbox" id="${id}">
      <label class="plan-label" for="${id}">
        <div class="plan-info">
          <span class="plan-title">${text}</span>
        </div>
      </label>
      <div class="plan-item-actions">
        <button class="plan-action-btn edit" aria-label="Edit ${text}" title="Edit">Edit</button>
        <button class="plan-action-btn delete" aria-label="Delete ${text}" title="Delete">&#x2715;</button>
      </div>
    `;

    div.querySelector(".plan-action-btn.edit").addEventListener("click", () => {
      startEditItem(div, i, text);
    });

    div.querySelector(".plan-action-btn.delete").addEventListener("click", () => {
      const all = loadTodayItems();
      all.splice(i, 1);
      saveTodayItems(all);
      renderPlanList();
    });

    container.appendChild(div);
  });
}

function startEditItem(div, index, currentText) {
  const titleSpan  = div.querySelector(".plan-title");
  const actionsDiv = div.querySelector(".plan-item-actions");
  const labelEl    = div.querySelector(".plan-label");

  labelEl.style.pointerEvents = "none";
  actionsDiv.style.opacity = "0";
  actionsDiv.style.pointerEvents = "none";

  const input = document.createElement("input");
  input.type      = "text";
  input.className = "plan-edit-input";
  input.value     = currentText;
  titleSpan.replaceWith(input);
  input.focus();
  input.select();

  function saveEdit() {
    const newText = input.value.trim();
    if (newText) {
      const all = loadTodayItems();
      all[index] = newText;
      saveTodayItems(all);
    }
    renderPlanList();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") { renderPlanList(); }
  });
  input.addEventListener("blur", saveEdit);
}

function addPlanItem(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const items = loadTodayItems();
  items.push(trimmed);
  saveTodayItems(items);
  renderPlanList();
  return true;
}

function initTodayPlan() {
  const input  = document.getElementById("todayPlanInput");
  const addBtn = document.getElementById("addPlanBtn");
  if (!input) return;

  renderPlanList();

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (addPlanItem(input.value)) input.value = "";
    }
  });

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      if (addPlanItem(input.value)) {
        input.value = "";
        input.focus();
      }
    });
  }
}

/* -------------------------------------------------------
   Planner Suggestions
------------------------------------------------------- */

let _activitiesCache = null;

async function loadActivities() {
  if (_activitiesCache) return _activitiesCache;
  const res = await fetch("activities.json");
  if (!res.ok) throw new Error("Failed to load activities");
  _activitiesCache = await res.json();
  return _activitiesCache;
}

async function renderPlannerSuggestions(forecast, unit) {
  const container = document.getElementById("plannerSuggestionList");
  const titleEl   = document.getElementById("plannerSuggestionTitle");
  if (!container) return;

  const wmoCode  = forecast?.current?.weather_code ?? 0;
  const tempNow  = forecast?.current?.temperature_2m ?? 20;
  const category = getActivityCategory(wmoCode, tempNow, unit);

  if (titleEl) {
    titleEl.textContent = `Suggestions — ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  }

  let activitiesData;
  try { activitiesData = await loadActivities(); }
  catch {
    container.innerHTML = `<p class="plan-empty">Could not load suggestions.</p>`;
    return;
  }

  const categoryData = activitiesData[category] || activitiesData["cloudy"];
  const indoor  = (categoryData.indoor  || []).map(a => ({ ...a, type: "indoor"  }));
  const outdoor = (categoryData.outdoor || []).map(a => ({ ...a, type: "outdoor" }));
  const items   = [...indoor, ...outdoor].slice(0, 4);

  container.innerHTML = "";

  items.forEach(activity => {
    const btn = document.createElement("button");
    btn.className = "suggestion-item";
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `Add ${activity.name} to plan`);
    btn.innerHTML = `
      <span class="suggestion-circle" aria-hidden="true"></span>
      <span class="suggestion-text">${activity.name}</span>
    `;

    btn.addEventListener("click", () => {
      if (btn.classList.contains("is-added")) {
        const all      = loadTodayItems();
        const filtered = all.filter(t => t !== activity.name);
        saveTodayItems(filtered);
        renderPlanList();
        btn.classList.remove("is-added");
        btn.setAttribute("aria-label", `Add ${activity.name} to plan`);
      } else {
        addPlanItem(activity.name);
        btn.classList.add("is-added");
        btn.setAttribute("aria-label", `Remove ${activity.name} from plan`);
      }
    });

    container.appendChild(btn);
  });
}

/* -------------------------------------------------------
   Search
------------------------------------------------------- */

async function runSearch(city) {
  const unit = getUnit();
  setStatus("");
  setButtonLoading(true);
  try {
    const place = await geocodeCity(city);
    if (!place) { setStatus("City not found."); return; }
    const forecast = await fetchForecast(place.lat, place.lon, unit);
    renderAll({ place, forecast, unitSymbol: unitSymbol(unit) });
    renderWeatherWarning(forecast, unit);
    await renderPlannerSuggestions(forecast, unit);
    saveForecastBundle({ place, forecast, unit, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    setStatus("Error fetching weather.");
  } finally {
    setButtonLoading(false);
  }
}

/* -------------------------------------------------------
   Weekly Card Clicks
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
    if (card) go(card);
  });
  row.addEventListener("keydown", (e) => {
    const card = e.target.closest(".week-card");
    if (!card) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(card); }
  });
}

/* -------------------------------------------------------
   Unit Dropdown
------------------------------------------------------- */

function initUnitDropdown() {
  const select = document.getElementById("unitSelect");
  if (!select) return;
  const saved = getUnit();
  select.value = (saved === "celsius" || saved === "fahrenheit") ? saved : "";
  select.addEventListener("change", async () => {
    if (!select.value) return;
    setUnit(select.value);
    const bundle = loadForecastBundle();
    await runSearch(bundle?.place?.name || "Seattle");
  });
}

/* -------------------------------------------------------
   Search Form
------------------------------------------------------- */

function initForm() {
  const form  = document.getElementById("searchForm");
  const input = document.getElementById("searchCity");
  if (!form || !input) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const check = validateCityInput(input.value);
    if (!check.ok) { setStatus(check.message); return; }
    await runSearch(input.value.trim());
  });
}

/* -------------------------------------------------------
   Auto Load Saved Forecast
------------------------------------------------------- */

async function initAutoLoad() {
  const bundle = loadForecastBundle();
  if (!bundle?.forecast || !bundle?.place) return;
  renderAll({
    place: bundle.place,
    forecast: bundle.forecast,
    unitSymbol: unitSymbol(bundle.unit || getUnit())
  });
  renderWeatherWarning(bundle.forecast, bundle.unit || getUnit());
  await renderPlannerSuggestions(bundle.forecast, bundle.unit || getUnit());
}

/* -------------------------------------------------------
   Default Location (Geolocation)
------------------------------------------------------- */

function initDefaultLocation() {
  const existing = loadForecastBundle();
  if (existing?.forecast) return;
  if (!navigator.geolocation) { runSearch("Seattle"); return; }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const unit = getUnit();
      const { latitude, longitude } = pos.coords;
      try {
        const forecast = await fetchForecast(latitude, longitude, unit);
        const place = { name: "Current Location", country: "", lat: latitude, lon: longitude };
        renderAll({ place, forecast, unitSymbol: unitSymbol(unit) });
        renderWeatherWarning(forecast, unit);
        await renderPlannerSuggestions(forecast, unit);
        saveForecastBundle({ place, forecast, unit, savedAt: new Date().toISOString() });
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
   Init
------------------------------------------------------- */

async function init() {
  initUnitDropdown();
  initForm();
  wireDailyClicks();
  initTodayPlan();
  await initAutoLoad();
  initDefaultLocation();
}

init();