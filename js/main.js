'use strict';

import { geocodeCity, fetchForecast } from "./api.js";
import {
  getUnit, setUnit,
  saveForecastBundle, loadForecastBundle,
  saveTodayPlan, loadTodayPlan
} from "./storage.js";
import { setStatus, setButtonLoading, renderAll, renderWeatherWarning } from "./ui.js";

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

const SELECTED_KEY = "selectedActivities";

function loadAllActivities() {
  try { return JSON.parse(localStorage.getItem(SELECTED_KEY) || "[]"); }
  catch { return []; }
}

function saveAllActivities(all) {
  localStorage.setItem(SELECTED_KEY, JSON.stringify(all));
}

function getCityName() {
  return loadForecastBundle()?.place?.name || "";
}

function buildDateOptions(selectEl, defaultDate) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const bundle = loadForecastBundle();
  const dates  = bundle?.forecast?.daily?.time || [];

  if (dates.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    const opt = document.createElement("option");
    opt.value       = today;
    opt.textContent = new Date(today + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    selectEl.appendChild(opt);
    return;
  }

  dates.forEach(dateStr => {
    const opt = document.createElement("option");
    opt.value       = dateStr;
    opt.textContent = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (dateStr === defaultDate) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function getSelectedDate() {
  return document.getElementById("plannerDateSelect")?.value || new Date().toISOString().slice(0, 10);
}

function getCategoryForDate(dateStr) {
  const bundle = loadForecastBundle();
  const dates  = bundle?.forecast?.daily?.time || [];
  const codes  = bundle?.forecast?.daily?.weather_code || [];
  const lows   = bundle?.forecast?.daily?.temperature_2m_min || [];
  const unit   = bundle?.unit || "fahrenheit";
  const idx    = dates.indexOf(dateStr);
  const wmo    = idx >= 0 ? (codes[idx] ?? 0) : 0;
  const low    = idx >= 0 ? (lows[idx]  ?? 20) : 20;
  return getActivityCategory(wmo, low, unit);
}

function renderPlanList() {
  const container = document.getElementById("plannerPlanList");
  if (!container) return;

  const all  = loadAllActivities();
  const city = getCityName();

  const cityItems = all
    .map((a, i) => ({ ...a, _globalIndex: i }))
    .filter(a => a.city === city);

  container.innerHTML = "";

  if (cityItems.length >= 5) {
    container.classList.add("plan-list-scroll");
  } else {
    container.classList.remove("plan-list-scroll");
  }

  if (cityItems.length === 0) {
    container.innerHTML = `<p class="plan-empty" style="padding:0.5rem 0">No activities yet.</p>`;
    return;
  }

  cityItems.forEach((item) => {
    const globalIndex = item._globalIndex;
    const id  = `plan-main-${globalIndex}`;
    const div = document.createElement("div");
    div.className = "plan-item fade-in";
    div.setAttribute("role", "listitem");

    const descHtml = item.description
      ? `<span class="plan-desc">${item.description}</span>`
      : "";

    div.innerHTML = `
      <input type="checkbox" class="plan-checkbox" id="${id}">
      <label class="plan-label" for="${id}">
        <div class="plan-info">
          <span class="plan-title">${item.activity}</span>
          ${descHtml}
          <div class="plan-details">
            <select class="plan-date-edit" aria-label="Change date for ${item.activity}"></select>
          </div>
        </div>
      </label>
      <div class="plan-item-actions">
        <button class="plan-action-btn delete" aria-label="Delete ${item.activity}" title="Delete">&#x2715;</button>
      </div>
    `;

    const dateSelect = div.querySelector(".plan-date-edit");
    buildDateOptions(dateSelect, item.date);

    dateSelect.addEventListener("change", () => {
      const current = loadAllActivities();
      if (current[globalIndex]) {
        current[globalIndex].date = dateSelect.value;
        current[globalIndex].weatherCondition = getCategoryForDate(dateSelect.value);
        saveAllActivities(current);
      }
    });

    dateSelect.addEventListener("click", (e) => e.stopPropagation());

    div.querySelector(".plan-action-btn.delete").addEventListener("click", () => {
      const current = loadAllActivities();
      current.splice(globalIndex, 1);
      saveAllActivities(current);
      renderPlanList();
    });

    container.appendChild(div);
  });
}

/* Inline form shown inside the Plan card instead of a floating modal */
function initIndexInlineForm() {
  const openBtn    = document.getElementById("indexOpenModalBtn");
  const form       = document.getElementById("indexInlineForm");
  const nameInput  = document.getElementById("indexInlineName");
  const descInput  = document.getElementById("indexInlineDesc");
  const cancelBtn  = document.getElementById("indexInlineCancel");
  const confirmBtn = document.getElementById("indexInlineConfirm");
  if (!openBtn || !form) return;

  function openForm() {
    nameInput.value = "";
    descInput.value = "";
    nameInput.style.borderColor = "";
    form.classList.remove("hidden");
    openBtn.classList.add("hidden");
    nameInput.focus();
  }

  function closeForm() {
    form.classList.add("hidden");
    openBtn.classList.remove("hidden");
  }

  function confirmAdd() {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.style.borderColor = "#e24b4a";
      nameInput.focus();
      return;
    }
    const date     = getSelectedDate();
    const category = getCategoryForDate(date);
    const city     = getCityName();
    const all      = loadAllActivities();
    all.push({
      city,
      date,
      activity:         name,
      description:      descInput.value.trim(),
      weatherCondition: category,
      savedAt:          new Date().toISOString()
    });
    saveAllActivities(all);
    showToast(`"${name}" added!`);
    renderPlanList();
    closeForm();
  }

  openBtn.addEventListener("click", openForm);
  cancelBtn.addEventListener("click", closeForm);
  confirmBtn.addEventListener("click", confirmAdd);

  nameInput.addEventListener("input", () => { nameInput.style.borderColor = ""; });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); descInput.focus(); }
    if (e.key === "Escape") closeForm();
  });
  descInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); confirmAdd(); }
    if (e.key === "Escape") closeForm();
  });
}

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
    btn.dataset.name = activity.name;
    btn.innerHTML = `
      <span class="suggestion-circle" aria-hidden="true"></span>
      <span class="suggestion-text">${activity.name}</span>
    `;

    btn.addEventListener("click", () => {
      const date     = getSelectedDate();
      const cat      = getCategoryForDate(date);
      const city     = getCityName();
      const all      = loadAllActivities();
      all.push({ city, date, activity: activity.name, description: activity.description || "", weatherCondition: cat, savedAt: new Date().toISOString() });
      saveAllActivities(all);
      showToast(`"${activity.name}" added!`);
      renderPlanList();

      btn.classList.add("is-added");
      btn.setAttribute("aria-label", `Added: ${activity.name}`);
      setTimeout(() => {
        btn.classList.remove("is-added");
        btn.setAttribute("aria-label", `Add ${activity.name} to plan`);
      }, 1500);
    });

    container.appendChild(btn);
  });
}

