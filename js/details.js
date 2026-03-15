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
  if (c === 0) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>`;
  }
  if ([1,2,3].includes(c)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>`;
  }
  if ([61,63,65,66,67,80,81,82,51,53,55,56,57].includes(c)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/>
      <line x1="12" y1="15" x2="12" y2="23"/>
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
    </svg>`;
  }
  if ([71,73,75,77,85,86].includes(c)) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
      <line x1="8" y1="16" x2="8" y2="21"/><line x1="8" y1="21" x2="6" y2="19"/>
      <line x1="8" y1="21" x2="10" y2="19"/><line x1="12" y1="16" x2="12" y2="21"/>
      <line x1="12" y1="21" x2="10" y2="19"/><line x1="12" y1="21" x2="14" y2="19"/>
      <line x1="16" y1="16" x2="16" y2="21"/><line x1="16" y1="21" x2="14" y2="19"/>
      <line x1="16" y1="21" x2="18" y2="19"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>`;
}

function fmtTime(iso) {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function getDayDate() {
  return (stored?.forecast?.daily?.time || [])[dayIndex] || "";
}

function getCityName() {
  return stored?.place?.name || "";
}

// Read/write helpers for selectedActivities in localStorage
function loadAllActivities() {
  return JSON.parse(localStorage.getItem("selectedActivities") || "[]");
}

function saveAllActivities(all) {
  localStorage.setItem("selectedActivities", JSON.stringify(all));
}

// Return a Set of activity names already added for this day and city
function getAddedNames() {
  const all = loadAllActivities();
  return new Set(
    all
      .filter(a => a.date === getDayDate() && a.city === getCityName())
      .map(a => a.activity)
  );
}

// Add an activity to localStorage
function addActivity(activity, category) {
  const all = loadAllActivities();
  all.push({
    city: getCityName(),
    date: getDayDate(),
    activity: activity.name,
    description: activity.description || "",
    weatherCondition: category,
    savedAt: new Date().toISOString()
  });
  saveAllActivities(all);
  showToast(`"${activity.name}" added to your plan!`);
  renderPlanList();
}

// Remove all entries matching this activity name, date, and city
function removeActivity(activityName) {
  const all     = loadAllActivities();
  const dayDate = getDayDate();
  const city    = getCityName();
  const filtered = all.filter(
    a => !(a.activity === activityName && a.date === dayDate && a.city === city)
  );
  saveAllActivities(filtered);
  showToast(`"${activityName}" removed from your plan.`);
  renderPlanList();
}

function populateWeatherDetails() {
  if (!stored || !stored.forecast) {
    document.getElementById("dayTemp").textContent = "--";
    document.getElementById("dayCondition").textContent = "No data available";
    return null;
  }

  const forecast   = stored.forecast;
  const unit       = stored.unit || "fahrenheit";
  const unitSymbol = unit === "celsius" ? "°C" : "°F";

  const dates    = forecast.daily?.time                || [];
  const highs    = forecast.daily?.temperature_2m_max  || [];
  const lows     = forecast.daily?.temperature_2m_min  || [];
  const codes    = forecast.daily?.weather_code        || [];
  const sunrises = forecast.daily?.sunrise             || [];
  const sunsets  = forecast.daily?.sunset              || [];

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

  document.getElementById("dayTemp").textContent          = avgTemp !== "--" ? `${avgTemp}${unitSymbol}` : "--";
  document.getElementById("dayCondition").textContent     = getConditionText(wmoCode);
  document.getElementById("dayHigh").textContent          = tempHigh !== "--" ? `${tempHigh}${unitSymbol}` : "--";
  document.getElementById("dayLow").textContent           = tempLow  !== "--" ? `${tempLow}${unitSymbol}`  : "--";
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

function renderSuggestions(activitiesData, category, filter) {
  const container = document.getElementById("suggestionList");
  container.innerHTML = "";

  const categoryData = activitiesData[category] || activitiesData["cloudy"];

  let items = [];
  if (filter === "all") {
    const indoor  = (categoryData.indoor  || []).map(a => ({ ...a, type: "indoor"  }));
    const outdoor = (categoryData.outdoor || []).map(a => ({ ...a, type: "outdoor" }));
    items = [...indoor, ...outdoor];
  } else {
    items = (categoryData[filter] || []).map(a => ({ ...a, type: filter }));
  }

  const addedNames = getAddedNames();

  items.slice(0, 5).forEach(activity => {
    const isAdded = addedNames.has(activity.name);

    const btn = document.createElement("button");
    btn.className = "suggestion-item" + (isAdded ? " is-added" : "");
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `${isAdded ? "Remove" : "Add"}: ${activity.name}`);
    btn.dataset.name = activity.name;

    btn.innerHTML = `
      <span class="suggestion-circle" aria-hidden="true"></span>
      <div class="suggestion-text-block">
        <span class="suggestion-name">${activity.name}</span>
        <span class="suggestion-desc">${activity.description}</span>
      </div>
    `;

    btn.addEventListener("click", () => {
      const added = btn.classList.contains("is-added");
      if (added) {
        // Remove from plan
        removeActivity(activity.name);
        btn.classList.remove("is-added");
        btn.setAttribute("aria-label", `Add: ${activity.name}`);
      } else {
        // Add to plan
        addActivity(activity, category);
        btn.classList.add("is-added");
        btn.setAttribute("aria-label", `Remove: ${activity.name}`);
      }
    });

    container.appendChild(btn);
  });

  if (items.length === 0) {
    container.innerHTML = `<p class="plan-empty">No activities found for this filter.</p>`;
  }

  const subtitle = document.getElementById("suggestionSubtitle");
  if (subtitle) {
    const label = category.charAt(0).toUpperCase() + category.slice(1);
    subtitle.textContent = `Suggested for ${label} weather:`;
  }
}

function startEditDetailsItem(div, allActivities, globalIndex, currentText) {
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
      allActivities[globalIndex].activity = newText;
      localStorage.setItem("selectedActivities", JSON.stringify(allActivities));
    }
    renderPlanList();
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")  { e.preventDefault(); saveEdit(); }
    if (e.key === "Escape") { renderPlanList(); }
  });
  input.addEventListener("blur", saveEdit);
}

