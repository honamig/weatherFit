'use strict';

const params   = new URLSearchParams(window.location.search);
const dayIndex = parseInt(params.get("day") ?? "0", 10);

const bundle = JSON.parse(localStorage.getItem("wf_bundle") || "null");
const stored = bundle;

function getCategory(wmoCode, tempC) {
  if (tempC !== null && tempC < 2) return "cold";
  if (wmoCode === 0) return "sunny";
  if ([1, 2, 3].includes(wmoCode)) return "cloudy";
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(wmoCode)) return "rainy";
  if ([71,73,75,77,85,86].includes(wmoCode)) return "snow";
  if ([45,48].includes(wmoCode)) return "cloudy";
  return "cloudy";
}

function getConditionText(wmoCode) {
  const c = Number(wmoCode);
  if (c === 0) return "Clear Sky";
  if ([1, 2, 3].includes(c)) return "Cloudy";
  if ([45, 48].includes(c)) return "Fog";
  if ([51,53,55,56,57].includes(c)) return "Drizzle";
  if ([61,63,65,66,67,80,81,82].includes(c)) return "Rainy";
  if ([71,73,75,77,85,86].includes(c)) return "Snow";
  if ([95,96,99].includes(c)) return "Thunderstorm";
  return "Mixed Weather";
}

function getWeatherIcon(wmoCode) {
  const c = Number(wmoCode);
  if (c === 0) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
  if ([1,2,3].includes(c)) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`;
  if ([61,63,65,66,67,80,81,82,51,53,55,56,57].includes(c)) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
  if ([71,73,75,77,85,86].includes(c)) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8" y2="21"/><line x1="8" y1="21" x2="6" y2="19"/><line x1="8" y1="21" x2="10" y2="19"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="12" y1="21" x2="10" y2="19"/><line x1="12" y1="21" x2="14" y2="19"/><line x1="16" y1="16" x2="16" y2="21"/><line x1="16" y1="21" x2="14" y2="19"/><line x1="16" y1="21" x2="18" y2="19"/></svg>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`;
}

function fmtTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function getDayDate() {
  return (stored?.forecast?.daily?.time || [])[dayIndex] || "";
}

function getCityName() {
  return stored?.place?.name || "";
}

function loadAllActivities() {
  return JSON.parse(localStorage.getItem("selectedActivities") || "[]");
}

function saveAllActivities(all) {
  localStorage.setItem("selectedActivities", JSON.stringify(all));
}

/* -------------------------------------------------------
   Date dropdown — 7-day options
------------------------------------------------------- */

