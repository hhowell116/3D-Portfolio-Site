/**
 * Wholesale KPI Data — Fetched live from ShipStation via Cloudflare Worker.
 * Replaces the old static wholesale data array.
 * Uses the same fetchKPIMonth/fetchKPIYear functions from data.js.
 */

// This global array is used by fulfillment.js for wholesale dataset
const wholesaleData = [];

/**
 * Load wholesale data for a month into the global wholesaleData array.
 */
async function loadWholesaleMonth(year, month) {
  const data = await fetchKPIMonth(year, month, "wholesale");
  wholesaleData.length = 0;
  wholesaleData.push(...data);
  return data;
}

/**
 * Load wholesale data for a full year.
 */
async function loadWholesaleYear(year) {
  const data = await fetchKPIYear(year, "wholesale");
  wholesaleData.length = 0;
  wholesaleData.push(...data);
  return data;
}
