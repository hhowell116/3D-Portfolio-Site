/**
 * Fulfillment KPI Data — Served from Cloudflare KV (pre-computed).
 * Source: Shopify Admin API (READ-ONLY).
 * No live API calls on page load — data is cached in KV.
 */

const API_BASE = "https://rco-metrics.hayden-howell.workers.dev";

// Global array used by fulfillment.js
const fullData = [];

/**
 * Fetch a full year of KPI data from KV (instant response).
 */
async function fetchKPIYear(year, dataset = "retail") {
  const res = await fetch(`${API_BASE}/kpi/data?year=${year}&dataset=${dataset}`);
  if (!res.ok) throw new Error(`KPI fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Load data into the global fullData array.
 */
async function loadKPIData(year, month, dataset = "retail") {
  const data = await fetchKPIYear(year, dataset);
  fullData.length = 0;
  fullData.push(...data);
  return data;
}

/**
 * Load full year into the global fullData array.
 */
async function loadKPIYear(year, dataset = "retail") {
  return loadKPIData(year, 0, dataset);
}