function buildDateOptions(selectEl, defaultDate) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const dates = stored?.forecast?.daily?.time || [];
  if (dates.length === 0) {
    const opt = document.createElement("option");
    opt.value = defaultDate;
    opt.textContent = new Date(defaultDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    selectEl.appendChild(opt);
    return;
  }
  dates.forEach(dateStr => {
    const opt = document.createElement("option");
    opt.value = dateStr;
    opt.textContent = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (dateStr === defaultDate) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function getSelectedSuggestionDate() {
  return document.getElementById("detailsDateSelect")?.value || getDayDate();
}

/* -------------------------------------------------------
   Category helper for a given date
------------------------------------------------------- */

function getCategoryForDate(dateStr) {
  const dates = stored?.forecast?.daily?.time || [];
  const codes = stored?.forecast?.daily?.weather_code || [];
  const lows  = stored?.forecast?.daily?.temperature_2m_min || [];
  const unit  = stored?.unit || "fahrenheit";
  const idx   = dates.indexOf(dateStr);
  const wmo   = idx >= 0 ? (codes[idx] ?? 0) : 0;
  const low   = idx >= 0 ? (lows[idx]  ?? 20) : 20;
  const tempC = unit === "celsius" ? low : (low - 32) * 5 / 9;
  return getCategory(wmo, tempC);
}

/* -------------------------------------------------------
   Add activity
------------------------------------------------------- */

function addActivity(activity, category, date) {
  const all = loadAllActivities();
  all.push({
    city:             getCityName(),
    date:             date || getDayDate(),
    activity:         activity.name,
    description:      activity.description || "",
    weatherCondition: category,
    savedAt:          new Date().toISOString()
  });
  saveAllActivities(all);
  showToast(`"${activity.name}" added to your plan!`);
  renderPlanList();
}

/* -------------------------------------------------------
   Weather details
------------------------------------------------------- */

function populateWeatherDetails() {
  if (!stored || !stored.forecast) {
    document.getElementById("dayTemp").textContent = "--";
    document.getElementById("dayCondition").textContent = "No data available";
    return null;
  }

  const forecast = stored.forecast;
  const unit     = stored.unit || "fahrenheit";
  const unitSym  = unit === "celsius" ? "°C" : "°F";

  const dates    = forecast.daily?.time || [];
  const highs    = forecast.daily?.temperature_2m_max || [];
  const lows     = forecast.daily?.temperature_2m_min || [];
  const codes    = forecast.daily?.weather_code || [];
  const sunrises = forecast.daily?.sunrise || [];
  const sunsets  = forecast.daily?.sunset || [];

  const hourlyTimes    = forecast.hourly?.time || [];
  const dayDateStr     = dates[dayIndex] || "";
  const hourlyStartIdx = hourlyTimes.findIndex(t => t && t.startsWith(dayDateStr));

  const humidity = forecast.hourly?.relative_humidity_2m?.[hourlyStartIdx >= 0 ? hourlyStartIdx : 0];
  const wind     = forecast.hourly?.wind_speed_10m?.[hourlyStartIdx >= 0 ? hourlyStartIdx : 0];

  const wmoCode  = codes[dayIndex] ?? 0;
  const tempHigh = highs[dayIndex] != null ? Math.round(highs[dayIndex]) : "--";
  const tempLow  = lows[dayIndex]  != null ? Math.round(lows[dayIndex])  : "--";
  const avgTemp  = (highs[dayIndex] != null && lows[dayIndex] != null)
    ? Math.round((highs[dayIndex] + lows[dayIndex]) / 2) : "--";

  const dateObj = dayDateStr ? new Date(dayDateStr + "T12:00:00") : new Date();
  const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  document.getElementById("dayTemp").textContent          = avgTemp !== "--" ? `${avgTemp}${unitSym}` : "--";
  document.getElementById("dayCondition").textContent     = getConditionText(wmoCode);
  document.getElementById("dayHigh").textContent          = tempHigh !== "--" ? `${tempHigh}${unitSym}` : "--";
  document.getElementById("dayLow").textContent           = tempLow  !== "--" ? `${tempLow}${unitSym}`  : "--";
  document.getElementById("dayHumidity").textContent      = humidity != null ? `${Math.round(humidity)}%` : "--";
  document.getElementById("dayWind").textContent          = wind     != null ? `${Math.round(wind)} mph`  : "--";
  document.getElementById("dayIcon").innerHTML            = getWeatherIcon(wmoCode);
  document.getElementById("activityDate").textContent     = dateStr;
  document.getElementById("activityLocation").textContent = stored.place?.name || "--";
  document.getElementById("daySunrise").textContent       = fmtTime(sunrises[dayIndex]);
  document.getElementById("daySunset").textContent        = fmtTime(sunsets[dayIndex]);

  const tempLowC = unit === "celsius"
    ? lows[dayIndex]
    : lows[dayIndex] != null ? (lows[dayIndex] - 32) * 5 / 9 : null;

  return { wmoCode, tempLowC };
}

async function fetchActivities() {
  const res = await fetch("activities.json");
  if (!res.ok) throw new Error("Failed to load activities");
  return res.json();
}

/* -------------------------------------------------------
   Suggestions — date dropdown above, click = instant add
------------------------------------------------------- */

function renderSuggestions(activitiesData, baseCategory, filter) {
  const container = document.getElementById("suggestionList");
  container.innerHTML = "";

  const selectedDate = getSelectedSuggestionDate();
  const category     = getCategoryForDate(selectedDate) || baseCategory;

  const categoryData = activitiesData[category] || activitiesData["cloudy"];

  let items = [];
  if (filter === "all") {
    const indoor  = (categoryData.indoor  || []).map(a => ({ ...a, type: "indoor"  }));
    const outdoor = (categoryData.outdoor || []).map(a => ({ ...a, type: "outdoor" }));
    items = [...indoor, ...outdoor];
  } else {
    items = (categoryData[filter] || []).map(a => ({ ...a, type: filter }));
  }

  if (items.length === 0) {
    container.innerHTML = `<p class="plan-empty">No activities found for this filter.</p>`;
    return;
  }

  items.slice(0, 5).forEach(activity => {
    const btn = document.createElement("button");
    btn.className = "suggestion-item";
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `Add: ${activity.name}`);
    btn.dataset.name = activity.name;
    btn.innerHTML = `
      <span class="suggestion-circle" aria-hidden="true"></span>
      <div class="suggestion-text-block">
        <span class="suggestion-name">${activity.name}</span>
        <span class="suggestion-desc">${activity.description}</span>
      </div>
    `;

    btn.addEventListener("click", () => {
      const date = getSelectedSuggestionDate();
      const cat  = getCategoryForDate(date) || baseCategory;
      addActivity(activity, cat, date);
      btn.classList.add("is-added");
      btn.setAttribute("aria-label", `Added: ${activity.name}`);
      setTimeout(() => {
        btn.classList.remove("is-added");
        btn.setAttribute("aria-label", `Add: ${activity.name}`);
      }, 1500);
    });

    container.appendChild(btn);
  });

  const subtitle = document.getElementById("suggestionSubtitle");
  if (subtitle) {
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    subtitle.textContent = `Suggested for ${label} weather:`;
  }
}

/* -------------------------------------------------------
   Inline edit for plan list items (name + description)
------------------------------------------------------- */

function startEditDetailsItem(li, all, globalIndex, currentName, currentDesc) {
  const actionsDiv = li.querySelector(".plan-item-actions");
  const checkbox   = li.querySelector(".plan-checkbox");
  const labelEl    = li.querySelector(".plan-label");

  labelEl.style.display          = "none";
  actionsDiv.style.opacity       = "0";
  actionsDiv.style.pointerEvents = "none";
  if (checkbox) checkbox.style.display = "none";

  const editRow = document.createElement("div");
  editRow.className = "plan-edit-row";

  const nameInput = document.createElement("input");
  nameInput.type      = "text";
  nameInput.className = "plan-edit-input";
  nameInput.value     = currentName;
  nameInput.maxLength = 80;
  nameInput.setAttribute("aria-label", "Edit activity name");

  const descInput = document.createElement("input");
  descInput.type        = "text";
  descInput.className   = "plan-edit-input desc-input";
  descInput.value       = currentDesc || "";
  descInput.maxLength   = 120;
  descInput.placeholder = "Description (optional)";
  descInput.setAttribute("aria-label", "Edit activity description");

  editRow.appendChild(nameInput);
  editRow.appendChild(descInput);
  li.insertBefore(editRow, actionsDiv);
  nameInput.focus();
  nameInput.select();

  let saved = false;

  function saveEdit() {
    if (saved) return;
    saved = true;
    const newName = nameInput.value.trim();
    const newDesc = descInput.value.trim();
    if (newName && globalIndex >= 0 && globalIndex < all.length) {
      all[globalIndex].activity    = newName;
      all[globalIndex].description = newDesc;
      localStorage.setItem("selectedActivities", JSON.stringify(all));
    }
    renderPlanList();
  }

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); descInput.focus(); }
    if (e.key === "Escape") { saved = true; renderPlanList(); }
  });
  descInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") { saved = true; renderPlanList(); }
  });
  descInput.addEventListener("blur", () => {
    setTimeout(() => { if (!li.contains(document.activeElement)) saveEdit(); }, 100);
  });
  nameInput.addEventListener("blur", () => {
    setTimeout(() => { if (!li.contains(document.activeElement)) saveEdit(); }, 100);
  });
}

