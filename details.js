
// Read URL parameter
const params = new URLSearchParams(window.location.search);
const dayIndex = parseInt(params.get("day") ?? "0", 10);

// Load forecast from localStorage
const stored = JSON.parse(localStorage.getItem("weatherData") || "null");

// Weather code → activity category mapping
function getCategory(code, tempC) {
  if (tempC !== null && tempC < 2) return "cold";
  if (code === 800) return "sunny";
  if (code >= 801 && code <= 804) return "cloudy";
  if (code >= 500 && code <= 599) return "rainy";
  if (code >= 600 && code <= 699) return "snow";
  return "cloudy";
}

// Weather code → human-readable description
function getConditionText(code) {
  if (code === 800) return "Clear Sky";
  if (code >= 801 && code <= 804) return "Cloudy";
  if (code >= 500 && code <= 599) return "Rainy";
  if (code >= 600 && code <= 699) return "Snow";
  if (code >= 200 && code <= 299) return "Thunderstorm";
  if (code >= 300 && code <= 399) return "Drizzle";
  if (code >= 700 && code <= 799) return "Foggy";
  return "Mixed Weather";
}

// Weather code → SVG icon
function getWeatherIcon(code) {
  if (code === 800) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
    </svg>`;
  }
  if (code >= 801 && code <= 804) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>`;
  }
  if (code >= 500 && code <= 599) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/>
      <line x1="12" y1="15" x2="12" y2="23"/>
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
    </svg>`;
  }
  if (code >= 600 && code <= 699) {
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

// Populate weather details
function populateWeatherDetails() {
  if (!stored || !stored.forecast) {
    document.getElementById("dayTemp").textContent = "--";
    document.getElementById("dayCondition").textContent = "No data available";
    return;
  }

  const unit = stored.unit || "imperial";
  const unitSymbol = unit === "metric" ? "°C" : "°F";
  const day = stored.forecast[dayIndex];

  if (!day) return;

  const code = day.weatherCode ?? 800;
  const tempLow = unit === "metric" ? day.tempLow_c : day.tempLow_f;
  const tempHigh = unit === "metric" ? day.tempHigh_c : day.tempHigh_f;
  const avgTemp = Math.round((tempLow + tempHigh) / 2);

  const dateObj = new Date(day.date);
  const dateStr = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  document.getElementById("dayTemp").textContent = `${avgTemp}${unitSymbol}`;
  document.getElementById("dayCondition").textContent = getConditionText(code);
  document.getElementById("dayHigh").textContent = `${tempHigh}${unitSymbol}`;
  document.getElementById("dayLow").textContent = `${tempLow}${unitSymbol}`;
  document.getElementById("dayHumidity").textContent = day.humidity ? `${day.humidity}%` : "--";
  document.getElementById("dayWind").textContent = day.wind ? `${day.wind} ${unit === "metric" ? "km/h" : "mph"}` : "--";
  document.getElementById("dayIcon").innerHTML = getWeatherIcon(code);
  document.getElementById("activityDate").textContent = dateStr;
  document.getElementById("activityLocation").textContent = stored.city || "--";

  if (stored.sunrise) document.getElementById("daySunrise").textContent = stored.sunrise;
  if (stored.sunset) document.getElementById("daySunset").textContent = stored.sunset;

  return { code, tempLow_c: day.tempLow_c ?? tempLow };
}

// Fetch activities.json
async function fetchActivities() {
  const res = await fetch("data/activities.json");
  if (!res.ok) throw new Error("Failed to load activities");
  return res.json();
}

// Render suggestions based on category + filter
function renderSuggestions(activitiesData, category, filter) {
  const container = document.getElementById("suggestionList");
  container.innerHTML = "";

  const categoryData = activitiesData[category] || activitiesData["cloudy"];

  let items = [];
  if (filter === "all") {
    items = [...(categoryData.indoor || []), ...(categoryData.outdoor || [])];
  } else {
    items = categoryData[filter] || [];
  }

  items.slice(0, 5).forEach(activity => {
    const btn = document.createElement("button");
    btn.className = "suggestion-item fade-in";
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", `Add ${activity.name} to your plan`);
    btn.innerHTML = `
      <span class="suggestion-icon">${filter === "outdoor" || (filter === "all" && categoryData.outdoor?.find(a => a.name === activity.name)) ? "🌿" : "🏠"}</span>
      <div class="suggestion-text-block">
        <span class="suggestion-name">${activity.name}</span>
        <span class="suggestion-desc">${activity.description}</span>
      </div>
    `;
    btn.addEventListener("click", () => selectActivity(activity, category));
    container.appendChild(btn);
  });

  if (items.length === 0) {
    container.innerHTML = `<p class="plan-empty">No activities found for this filter.</p>`;
  }

  const subtitle = document.getElementById("suggestionSubtitle");
  if (subtitle) {
    subtitle.textContent = `Suggested for ${category.charAt(0).toUpperCase() + category.slice(1)} weather:`;
  }
}

// Save selected activity to localStorage
function selectActivity(activity, category) {
  const existing = JSON.parse(localStorage.getItem("selectedActivities") || "[]");

  const day = stored?.forecast?.[dayIndex];
  const entry = {
    city: stored?.city || "",
    date: day?.date || "",
    activity: activity.name,
    description: activity.description,
    weatherCondition: category,
    savedAt: new Date().toISOString()
  };

  existing.push(entry);
  localStorage.setItem("selectedActivities", JSON.stringify(existing));

  showToast(`"${activity.name}" added to your plan!`);
  renderPlanList();
}

//　Render plan list from localStorage
function renderPlanList() {
  const container = document.getElementById("dayPlanList");
  const all = JSON.parse(localStorage.getItem("selectedActivities") || "[]");
  const day = stored?.forecast?.[dayIndex];
  const dayActivities = all.filter(a => a.date === day?.date && a.city === stored?.city);

  container.innerHTML = "";

  if (dayActivities.length === 0) {
    container.innerHTML = `
      <div class="plan-empty">
        <div class="plan-empty-icon">—</div>
        <p>No activities planned yet. Add one from suggestions!</p>
      </div>`;
    return;
  }

  dayActivities.forEach((item, i) => {
    const id = `plan-${i}`;
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
    `;
    container.appendChild(li);
  });
}