function showToast(message) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id          = "toast";
  toast.className   = "toast fade-in";
  toast.textContent = message;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

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
    saveForecastBundle({ place, forecast, unit, savedAt: new Date().toISOString() });
    const today = forecast.daily?.time?.[0] || new Date().toISOString().slice(0, 10);
    buildDateOptions(document.getElementById("plannerDateSelect"), today);
    await renderPlannerSuggestions(forecast, unit);
    renderPlanList();
  } catch (err) {
    console.error(err);
    setStatus("Error fetching weather.");
  } finally {
    setButtonLoading(false);
  }
}

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

async function initAutoLoad() {
  const bundle = loadForecastBundle();
  if (!bundle?.forecast || !bundle?.place) return;
  renderAll({
    place: bundle.place,
    forecast: bundle.forecast,
    unitSymbol: unitSymbol(bundle.unit || getUnit())
  });
  renderWeatherWarning(bundle.forecast, bundle.unit || getUnit());
  const today = bundle.forecast.daily?.time?.[0] || new Date().toISOString().slice(0, 10);
  buildDateOptions(document.getElementById("plannerDateSelect"), today);
  await renderPlannerSuggestions(bundle.forecast, bundle.unit || getUnit());
  renderPlanList();
}

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
        saveForecastBundle({ place, forecast, unit, savedAt: new Date().toISOString() });
        const today = forecast.daily?.time?.[0] || new Date().toISOString().slice(0, 10);
        buildDateOptions(document.getElementById("plannerDateSelect"), today);
        await renderPlannerSuggestions(forecast, unit);
        renderPlanList();
      } catch (err) {
        console.error(err);
        runSearch("Seattle");
      }
    },
    () => runSearch("Seattle"),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function init() {
  initUnitDropdown();
  initForm();
  wireDailyClicks();
  initIndexInlineForm();
  await initAutoLoad();
  initDefaultLocation();
}

init();