/* -------------------------------------------------------
   Plan list — activities for the currently viewed day
------------------------------------------------------- */

function renderPlanList() {
  const container     = document.getElementById("dayPlanList");
  const all           = loadAllActivities();
  const dayDate       = getDayDate();
  const city          = getCityName();
  const dayActivities = all.filter(a => a.date === dayDate && a.city === city);

  container.innerHTML = "";

  if (dayActivities.length >= 5) {
    container.classList.add("plan-list-scroll");
  } else {
    container.classList.remove("plan-list-scroll");
  }

  if (dayActivities.length === 0) {
    container.innerHTML = `
      <div class="plan-empty">
        <div class="plan-empty-icon">—</div>
        <p>No activities planned yet. Add one from suggestions!</p>
      </div>`;
    return;
  }

  dayActivities.forEach((item, localIndex) => {
    const globalIndex = all.findIndex(
      (a, idx) => a.date === dayDate && a.city === city &&
        all.filter((b, bi) => bi < idx && b.date === dayDate && b.city === city).length === localIndex
    );
    const id = `plan-${localIndex}`;
    const li = document.createElement("div");
    li.className = "plan-item fade-in";
    li.setAttribute("role", "listitem");

    const descHtml = item.description
      ? `<span class="plan-desc">${item.description}</span>`
      : "";

    li.innerHTML = `
      <input type="checkbox" class="plan-checkbox" id="${id}" aria-describedby="${id}-title">
      <label class="plan-label" for="${id}">
        <div class="plan-info">
          <span class="plan-title" id="${id}-title">${item.activity}</span>
          ${descHtml}
        </div>
      </label>
      <div class="plan-item-actions">
        <button class="plan-action-btn delete" aria-label="Delete ${item.activity}" title="Delete">&#x2715;</button>
      </div>
    `;

    li.querySelector(".plan-label").addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT") return;
      e.preventDefault();
      startEditDetailsItem(li, all, globalIndex, item.activity, item.description || "");
    });

    li.querySelector(".plan-action-btn.delete").addEventListener("click", () => {
      all.splice(globalIndex, 1);
      localStorage.setItem("selectedActivities", JSON.stringify(all));
      renderPlanList();
    });

    container.appendChild(li);
  });
}

