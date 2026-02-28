// js/storage.js
'use strict';

const UNIT_KEY = "wf_unit";
const BUNDLE_KEY = "wf_bundle";
const TODAY_PLAN_KEY = "wf_today_plan"; // stores Today's plan text

// Normalizes saved unit values to Open-Meteo values
function normalizeUnit(value) {
  if (value === "metric") return "celsius";
  if (value === "imperial") return "fahrenheit";
  if (value === "celsius" || value === "fahrenheit") return value;
  return "fahrenheit";
}

// Reads saved unit or uses default
export function getUnit() {
  return normalizeUnit(localStorage.getItem(UNIT_KEY));
}

// Saves selected unit
export function setUnit(unit) {
  localStorage.setItem(UNIT_KEY, normalizeUnit(unit));
}

// Saves forecast bundle for refresh + details page
export function saveForecastBundle(bundle) {
  localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundle));
}

// Loads saved forecast bundle
export function loadForecastBundle() {
  const raw = localStorage.getItem(BUNDLE_KEY);
  if (!raw) return null;

  const bundle = JSON.parse(raw);
  if (bundle?.unit) bundle.unit = normalizeUnit(bundle.unit);

  return bundle;
}

// Clears old broken stored data (used once when switching APIs)
export function clearBundle() {
  localStorage.removeItem(BUNDLE_KEY);
}

/* =====================================================
   TODAY'S PLAN
   ===================================================== */

// Saves today's plan text
export function saveTodayPlan(text) {
  localStorage.setItem(TODAY_PLAN_KEY, text || "");
}

// Loads today's plan text
export function loadTodayPlan() {
  return localStorage.getItem(TODAY_PLAN_KEY) || "";
}