// Toast notification
function showToast(message) {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = "toast fade-in";
  toast.textContent = message;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Populate static activity card fields
function populateActivityCard(category) {
  const nameEl = document.getElementById("activityName");
  const categoryEl = document.getElementById("activityCategory");
  const timeEl = document.getElementById("activityTime");
  const durationEl = document.getElementById("activityDuration");
  const descEl = document.getElementById("activityDescription");

  if (nameEl) nameEl.textContent = stored?.city ? `${stored.city} Activities` : "Activity Plan";
  if (categoryEl) categoryEl.textContent = `Weather: ${category.charAt(0).toUpperCase() + category.slice(1)}`;
  if (timeEl) timeEl.textContent = "All Day";
  if (durationEl) durationEl.textContent = "Flexible";
  if (descEl) descEl.textContent = `Here are some great activities for ${category} weather in ${stored?.city || "your city"}. Select one to add it to your plan!`;
}

// Main init
async function init() {
  const weatherInfo = populateWeatherDetails();

  let category = "cloudy";
  if (weatherInfo) {
    category = getCategory(weatherInfo.code, weatherInfo.tempLow_c);
  }

  populateActivityCard(category);
  renderPlanList();

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

  // Activity filter dropdown
  const filterSelect = document.getElementById("activityFilter");
  if (filterSelect) {
    filterSelect.addEventListener("change", () => {
      renderSuggestions(activitiesData, category, filterSelect.value);
    });
  }

  document.querySelectorAll(".btn-add-activity").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("suggestionList")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

init();