/* -------------------------------------------------------
   Toast
------------------------------------------------------- */

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

function populateActivityCard(category) {
  const cityName = stored?.place?.name || "your city";
  const nameEl     = document.getElementById("activityName");
  const categoryEl = document.getElementById("activityCategory");
  const timeEl     = document.getElementById("activityTime");
  const durationEl = document.getElementById("activityDuration");
  const descEl     = document.getElementById("activityDescription");

  if (nameEl)     nameEl.textContent     = `${cityName} Activities`;
  if (categoryEl) categoryEl.textContent = `Weather: ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  if (timeEl)     timeEl.textContent     = "All Day";
  if (durationEl) durationEl.textContent = "Flexible";
  if (descEl)     descEl.textContent     = `Here are some great activities for ${category} weather in ${cityName}. Select one to add it to your plan!`;
}

/* -------------------------------------------------------
   Modal — "+ Add Activity" button
   Includes date dropdown defaulting to currently viewed day
------------------------------------------------------- */

function initModal(category) {
  const modal      = document.getElementById("activityModal");
  const openBtn    = document.getElementById("openModalBtn");
  const cancelBtn  = document.getElementById("cancelModalBtn");
  const confirmBtn = document.getElementById("confirmModalBtn");
  const nameInput  = document.getElementById("modalActivityName");
  const descInput  = document.getElementById("modalActivityDesc");
  const dateSelect = document.getElementById("modalActivityDate");
  const nameError  = document.getElementById("modalNameError");

  function openModal() {
    nameInput.value       = "";
    descInput.value       = "";
    nameError.textContent = "";
    nameInput.classList.remove("error");
    // Default to the currently viewed day
    buildDateOptions(dateSelect, getDayDate() || new Date().toISOString().slice(0, 10));
    modal.classList.remove("hidden");
    nameInput.focus();
  }

  function closeModal() {
    modal.classList.add("hidden");
    openBtn.focus();
  }

  function confirmAdd() {
    const name = nameInput.value.trim();
    if (!name) {
      nameError.textContent = "Please enter an activity name.";
      nameInput.classList.add("error");
      nameInput.focus();
      return;
    }
    const selectedDate = dateSelect.value || getDayDate();
    const cat          = getCategoryForDate(selectedDate) || category;
    addActivity(
      { name, description: descInput.value.trim() || `A custom activity for ${cat} weather.` },
      cat,
      selectedDate
    );
    closeModal();
  }

  openBtn.addEventListener("click", openModal);
  cancelBtn.addEventListener("click", closeModal);
  confirmBtn.addEventListener("click", confirmAdd);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });
  nameInput.addEventListener("input", () => {
    nameError.textContent = "";
    nameInput.classList.remove("error");
  });
}

/* -------------------------------------------------------
   Init
------------------------------------------------------- */

async function init() {
  const weatherInfo = populateWeatherDetails();

  let category = "cloudy";
  if (weatherInfo) {
    category = getCategory(weatherInfo.wmoCode, weatherInfo.tempLowC);
  }

  populateActivityCard(category);

  // Date dropdown defaults to the currently viewed day
  const currentDayDate = getDayDate() || new Date().toISOString().slice(0, 10);
  buildDateOptions(document.getElementById("detailsDateSelect"), currentDayDate);

  renderPlanList();
  initModal(category);

  let activitiesData;
  try {
    activitiesData = await fetchActivities();
  } catch (e) {
    console.error(e);
    document.getElementById("suggestionList").innerHTML =
      `<p class="plan-empty">Could not load activities.</p>`;
    return;
  }

  renderSuggestions(activitiesData, category, "all");

  document.getElementById("detailsDateSelect")?.addEventListener("change", () => {
    const filter = document.getElementById("activityFilter")?.value || "all";
    renderSuggestions(activitiesData, category, filter);
  });

  document.getElementById("activityFilter")?.addEventListener("change", (e) => {
    renderSuggestions(activitiesData, category, e.target.value);
  });
}

init();