'use strict';

const UNIT_KEY       = "wf_unit";
const BUNDLE_KEY     = "wf_bundle";
const TODAY_PLAN_KEY = "wf_today_plan";

function normalizeUnit(value) {
  if (value === "metric")   return "celsius";
  if (value === "imperial") return "fahrenheit";
  if (value === "celsius" || value === "fahrenheit") return value;
  return "fahrenheit";
}

export function getUnit() {
  return normalizeUnit(localStorage.getItem(UNIT_KEY));
}

export function setUnit(unit) {
  localStorage.setItem(UNIT_KEY, normalizeUnit(unit));
}

export function saveForecastBundle(bundle) {
  localStorage.setItem(BUNDLE_KEY, JSON.stringify(bundle));
}

export function loadForecastBundle() {
  try {
    const raw = localStorage.getItem(BUNDLE_KEY);
    if (!raw) return null;
    const bundle = JSON.parse(raw);
    if (bundle?.unit) bundle.unit = normalizeUnit(bundle.unit);
    return bundle;
  } catch {
    localStorage.removeItem(BUNDLE_KEY);
    return null;
  }
}

export function clearBundle() {
  localStorage.removeItem(BUNDLE_KEY);
}

export function saveTodayPlan(text) {
  localStorage.setItem(TODAY_PLAN_KEY, text || "");
}

export function loadTodayPlan() {
  return localStorage.getItem(TODAY_PLAN_KEY) || "";
}