function renderPlanList() {
  const container     = document.getElementById("dayPlanList");
  const all           = loadAllActivities();
  const dayDate       = getDayDate();
  const city          = getCityName();
  const dayActivities = all.filter(a => a.date === dayDate && a.city === city);

  container.innerHTML = "";

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
    li.innerHTML = `
      <input type="checkbox" class="plan-checkbox" id="${id}" aria-describedby="${id}-title">
      <label class="plan-label" for="${id}">
        <div class="plan-info">
          <span class="plan-title" id="${id}-title">${item.activity}</span>
          <div class="plan-details">
            <span class="plan-location">${item.city}</span>
            <span class="plan-time">${item.weatherCondition}</span>
          </div>
        </div>
      </label>
      <div class="plan-item-actions">
        <button class="plan-action-btn edit" aria-label="Edit ${item.activity}" title="Edit">Edit</button>
        <button class="plan-action-btn delete" aria-label="Delete ${item.activity}" title="Delete">&#x2715;</button>
      </div>
    `;

    li.querySelector(".plan-action-btn.edit").addEventListener("click", () => {
      startEditDetailsItem(li, all, globalIndex, item.activity);
    });

    li.querySelector(".plan-action-btn.delete").addEventListener("click", () => {
      all.splice(globalIndex, 1);
      localStorage.setItem("selectedActivities", JSON.stringify(all));
      // Re-sync suggestion circles
      document.querySelectorAll(".suggestion-item").forEach(btn => {
        if (btn.dataset.name === item.activity) {
          btn.classList.remove("is-added");
          btn.setAttribute("aria-label", `Add: ${item.activity}`);
        }
      });
      renderPlanList();
    });

    container.appendChild(li);
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

function initModal(category) {
  const modal      = document.getElementById("activityModal");
  const openBtn    = document.getElementById("openModalBtn");
  const cancelBtn  = document.getElementById("cancelModalBtn");
  const confirmBtn = document.getElementById("confirmModalBtn");
  const nameInput  = document.getElementById("modalActivityName");
  const descInput  = document.getElementById("modalActivityDesc");
  const nameError  = document.getElementById("modalNameError");

  function openModal() {
    nameInput.value       = "";
    descInput.value       = "";
    nameError.textContent = "";
    nameInput.classList.remove("error");
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
    addActivity({
      name,
      description: descInput.value.trim() || `A custom activity for ${category} weather.`
    }, category);
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

async function init() {
  const weatherInfo = populateWeatherDetails();

  let category = "cloudy";
  if (weatherInfo) {
    category = getCategory(weatherInfo.wmoCode, weatherInfo.tempLowC);
  }

  populateActivityCard(category);
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

  const filterSelect = document.getElementById("activityFilter");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      renderSuggestions(activitiesData, category, filterSelect.value);
    });
  }
}

init();