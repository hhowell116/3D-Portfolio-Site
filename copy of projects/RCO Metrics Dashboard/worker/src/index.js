/**
 * RCO Metrics — Cloudflare Worker
 * ============================================================
 * ⚠️  READ-ONLY — This worker ONLY makes GET requests to Shopify.
 * ⚠️  No POST, PUT, PATCH, DELETE to Shopify. Ever.
 * ⚠️  The only POST is the OAuth token exchange (required by Shopify).
 * ============================================================
 *
 * Secrets (stored in Cloudflare encrypted secrets):
 *   SHOPIFY_SHOP          — store name (e.g., "rowe-casa")
 *   SHOPIFY_CLIENT_ID     — OAuth client ID (admin, read-only scopes)
 *   SHOPIFY_CLIENT_SECRET — OAuth client secret
 *
 * KV Namespace:
 *   RCO_KPI — stores pre-computed fulfillment KPI data
 */

// ========== TOKEN MANAGEMENT ==========
// Shopify client_credentials tokens expire every 24hrs.
// We cache in memory and refresh 5 minutes early.
let cachedToken = null;
let tokenExpiresAt = 0;
let cachedWholesaleToken = null;
let wholesaleTokenExpiresAt = 0;

const WHOLESALE_SHOP = "wholesale-rowe-casa";

async function getAccessToken(env) {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  // This is the ONLY non-GET request in the entire worker.
  // It's required by Shopify's OAuth flow — there is no GET alternative.
  const res = await fetch(
    `https://${env.SHOPIFY_SHOP}.myshopify.com/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 300) * 1000;
  return cachedToken;
}

async function getWholesaleToken(env) {
  const now = Date.now();
  if (cachedWholesaleToken && now < wholesaleTokenExpiresAt) return cachedWholesaleToken;

  const res = await fetch(
    `https://${WHOLESALE_SHOP}.myshopify.com/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env.SHOPIFY_CLIENT_ID,
        client_secret: env.SHOPIFY_CLIENT_SECRET,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Wholesale token failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedWholesaleToken = data.access_token;
  wholesaleTokenExpiresAt = now + (data.expires_in - 300) * 1000;
  return cachedWholesaleToken;
}

// ========== SHOPIFY READ-ONLY API ==========

/**
 * Makes a READ-ONLY GET request to the Shopify Admin REST API.
 * SAFETY: method is hardcoded to "GET" — cannot be overridden.
 */
async function shopifyGet(env, endpoint, apiVersion = "2024-10") {
  const token = await getAccessToken(env);
  const url = `https://${env.SHOPIFY_SHOP}.myshopify.com/admin/api/${apiVersion}/${endpoint}`;

  const res = await fetch(url, {
    method: "GET", // HARDCODED — READ ONLY
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify GET error: ${res.status} ${await res.text()}`);
  }

  return { json: await res.json(), headers: res.headers };
}

async function shopifyGetWholesale(env, endpoint, apiVersion = "2024-10") {
  const token = await getWholesaleToken(env);
  const url = `https://${WHOLESALE_SHOP}.myshopify.com/admin/api/${apiVersion}/${endpoint}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Wholesale GET error: ${res.status} ${await res.text()}`);
  }

  return { json: await res.json(), headers: res.headers };
}

/**
 * Fetch ALL orders for a date range using cursor-based pagination.
 * Returns simplified order objects with only the fields we need.
 * READ-ONLY: only fetches data, never modifies.
 */
/**
 * Get the UTC offset for America/Chicago on a given date.
 * CST = -06:00, CDT = -05:00. DST starts 2nd Sunday of March, ends 1st Sunday of Nov.
 */
function chicagoOffset(year, month, day) {
  // 2nd Sunday of March
  let marchSecondSun = 8;
  while (new Date(year, 2, marchSecondSun).getDay() !== 0) marchSecondSun++;
  // 1st Sunday of November
  let novFirstSun = 1;
  while (new Date(year, 10, novFirstSun).getDay() !== 0) novFirstSun++;

  const d = new Date(year, month - 1, day);
  const dstStart = new Date(year, 2, marchSecondSun, 2, 0, 0);
  const dstEnd = new Date(year, 10, novFirstSun, 2, 0, 0);

  return (d >= dstStart && d < dstEnd) ? "-05:00" : "-06:00";
}

// Convert UTC Date to Chicago local date components
function chicagoNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  // Determine if DST is active for rough offset
  const year = now.getUTCFullYear();
  const tempOffset = chicagoOffset(year, now.getUTCMonth() + 1, now.getUTCDate());
  const offsetHours = tempOffset === "-05:00" ? -5 : -6;
  const chicago = new Date(utc + offsetHours * 3600000);
  return chicago;
}

/**
 * Fetch ALL orders matching a query string, paginating automatically.
 * Uses cursor-based pagination (same as fetchAllOrders). READ-ONLY.
 */
async function fetchAllOrdersPaginated(env, firstPageQuery, apiFn) {
  const allOrders = [];
  let pageInfo = null;
  let hasNext = true;

  while (hasNext) {
    let endpoint;
    if (pageInfo) {
      endpoint = `orders.json?limit=250&page_info=${pageInfo}`;
    } else {
      endpoint = `orders.json?limit=250&${firstPageQuery}`;
    }

    const { json: data, headers } = await apiFn(env, endpoint);
    for (const o of (data.orders || [])) {
      allOrders.push(o);
    }

    hasNext = false;
    const linkHeader = headers.get("link") || headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
    if (nextMatch) {
      pageInfo = nextMatch[1];
      hasNext = true;
    }
  }

  return allOrders;
}

/**
 * Fetch refunds processed today on orders from OTHER days.
 * Shopify Analytics deducts these from today's "Total sales".
 */
async function fetchCrossDayRefunds(env, minDate, maxDate, dateStr, apiFn) {
  let total = 0;
  for (const status of ["partially_refunded", "refunded"]) {
    const { json: data } = await apiFn(env,
      `orders.json?limit=250&status=any&financial_status=${status}&updated_at_min=${minDate}&updated_at_max=${maxDate}&fields=id,financial_status,refunds,processed_at`
    );
    for (const o of (data.orders || [])) {
      const processedDate = (o.processed_at || "").split("T")[0];
      if (processedDate === dateStr) continue; // skip today's orders
      for (const r of (o.refunds || [])) {
        const refundDate = (r.created_at || "").split("T")[0];
        if (refundDate !== dateStr) continue;
        for (const rli of (r.refund_line_items || [])) {
          total += parseFloat(rli.subtotal || 0);
        }
        for (const adj of (r.order_adjustments || [])) {
          total += Math.abs(parseFloat(adj.amount || 0));
        }
      }
    }
  }
  return total;
}

async function fetchAllOrders(env, startDate, endDate, shop = "retail") {
  const apiFn = shop === "wholesale" ? shopifyGetWholesale : shopifyGet;
  const allOrders = [];
  const limit = 250;
  let pageInfo = null;
  let hasNext = true;

  while (hasNext) {
    let endpoint;
    if (pageInfo) {
      endpoint = `orders.json?limit=${limit}&page_info=${pageInfo}`;
    } else {
      // Use created_at with America/Chicago timezone
      const [sYear, sMonth, sDay] = startDate.split("-").map(Number);
      const [eYear, eMonth, eDay] = endDate.split("-").map(Number);
      const startTz = chicagoOffset(sYear, sMonth, sDay);
      const endTz = chicagoOffset(eYear, eMonth, eDay);

      const params = new URLSearchParams({
        limit: limit.toString(),
        status: "any",
        created_at_min: `${startDate}T00:00:00${startTz}`,
        created_at_max: `${endDate}T23:59:59${endTz}`,
        fields: "id,created_at,fulfillment_status,fulfillments,cancelled_at,financial_status",
      });
      endpoint = `orders.json?${params}`;
    }

    const { json: data, headers } = await apiFn(env, endpoint);

    for (const order of (data.orders || [])) {
      const createdDate = order.created_at ? order.created_at.split("T")[0] : null;
      const isCancelled = !!order.cancelled_at;
      const isRefunded = order.financial_status === "refunded" || order.financial_status === "voided";

      // Find the earliest fulfillment date (when the order was actually shipped)
      let fulfilledDate = null;
      if (order.fulfillments && order.fulfillments.length > 0) {
        const dates = order.fulfillments
          .map(f => f.created_at ? f.created_at.split("T")[0] : null)
          .filter(Boolean)
          .sort();
        if (dates.length > 0) fulfilledDate = dates[0];
      }

      allOrders.push({
        orderDate: createdDate,
        fulfilledDate: fulfilledDate,
        fulfillmentStatus: order.fulfillment_status,
        excluded: isCancelled || isRefunded, // flag for KPI calc
      });
    }

    // Handle pagination via Link header
    hasNext = false;
    const linkHeader = headers.get("link") || headers.get("Link") || "";
    const nextMatch = linkHeader.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
    if (nextMatch) {
      pageInfo = nextMatch[1];
      hasNext = true;
    }
  }

  return allOrders;
}

// ========== KPI COMPUTATION ==========

/**
 * Compute fulfillment KPI data matching Alisha's methodology:
 * - Order count: ALL orders (including cancelled/refunded)
 * - Remaining: only count non-cancelled, non-refunded orders that weren't
 *   fulfilled within 4/7 days
 * - Rate: (total - remaining) / total
 */
function computeKPI(orders, year, month) {
  // Group orders by date
  const byDate = {};
  for (const o of orders) {
    if (!o.orderDate) continue;
    if (!byDate[o.orderDate]) byDate[o.orderDate] = [];
    byDate[o.orderDate].push(o);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const results = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOrders = byDate[dateStr] || [];
    if (dayOrders.length === 0) continue;

    // Total = ALL orders (like Alisha counts)
    const total = dayOrders.length;
    let rem4 = 0;
    let rem7 = 0;
    const orderDateMs = new Date(dateStr + "T00:00:00").getTime();

    for (const o of dayOrders) {
      // Skip cancelled/refunded for remaining calculation
      if (o.excluded) continue;

      if (!o.fulfilledDate) {
        rem4++;
        rem7++;
      } else {
        const fulfilledMs = new Date(o.fulfilledDate + "T00:00:00").getTime();
        const diffDays = Math.floor((fulfilledMs - orderDateMs) / 86400000);
        if (diffDays > 4) rem4++;
        if (diffDays > 7) rem7++;
      }
    }

    const rate4 = ((total - rem4) / total) * 100;
    const rate7 = ((total - rem7) / total) * 100;

    results.push({
      date: `${month + 1}/${d}/${year}`,
      orders: total,
      rem4,
      rem7,
      rate4: Math.round(rate4 * 100) / 100,
      rate7: Math.round(rate7 * 100) / 100,
    });
  }

  return results;
}

// ========== SHIPSTATION READ-ONLY API ==========
// ⚠️  ONLY GET requests. No POST, PUT, PATCH, DELETE. Ever.

const SS_WHOLESALE_STORE_ID = 785713;

/**
 * Makes a READ-ONLY GET request to the ShipStation API.
 * SAFETY: method is hardcoded to "GET" — cannot be overridden.
 * SAFETY: only the /shipments endpoint is used — no order modification endpoints.
 */
async function shipstationGet(env, endpoint) {
  const auth = btoa(env.SHIPSTATION_API_KEY + ":" + env.SHIPSTATION_API_SECRET);

  const res = await fetch(`https://ssapi.shipstation.com${endpoint}`, {
    method: "GET", // HARDCODED — READ ONLY
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "15", 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    const retry = await fetch(`https://ssapi.shipstation.com${endpoint}`, {
      method: "GET", // HARDCODED — READ ONLY
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    if (!retry.ok) throw new Error(`ShipStation GET error: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) throw new Error(`ShipStation GET error: ${res.status}`);
  return res.json();
}

/**
 * Fetch today's shipments from ShipStation and build leaderboard data.
 * READ-ONLY: only calls GET /shipments — never modifies anything.
 */
async function buildLeaderboard(env) {
  const today = new Date().toISOString().split("T")[0];

  // Fetch all of today's shipments (GET only)
  let allShipments = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await shipstationGet(env,
      `/shipments?includeShipmentItems=true&pageSize=500&page=${page}&shipDateStart=${today}&shipDateEnd=${today}`
    );
    totalPages = data.pages || 1;
    allShipments = allShipments.concat(data.shipments || []);
    page++;
  }

  // Fetch employee list (GET only)
  const usersData = await shipstationGet(env, "/users");
  const users = usersData.users || usersData || [];
  const employeeMap = {};
  for (const u of users) {
    const name = u.name || u.userName || "";
    const id = u.userId || u.user_id || u.id || "";
    if (name && id) employeeMap[id] = name;
  }

  // Build stats by employee
  const stats = {};
  const orderMap = {};
  const blocklist = ["Tonia Brantley", "Mark Jackson", "Alisha Wilson", "Lisa Sangalli", "Robert Ballard", "Philip Williams", "Jennifer Stewart"];

  for (const s of allShipments) {
    const orderNumber = s.orderNumber || s.orderId || "";
    const userId = s.userId || s.createdByUserId || "";
    const name = employeeMap[userId] || "Unknown";

    let storeId = 0;
    if (s.advancedOptions && s.advancedOptions.storeId) storeId = Number(s.advancedOptions.storeId);

    const isWholesale = storeId === SS_WHOLESALE_STORE_ID;
    const category = isWholesale ? "wholesale" : "retail";

    if (!stats[name]) stats[name] = { retail: { orders: 0, items: 0 }, wholesale: { orders: 0, items: 0 } };

    const uniqueKey = `${name}-${category}-${orderNumber}`;
    if (!orderMap[uniqueKey]) {
      orderMap[uniqueKey] = true;
      stats[name][category].orders++;
    }

    for (const item of (s.shipmentItems || [])) {
      stats[name][category].items += item.quantity || 0;
    }
  }

  // Build leaderboard arrays
  const leaderboards = { fulltime: [], parttime: [], wholesale: [] };

  for (const [name, catStats] of Object.entries(stats)) {
    if (blocklist.includes(name)) continue;

    if (catStats.wholesale.orders > 0) {
      leaderboards.wholesale.push({
        employee: name,
        products: catStats.wholesale.items,
        orders: catStats.wholesale.orders,
        avg: (catStats.wholesale.items / Math.max(catStats.wholesale.orders, 1)).toFixed(2),
      });
    }

    if (catStats.retail.orders > 0) {
      // Default to fulltime — shift status would need to come from somewhere
      leaderboards.fulltime.push({
        employee: name,
        products: catStats.retail.items,
        orders: catStats.retail.orders,
        avg: (catStats.retail.items / Math.max(catStats.retail.orders, 1)).toFixed(2),
      });
    }
  }

  // Sort each by products shipped (descending)
  for (const key of Object.keys(leaderboards)) {
    leaderboards[key].sort((a, b) => b.products - a.products);
  }

  return {
    date: today,
    totalShipments: allShipments.length,
    leaderboards,
    updatedAt: new Date().toISOString(),
  };
}

// ========== CORS ==========
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

// ========== MAIN HANDLER ==========
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // SAFETY: Only allow GET requests to this worker (except presence/access-log/view-time which need POST)
    const reqPath = new URL(request.url).pathname;
    const postAllowed = ["/presence", "/access-log", "/view-time"];
    if (request.method !== "GET" && !(request.method === "POST" && postAllowed.includes(reqPath))) {
      return new Response(
        JSON.stringify({ error: "Only GET requests allowed (read-only)" }),
        { status: 405, headers: corsHeaders() }
      );
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Cache helper: returns cached response if fresh, otherwise runs fn and caches result
    // This ensures Shopify is only hit once per TTL regardless of how many users have the site open
    const CACHE_TTL = 600; // 10 minutes in seconds
    async function cachedResponse(cacheKey, ttl, fn) {
      const cached = await env.RCO_KPI.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed._cachedAt && (Date.now() - parsed._cachedAt) < ttl * 1000) {
            return new Response(JSON.stringify(parsed.data), { headers: corsHeaders() });
          }
        } catch(e) {}
      }
      const data = await fn();
      await env.RCO_KPI.put(cacheKey, JSON.stringify({ data, _cachedAt: Date.now() }));
      return new Response(JSON.stringify(data), { headers: corsHeaders() });
    }

    try {
      // ==========================================================
      //  KPI DATA — /kpi/data (served from KV cache)
      //  Params: year, dataset (retail|wholesale|total)
      // ==========================================================
      if (path === "/kpi/data") {
        const year = url.searchParams.get("year") || new Date().getFullYear().toString();
        const dataset = url.searchParams.get("dataset") || "retail";

        // "total" combines retail + wholesale on the fly
        if (dataset === "total") {
          const [retailRaw, wholesaleRaw] = await Promise.all([
            env.RCO_KPI.get(`kpi-retail-${year}`),
            env.RCO_KPI.get(`kpi-wholesale-${year}`),
          ]);
          const retail = retailRaw ? JSON.parse(retailRaw) : [];
          const wholesale = wholesaleRaw ? JSON.parse(wholesaleRaw) : [];

          // Merge by date
          const byDate = {};
          for (const d of retail) {
            byDate[d.date] = { ...d };
          }
          for (const d of wholesale) {
            if (byDate[d.date]) {
              byDate[d.date].orders += d.orders;
              byDate[d.date].rem4 += d.rem4;
              byDate[d.date].rem7 += d.rem7;
            } else {
              byDate[d.date] = { ...d };
            }
          }

          // Recalculate rates
          const combined = Object.values(byDate).map(d => ({
            ...d,
            rate4: d.orders > 0 ? Math.round(((d.orders - d.rem4) / d.orders) * 10000) / 100 : 0,
            rate7: d.orders > 0 ? Math.round(((d.orders - d.rem7) / d.orders) * 10000) / 100 : 0,
          }));

          combined.sort((a, b) => {
            const pa = a.date.split("/"), pb = b.date.split("/");
            return new Date(+pa[2], +pa[0]-1, +pa[1]) - new Date(+pb[2], +pb[0]-1, +pb[1]);
          });

          return new Response(JSON.stringify(combined), { headers: corsHeaders() });
        }

        const key = `kpi-${dataset}-${year}`;
        const cached = await env.RCO_KPI.get(key);
        if (cached) {
          return new Response(cached, { headers: corsHeaders() });
        }
        return new Response(JSON.stringify([]), { headers: corsHeaders() });
      }

      // ==========================================================
      //  KPI REFRESH — /kpi/refresh (fetches from Shopify, stores in KV)
      //  Params: year, month, dataset, key (auth)
      //  READ-ONLY: only GETs orders from Shopify, writes to our own KV
      // ==========================================================
      if (path === "/kpi/refresh") {
        const year = parseInt(url.searchParams.get("year"));
        const month = parseInt(url.searchParams.get("month"));
        const dataset = url.searchParams.get("dataset") || "retail";
        const secret = url.searchParams.get("key");

        // Auth check
        if (secret !== env.SHOPIFY_CLIENT_ID) {
          return new Response(
            JSON.stringify({ error: "unauthorized" }),
            { status: 403, headers: corsHeaders() }
          );
        }

        if (isNaN(year) || isNaN(month)) {
          return new Response(
            JSON.stringify({ error: "year and month required" }),
            { status: 400, headers: corsHeaders() }
          );
        }

        const pad = (n) => String(n).padStart(2, "0");
        const mm = pad(month + 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDate = `${year}-${mm}-01`;
        const endDate = `${year}-${mm}-${pad(daysInMonth)}`;

        // READ-ONLY: fetch orders from Shopify (GET only)
        const allOrders = await fetchAllOrders(env, startDate, endDate, dataset);
        const monthData = computeKPI(allOrders, year, month);

        // Store in our own KV (not Shopify — this is our cache)
        const yearKey = `kpi-${dataset}-${year}`;
        let yearData = [];
        const existing = await env.RCO_KPI.get(yearKey);
        if (existing) {
          yearData = JSON.parse(existing);
        }

        // Remove old data for this month, add new
        yearData = yearData.filter(d => {
          const parts = d.date.split("/");
          return parseInt(parts[0]) !== (month + 1);
        });
        yearData = yearData.concat(monthData);

        // Sort by date
        yearData.sort((a, b) => {
          const pa = a.date.split("/");
          const pb = b.date.split("/");
          return new Date(+pa[2], +pa[0] - 1, +pa[1]) - new Date(+pb[2], +pb[0] - 1, +pb[1]);
        });

        await env.RCO_KPI.put(yearKey, JSON.stringify(yearData));

        return new Response(JSON.stringify({
          status: "ok",
          dataset, year, month,
          days: monthData.length,
          orders: monthData.reduce((s, d) => s + d.orders, 0),
        }), { headers: corsHeaders() });
      }

      // ==========================================================
      //  DAILY METRICS — /daily-metrics (lightweight Shopify counts)
      //  Uses count endpoints + single page of orders for speed
      //  READ-ONLY: only GET requests
      // ==========================================================
      if (path === "/daily-metrics") {
        const now = chicagoNow();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();
        const tz = chicagoOffset(year, month + 1, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const minDate = `${dateStr}T00:00:00${tz}`;
        const maxDate = `${dateStr}T23:59:59${tz}`;

        return cachedResponse(`cache:daily-metrics:${dateStr}`, CACHE_TTL, async () => {
          // Count endpoints (fast, accurate)
          const [rCountOpen, rCountClosed, rFulfilled, wCountOpen, wCountClosed, wFulfilled] = await Promise.all([
            shopifyGet(env, `orders/count.json?status=open&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
            shopifyGet(env, `orders/count.json?status=closed&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
            shopifyGet(env, `orders/count.json?status=any&fulfillment_status=shipped&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
            shopifyGetWholesale(env, `orders/count.json?status=open&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
            shopifyGetWholesale(env, `orders/count.json?status=closed&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
            shopifyGetWholesale(env, `orders/count.json?status=any&fulfillment_status=shipped&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
          ]);

          // Fetch ALL orders (paginated) for exact revenue + cross-day refunds
          const [rAllOrders, wAllOrders, rCrossDayRefunds, wCrossDayRefunds] = await Promise.all([
            fetchAllOrdersPaginated(env, `status=any&processed_at_min=${minDate}&processed_at_max=${maxDate}&fields=id,total_price,line_items,financial_status`, shopifyGet),
            fetchAllOrdersPaginated(env, `status=any&processed_at_min=${minDate}&processed_at_max=${maxDate}&fields=id,total_price,line_items,financial_status`, shopifyGetWholesale),
            fetchCrossDayRefunds(env, minDate, maxDate, dateStr, shopifyGet),
            fetchCrossDayRefunds(env, minDate, maxDate, dateStr, shopifyGetWholesale),
          ]);

          function computeMetrics(countOpenRes, countClosedRes, fulfilledRes, allOrders, crossDayRefunds) {
            const total = (countOpenRes.json.count || 0) + (countClosedRes.json.count || 0);
            const ff = fulfilledRes.json.count || 0;
            let sales = 0, unitsSold = 0, giftCardSales = 0, giftCardOnlyOrders = 0;
            const productCounts = {};
            const orders = allOrders.filter(o => o.financial_status !== 'voided' && o.financial_status !== 'refunded');
            for (const o of orders) {
              sales += parseFloat(o.total_price || 0);
              let orderGiftCardTotal = 0;
              let orderHasNonGiftCard = false;
              for (const li of (o.line_items || [])) {
                // Exclude gift card line items from revenue (Shopify Analytics excludes them)
                if (li.gift_card === true) {
                  orderGiftCardTotal += parseFloat(li.price || 0) * (li.quantity || 1);
                  continue;
                }
                orderHasNonGiftCard = true;
                const title = li.title || "Unknown";
                const tl = title.toLowerCase();
                if (tl.includes("shipping protection") || tl.includes("navidium") || tl.includes("10% off") || tl.includes("new customer card") || tl.includes("discount card") || tl.includes("gift card") || tl.includes("skip the line") || tl.includes("heat sensitive info card")) continue;
                unitsSold += li.quantity || 0;
                productCounts[title] = (productCounts[title] || 0) + (li.quantity || 0);
              }
              giftCardSales += orderGiftCardTotal;
              if (!orderHasNonGiftCard && orderGiftCardTotal > 0) giftCardOnlyOrders++;
            }
            // Subtract gift card revenue and cross-day refunds (matches Shopify Analytics)
            sales = sales - giftCardSales - crossDayRefunds;
            const adjustedTotal = total - giftCardOnlyOrders;
            const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, qty]) => ({ name, qty }));
            const aov = adjustedTotal > 0 ? sales / adjustedTotal : 0;
            return { sales: Math.round(sales * 100) / 100, totalOrders: adjustedTotal, unfulfilled: adjustedTotal - ff, fulfilled: ff, aov: Math.round(aov * 100) / 100, unitsSold, topProducts };
          }

          return { date: dateStr, retail: computeMetrics(rCountOpen, rCountClosed, rFulfilled, rAllOrders, rCrossDayRefunds), wholesale: computeMetrics(wCountOpen, wCountClosed, wFulfilled, wAllOrders, wCrossDayRefunds), updatedAt: now.toISOString() };
        });
      }

      // ==========================================================
      //  SALES SUMMARY — /sales-summary (lightweight Shopify counts)
      //  READ-ONLY: only GET requests
      // ==========================================================
      if (path === "/sales-summary") {
        const now = chicagoNow();
        const year = now.getFullYear();
        const month = now.getMonth();
        const day = now.getDate();
        const tz = chicagoOffset(year, month + 1, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const yearStart = `${year}-01-01`;
        const minDate = `${dateStr}T00:00:00${tz}`;
        const maxDate = `${dateStr}T23:59:59${tz}`;
        const tzMonth = chicagoOffset(year, month + 1, 1);
        const tzYear = chicagoOffset(year, 1, 1);

        return cachedResponse(`cache:sales-summary:${dateStr}`, CACHE_TTL, async () => {
        // Retail + Wholesale counts in parallel
        // Use processed_at (matches Shopify reports) instead of created_at
        // Exclude cancelled orders (open + closed, not any)
        const [rTodayOpen, rTodayClosed, rMtdOpen, rMtdClosed, rYtdOpen, rYtdClosed,
               wTodayOpen, wTodayClosed, wMtdOpen, wMtdClosed, wYtdOpen, wYtdClosed] = await Promise.all([
          shopifyGet(env, `orders/count.json?status=open&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
          shopifyGet(env, `orders/count.json?status=closed&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
          shopifyGet(env, `orders/count.json?status=open&processed_at_min=${monthStart}T00:00:00${tzMonth}&processed_at_max=${maxDate}`),
          shopifyGet(env, `orders/count.json?status=closed&processed_at_min=${monthStart}T00:00:00${tzMonth}&processed_at_max=${maxDate}`),
          shopifyGet(env, `orders/count.json?status=open&processed_at_min=${yearStart}T00:00:00${tzYear}&processed_at_max=${maxDate}`),
          shopifyGet(env, `orders/count.json?status=closed&processed_at_min=${yearStart}T00:00:00${tzYear}&processed_at_max=${maxDate}`),
          shopifyGetWholesale(env, `orders/count.json?status=open&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
          shopifyGetWholesale(env, `orders/count.json?status=closed&processed_at_min=${minDate}&processed_at_max=${maxDate}`),
          shopifyGetWholesale(env, `orders/count.json?status=open&processed_at_min=${monthStart}T00:00:00${tzMonth}&processed_at_max=${maxDate}`),
          shopifyGetWholesale(env, `orders/count.json?status=closed&processed_at_min=${monthStart}T00:00:00${tzMonth}&processed_at_max=${maxDate}`),
          shopifyGetWholesale(env, `orders/count.json?status=open&processed_at_min=${yearStart}T00:00:00${tzYear}&processed_at_max=${maxDate}`),
          shopifyGetWholesale(env, `orders/count.json?status=closed&processed_at_min=${yearStart}T00:00:00${tzYear}&processed_at_max=${maxDate}`),
        ]);

        // Fetch ALL today's orders (paginated) for exact revenue + cross-day refunds
        const [rAllOrders, wAllOrders, rCrossDayRefunds, wCrossDayRefunds] = await Promise.all([
          fetchAllOrdersPaginated(env, `status=any&processed_at_min=${minDate}&processed_at_max=${maxDate}&fields=id,total_price,line_items,financial_status`, shopifyGet),
          fetchAllOrdersPaginated(env, `status=any&processed_at_min=${minDate}&processed_at_max=${maxDate}&fields=id,total_price,line_items,financial_status`, shopifyGetWholesale),
          fetchCrossDayRefunds(env, minDate, maxDate, dateStr, shopifyGet),
          fetchCrossDayRefunds(env, minDate, maxDate, dateStr, shopifyGetWholesale),
        ]);

        function computeSales(todayOpenRes, todayClosedRes, mtdOpenRes, mtdClosedRes, ytdOpenRes, ytdClosedRes, allOrders, crossDayRefunds) {
          const todayOrders = (todayOpenRes.json.count || 0) + (todayClosedRes.json.count || 0);
          const mtdOrders = (mtdOpenRes.json.count || 0) + (mtdClosedRes.json.count || 0);
          const ytdOrders = (ytdOpenRes.json.count || 0) + (ytdClosedRes.json.count || 0);
          // Exact revenue from all today's orders, minus gift cards and cross-day refunds
          const filtered = allOrders.filter(o => o.financial_status !== 'voided' && o.financial_status !== 'refunded');
          let todaySales = 0, giftCardSales = 0;
          for (const o of filtered) {
            todaySales += parseFloat(o.total_price || 0);
            for (const li of (o.line_items || [])) {
              if (li.gift_card === true) {
                giftCardSales += parseFloat(li.price || 0) * (li.quantity || 1);
              }
            }
          }
          todaySales = todaySales - giftCardSales - crossDayRefunds;
          const aov = filtered.length > 0 ? todaySales / filtered.length : 0;
          return {
            todaySales: Math.round(todaySales * 100) / 100,
            todayOrders,
            mtdSales: Math.round(aov * mtdOrders * 100) / 100,
            mtdOrders,
            ytdSales: Math.round(aov * ytdOrders * 100) / 100,
            ytdOrders,
          };
        }

        return {
          retail: computeSales(rTodayOpen, rTodayClosed, rMtdOpen, rMtdClosed, rYtdOpen, rYtdClosed, rAllOrders, rCrossDayRefunds),
          wholesale: computeSales(wTodayOpen, wTodayClosed, wMtdOpen, wMtdClosed, wYtdOpen, wYtdClosed, wAllOrders, wCrossDayRefunds),
          updatedAt: now.toISOString(),
        };
        });
      }

      // ==========================================================
      //  TOP PRODUCTS — /top-products (from KV cache)
      //  Cached by backfill script — too heavy to compute live
      // ==========================================================
      if (path === "/top-products") {
        const cached = await env.RCO_KPI.get("top-products");
        if (cached) {
          return new Response(cached, { headers: corsHeaders() });
        }
        return new Response(JSON.stringify({ last7Days: [], last30Days: [] }), { headers: corsHeaders() });
      }

      // ==========================================================
      //  ALL-TIME STATS — /all-time (total orders + estimated revenue)
      // ==========================================================
      if (path === "/all-time") {
        return cachedResponse("cache:all-time", CACHE_TTL, async () => {
        const [rCountOpen, rCountClosed, wCountOpen, wCountClosed, rSample, wSample] = await Promise.all([
          shopifyGet(env, `orders/count.json?status=open`),
          shopifyGet(env, `orders/count.json?status=closed`),
          shopifyGetWholesale(env, `orders/count.json?status=open`),
          shopifyGetWholesale(env, `orders/count.json?status=closed`),
          shopifyGet(env, `orders.json?limit=50&status=any&fields=id,total_price,line_items,financial_status`),
          shopifyGetWholesale(env, `orders.json?limit=50&status=any&fields=id,total_price,line_items,financial_status`),
        ]);

        function computeAllTime(countOpenRes, countClosedRes, sampleRes) {
          const totalOrders = (countOpenRes.json.count || 0) + (countClosedRes.json.count || 0);
          const orders = (sampleRes.json.orders || []).filter(o => o.financial_status !== 'voided' && o.financial_status !== 'refunded');
          let sampleSales = 0, sampleUnits = 0;
          for (const o of orders) {
            sampleSales += parseFloat(o.total_price || 0);
            for (const li of (o.line_items || [])) {
              const tl = (li.title || "").toLowerCase();
              if (tl.includes("shipping protection") || tl.includes("navidium") || tl.includes("10% off") || tl.includes("new customer card") || tl.includes("discount card") || tl.includes("gift card") || tl.includes("skip the line") || tl.includes("heat sensitive info card")) continue;
              sampleUnits += li.quantity || 0;
            }
          }
          const sampleSize = orders.length;
          const aov = sampleSize > 0 ? sampleSales / sampleSize : 0;
          const upo = sampleSize > 0 ? sampleUnits / sampleSize : 0;
          return {
            totalOrders,
            estRevenue: Math.round(aov * totalOrders * 100) / 100,
            estUnits: Math.round(upo * totalOrders),
          };
        }

        return {
          retail: computeAllTime(rCountOpen, rCountClosed, rSample),
          wholesale: computeAllTime(wCountOpen, wCountClosed, wSample),
          updatedAt: new Date().toISOString(),
        };
        });
      }

      // ==========================================================
      //  UNFULFILLED ORDERS — /unfulfilled (lightweight from Shopify)
      //  Uses count + single page for speed
      //  READ-ONLY: only GET requests
      // ==========================================================
      if (path === "/unfulfilled") {
        return cachedResponse("cache:unfulfilled", CACHE_TTL, async () => {
        const now = chicagoNow();
        const tz = chicagoOffset(now.getFullYear(), now.getMonth()+1, now.getDate());
        const endStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

        // Retail + Wholesale counts in parallel
        const [rUf, rPartial, wUf, wPartial] = await Promise.all([
          shopifyGet(env, `orders/count.json?status=open&fulfillment_status=unfulfilled`),
          shopifyGet(env, `orders/count.json?status=open&fulfillment_status=partial`),
          shopifyGetWholesale(env, `orders/count.json?status=open&fulfillment_status=unfulfilled`),
          shopifyGetWholesale(env, `orders/count.json?status=open&fulfillment_status=partial`),
        ]);

        // Fetch ALL unfulfilled orders (paginated) for exact unit counts and date breakdown
        const [rAllUf, wAllUf] = await Promise.all([
          fetchAllOrdersPaginated(env, `status=open&fulfillment_status=unfulfilled&fields=id,created_at,line_items`, shopifyGet),
          fetchAllOrdersPaginated(env, `status=open&fulfillment_status=unfulfilled&fields=id,created_at,line_items`, shopifyGetWholesale),
        ]);

        function computeUnfulfilled(ufRes, partialRes, allOrders) {
          const totalUF = (ufRes.json.count || 0) + (partialRes.json.count || 0);
          const byDate = {};
          let totalUnits = 0;
          for (const o of allOrders) {
            if (!o.created_at) continue;
            const date = o.created_at.split("T")[0];
            if (!byDate[date]) byDate[date] = { unfulfilled: 0, partial: 0, units: 0 };
            byDate[date].unfulfilled++;
            for (const li of (o.line_items || [])) {
              totalUnits += li.quantity || 0;
              byDate[date].units += li.quantity || 0;
            }
          }
          const orderCount = allOrders.length;
          const avgSize = orderCount > 0 ? totalUnits / orderCount : 0;
          const dateRows = Object.entries(byDate)
            .sort((a,b) => a[0].localeCompare(b[0]))
            .map(([date, d]) => ({
              date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              unfulfilled: d.unfulfilled, partial: d.partial, units: d.units,
            }));
          return { byDate: dateRows, totalUnfulfilled: totalUF, avgOrderSize: Math.round(avgSize * 10) / 10, totalUnits };
        }

        return {
          retail: computeUnfulfilled(rUf, rPartial, rAllUf),
          wholesale: computeUnfulfilled(wUf, wPartial, wAllUf),
          updatedAt: now.toISOString(),
        };
        });
      }

      // ==========================================================
      //  FULFILLMENT DASHBOARD — /fulfillment-dashboard
      //  Today fulfilled, yesterday fulfilled, unfulfilled for both stores
      //  READ-ONLY: only GET requests
      // ==========================================================
      if (path === "/fulfillment-dashboard") {
        return cachedResponse("cache:fulfillment-dashboard", CACHE_TTL, async () => {
          const now = chicagoNow();
          const year = now.getFullYear();
          const month = now.getMonth();
          const day = now.getDate();
          const tz = chicagoOffset(year, month + 1, day);
          const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const todayMin = `${todayStr}T00:00:00${tz}`;
          const todayMax = `${todayStr}T23:59:59${tz}`;

          // Yesterday
          const yest = new Date(year, month, day - 1);
          const yYear = yest.getFullYear(), yMonth = yest.getMonth(), yDay = yest.getDate();
          const yTz = chicagoOffset(yYear, yMonth + 1, yDay);
          const yStr = `${yYear}-${String(yMonth + 1).padStart(2, "0")}-${String(yDay).padStart(2, "0")}`;
          const yMin = `${yStr}T00:00:00${yTz}`;
          const yMax = `${yStr}T23:59:59${yTz}`;

          const [rUnf, rPartial, rTodayShipped, rYestShipped, rTodayTotal, rYestTotal,
                 wUnf, wPartial, wTodayShipped, wYestShipped, wTodayTotal, wYestTotal] = await Promise.all([
            // Retail
            shopifyGet(env, `orders/count.json?status=open&fulfillment_status=unfulfilled`),
            shopifyGet(env, `orders/count.json?status=open&fulfillment_status=partial`),
            shopifyGet(env, `orders/count.json?status=any&fulfillment_status=shipped&processed_at_min=${todayMin}&processed_at_max=${todayMax}`),
            shopifyGet(env, `orders/count.json?status=any&fulfillment_status=shipped&processed_at_min=${yMin}&processed_at_max=${yMax}`),
            shopifyGet(env, `orders/count.json?status=open&processed_at_min=${todayMin}&processed_at_max=${todayMax}`),
            shopifyGet(env, `orders/count.json?status=open&processed_at_min=${yMin}&processed_at_max=${yMax}`),
            // Wholesale
            shopifyGetWholesale(env, `orders/count.json?status=open&fulfillment_status=unfulfilled`),
            shopifyGetWholesale(env, `orders/count.json?status=open&fulfillment_status=partial`),
            shopifyGetWholesale(env, `orders/count.json?status=any&fulfillment_status=shipped&processed_at_min=${todayMin}&processed_at_max=${todayMax}`),
            shopifyGetWholesale(env, `orders/count.json?status=any&fulfillment_status=shipped&processed_at_min=${yMin}&processed_at_max=${yMax}`),
            shopifyGetWholesale(env, `orders/count.json?status=open&processed_at_min=${todayMin}&processed_at_max=${todayMax}`),
            shopifyGetWholesale(env, `orders/count.json?status=open&processed_at_min=${yMin}&processed_at_max=${yMax}`),
          ]);

          function buildStore(unf, partial, todayShipped, yestShipped, todayTotal, yestTotal) {
            const unfulfilled = (unf.json.count || 0) + (partial.json.count || 0);
            const todayFulfilled = todayShipped.json.count || 0;
            const yesterdayFulfilled = yestShipped.json.count || 0;
            const todayOrders = todayTotal.json.count || 0;
            const yesterdayOrders = yestTotal.json.count || 0;
            return { unfulfilled, todayFulfilled, yesterdayFulfilled, todayOrders, yesterdayOrders };
          }

          return {
            retail: buildStore(rUnf, rPartial, rTodayShipped, rYestShipped, rTodayTotal, rYestTotal),
            wholesale: buildStore(wUnf, wPartial, wTodayShipped, wYestShipped, wTodayTotal, wYestTotal),
            updatedAt: now.toISOString(),
          };
        });
      }

      // ==========================================================
      //  SKIP THE LINE — /skip-the-line (lightweight from Shopify)
      //  Fetches open orders and filters for dyn-skip-line tag
      //  READ-ONLY: only GET requests
      // ==========================================================
      if (path === "/skip-the-line") {
        return cachedResponse("cache:skip-the-line", CACHE_TTL, async () => {
          const now = chicagoNow();
          const { json: ufData } = await shopifyGet(env,
            `orders.json?limit=250&status=open&fulfillment_status=unfulfilled&fields=id,name,created_at,tags,fulfillment_status,financial_status`
          );

          const orders = [];
          let newUnfulfilled = 0, partial = 0;
          const byDate = {};

          for (const o of (ufData.orders || [])) {
            const tags = (o.tags || "").toLowerCase();
            if (!tags.includes("dyn-skip-line")) continue;
            const ff = o.fulfillment_status;
            if (ff === "partial") partial++;
            else newUnfulfilled++;
            const date = o.created_at ? o.created_at.split("T")[0] : "unknown";
            byDate[date] = (byDate[date] || 0) + 1;
            orders.push({
              name: o.name,
              date: new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              fulfillment: ff === "partial" ? "Partially Fulfilled" : "Unfulfilled",
              payment: o.financial_status || "unknown",
            });
          }

          const dateRows = Object.entries(byDate)
            .sort((a,b) => a[0].localeCompare(b[0]))
            .map(([date, count]) => ({
              date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              count,
            }));

          return { totalOpen: orders.length, newUnfulfilled, partial, fulfilledToday: 0, orders, byDate: dateRows, updatedAt: now.toISOString() };
        });
      }

      // ==========================================================
      //  SHIPPING LEADERBOARD — /leaderboard (live from ShipStation)
      //  READ-ONLY: Only GET /shipments and GET /users from ShipStation
      // ==========================================================
      if (path === "/leaderboard") {
        const data = await buildLeaderboard(env);
        return new Response(JSON.stringify(data), { headers: corsHeaders() });
      }

      // ==========================================================
      //  ORDERS OVERVIEW — /orders/overview (from KV)
      //  Returns monthly summaries for the Orders Overview dashboard
      // ==========================================================
      if (path === "/orders/overview") {
        const cached = await env.RCO_KPI.get("orders-overview");
        if (cached) {
          return new Response(cached, { headers: corsHeaders() });
        }
        return new Response(JSON.stringify([]), { headers: corsHeaders() });
      }

      // ==========================================================
      //  INTERNATIONAL DATA — /intl/data (from KV)
      //  Params: year (or "all")
      // ==========================================================
      if (path === "/intl/data") {
        const yearParam = url.searchParams.get("year") || "all";

        if (yearParam === "all") {
          const merged = { countries: {}, usStates: {} };
          for (const y of [2022, 2023, 2024, 2025, 2026]) {
            const cached = await env.RCO_KPI.get(`intl-${y}`);
            if (cached) {
              const d = JSON.parse(cached);
              for (const [k, v] of Object.entries(d.countries || {})) merged.countries[k] = (merged.countries[k] || 0) + v;
              for (const [k, v] of Object.entries(d.usStates || {})) merged.usStates[k] = (merged.usStates[k] || 0) + v;
            }
          }
          return new Response(JSON.stringify(merged), { headers: corsHeaders() });
        }

        const cached = await env.RCO_KPI.get(`intl-${yearParam}`);
        if (cached) return new Response(cached, { headers: corsHeaders() });
        return new Response(JSON.stringify({ countries: {}, usStates: {} }), { headers: corsHeaders() });
      }

      // ==========================================================
      //  SHOPIFY PASSTHROUGH — READ-ONLY ENDPOINTS
      //  These proxy GET requests to Shopify for live data
      // ==========================================================

      if (path === "/orders") {
        const limit = url.searchParams.get("limit") || "50";
        const status = url.searchParams.get("status") || "any";
        const params = new URLSearchParams({ limit, status });
        if (url.searchParams.get("created_at_min")) params.set("created_at_min", url.searchParams.get("created_at_min"));
        if (url.searchParams.get("created_at_max")) params.set("created_at_max", url.searchParams.get("created_at_max"));
        if (url.searchParams.get("fields")) params.set("fields", url.searchParams.get("fields"));
        const { json: data } = await shopifyGet(env, `orders.json?${params}`);
        return new Response(JSON.stringify(data), { headers: corsHeaders() });
      }

      if (path === "/orders/count") {
        const status = url.searchParams.get("status") || "any";
        const params = new URLSearchParams({ status });
        // Forward all supported Shopify count filters
        for (const key of ["created_at_min","created_at_max","processed_at_min","processed_at_max","updated_at_min","updated_at_max","financial_status","fulfillment_status"]) {
          if (url.searchParams.get(key)) params.set(key, url.searchParams.get(key));
        }
        const { json: data } = await shopifyGet(env, `orders/count.json?${params}`);
        return new Response(JSON.stringify(data), { headers: corsHeaders() });
      }

      if (path === "/products") {
        const limit = url.searchParams.get("limit") || "50";
        const params = new URLSearchParams({ limit });
        const { json: data } = await shopifyGet(env, `products.json?${params}`);
        return new Response(JSON.stringify(data), { headers: corsHeaders() });
      }

      // ==========================================================
      //  HEALTH CHECK
      // ==========================================================
      // ==========================================================
      //  PRESENCE — /presence (shared user presence via KV)
      //  POST to register heartbeat, GET to list active users
      // ==========================================================
      if (path === "/presence") {
        if (request.method === "POST") {
          const body = await request.json();
          const email = body.email;
          const role = body.role || "Employee";
          if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: corsHeaders() });
          const key = `presence-${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
          await env.RCO_KPI.put(key, JSON.stringify({ email, role, since: body.since || new Date().toISOString(), lastSeen: new Date().toISOString() }), { expirationTtl: 300 });
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders() });
        }
        // GET — list all active presence keys
        const list = await env.RCO_KPI.list({ prefix: "presence-" });
        const users = [];
        for (const key of list.keys) {
          const val = await env.RCO_KPI.get(key.name);
          if (val) users.push(JSON.parse(val));
        }
        return new Response(JSON.stringify(users), { headers: corsHeaders() });
      }

      // ==========================================================
      //  VIEW TIME — /view-time (dashboard usage analytics)
      //  POST to log time on a tab, GET to retrieve aggregated data
      // ==========================================================
      if (path === "/view-time") {
        const KV_KEY = "dashboard-view-time";
        if (request.method === "POST") {
          const body = await request.json();
          const { email, tab, seconds } = body;
          if (!email || !tab || !seconds) return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: corsHeaders() });
          const raw = await env.RCO_KPI.get(KV_KEY);
          const data = raw ? JSON.parse(raw) : { byTab: {}, byUser: {}, byUserTab: {} };
          // Aggregate by tab
          data.byTab[tab] = (data.byTab[tab] || 0) + seconds;
          // Aggregate by user
          data.byUser[email] = (data.byUser[email] || 0) + seconds;
          // Aggregate by user+tab
          const utKey = `${email}|${tab}`;
          data.byUserTab[utKey] = (data.byUserTab[utKey] || 0) + seconds;
          await env.RCO_KPI.put(KV_KEY, JSON.stringify(data));
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders() });
        }
        const raw = await env.RCO_KPI.get(KV_KEY);
        return new Response(raw || JSON.stringify({ byTab: {}, byUser: {}, byUserTab: {} }), { headers: corsHeaders() });
      }

      // ==========================================================
      //  ACCESS LOG — /access-log (shared recent site access via KV)
      //  POST to log a visit, GET to list recent visits
      // ==========================================================
      if (path === "/access-log") {
        const KV_KEY = "site-access-log";
        if (request.method === "POST") {
          const body = await request.json();
          const email = body.email;
          const role = body.role || "Employee";
          if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: corsHeaders() });
          const raw = await env.RCO_KPI.get(KV_KEY);
          const log = raw ? JSON.parse(raw) : [];
          const idx = log.findIndex(e => e.email === email);
          if (idx >= 0) log.splice(idx, 1);
          log.unshift({ email, role, time: new Date().toISOString() });
          if (log.length > 50) log.length = 50;
          await env.RCO_KPI.put(KV_KEY, JSON.stringify(log));
          return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders() });
        }
        const raw = await env.RCO_KPI.get(KV_KEY);
        return new Response(raw || "[]", { headers: corsHeaders() });
      }

      if (path === "/" || path === "/health") {
        return new Response(JSON.stringify({
          status: "ok",
          mode: "READ-ONLY",
          source: "Shopify Admin API (GET only)",
          endpoints: [
            "/kpi/data?year=2026&dataset=retail",
            "/kpi/refresh (auth required)",
            "/orders",
            "/orders/count",
            "/products",
          ],
        }), { headers: corsHeaders() });
      }

      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: corsHeaders() }
      );

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: corsHeaders() }
      );
    }
  },

  // Cron triggers:
  // - Every 6 hours: refresh KPI data for current month (retail + wholesale)
  // - Daily at 2 AM CT (7 AM UTC): refresh top products, orders overview, international
  async scheduled(event, env, ctx) {
    const cronHour = new Date(event.scheduledTime).getUTCHours();

    // Nightly backfill runs at 7 AM UTC (2 AM CT)
    if (cronHour === 7) {
      await this.nightlyBackfill(env);
    }

    // KPI refresh runs every 6 hours
    const now = chicagoNow();
    const year = now.getFullYear();
    const month = now.getMonth();

    const pad = (n) => String(n).padStart(2, "0");
    const mm = pad(month + 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDate = `${year}-${mm}-01`;
    const endDate = `${year}-${mm}-${pad(daysInMonth)}`;

    // Refresh both retail and wholesale
    for (const dataset of ["retail", "wholesale"]) {
      const allOrders = await fetchAllOrders(env, startDate, endDate, dataset);
      const monthData = computeKPI(allOrders, year, month);

      const yearKey = `kpi-${dataset}-${year}`;
      let yearData = [];
      const existing = await env.RCO_KPI.get(yearKey);
      if (existing) yearData = JSON.parse(existing);

      yearData = yearData.filter(d => parseInt(d.date.split("/")[0]) !== (month + 1));
      yearData = yearData.concat(monthData);
      yearData.sort((a, b) => {
        const pa = a.date.split("/"), pb = b.date.split("/");
        return new Date(+pa[2], +pa[0] - 1, +pa[1]) - new Date(+pb[2], +pb[0] - 1, +pb[1]);
      });

      await env.RCO_KPI.put(yearKey, JSON.stringify(yearData));
    }
  },

  // Nightly backfill — runs at 2 AM CT for top products, orders overview (current month), and international (current year)
  async nightlyBackfill(env) {
    const now = chicagoNow();
    const year = now.getFullYear();
    const month = now.getMonth();
    const pad = (n) => String(n).padStart(2, "0");
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mm = pad(month + 1);

    // --- TOP PRODUCTS (last 7 + 30 days) ---
    const BLACKLIST = ["shipping protection", "navidium", "10% off", "new customer card", "discount card", "gift card", "skip the line", "heat sensitive info card"];
    function isBlacklisted(title) { const tl = title.toLowerCase(); return BLACKLIST.some(b => tl.includes(b)); }

    async function fetchRecentProducts(days) {
      const counts = {};
      const end = chicagoNow();
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      const tz = chicagoOffset(start.getFullYear(), start.getMonth() + 1, start.getDate());
      const startStr = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}T00:00:00${tz}`;
      const endTz = chicagoOffset(end.getFullYear(), end.getMonth() + 1, end.getDate());
      const endStr = `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}T23:59:59${endTz}`;

      for (const apiFn of [shopifyGet, shopifyGetWholesale]) {
        let url = `orders.json?limit=250&status=any&created_at_min=${startStr}&created_at_max=${endStr}&fields=id,line_items`;
        let hasNext = true;
        while (hasNext) {
          const { json: data, headers } = await apiFn(env, url);
          for (const o of (data.orders || [])) {
            for (const li of (o.line_items || [])) {
              if (isBlacklisted(li.title || "")) continue;
              counts[li.title] = (counts[li.title] || 0) + (li.quantity || 0);
            }
          }
          hasNext = false;
          const link = headers.get("link") || headers.get("Link") || "";
          const m = link.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
          if (m) { url = `orders.json?limit=250&page_info=${m[1]}&fields=id,line_items`; hasNext = true; }
        }
      }
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([name, qty]) => ({ name, qty }));
    }

    const [last7, last30] = await Promise.all([fetchRecentProducts(7), fetchRecentProducts(30)]);
    await env.RCO_KPI.put("top-products", JSON.stringify({ last7Days: last7, last30Days: last30, updatedAt: now.toISOString() }));

    // --- ORDERS OVERVIEW (current month only) ---
    const startDate = `${year}-${mm}-01`;
    const endDate = `${year}-${mm}-${pad(daysInMonth)}`;

    const retailOrders = await fetchAllOrders(env, startDate, endDate, "retail");
    const wholesaleOrders = await fetchAllOrders(env, startDate, endDate, "wholesale");
    const allOrders = [...retailOrders, ...wholesaleOrders];

    // Compute monthly summary
    const active = allOrders.filter(o => !o.excluded);
    const totalPlaced = allOrders.length;
    const totalFulfilled = active.filter(o => o.fulfillmentStatus === "fulfilled").length;

    // For items/products we need full line_items — but fetchAllOrders only gets fulfillment fields
    // So we'll update just the order counts in the existing overview data
    const overviewRaw = await env.RCO_KPI.get("orders-overview");
    let overview = overviewRaw ? JSON.parse(overviewRaw) : [];
    const monthName = new Date(year, month, 1).toLocaleString("en-US", { month: "long" });

    // Find and update current month entry, or add it
    const idx = overview.findIndex(m => m.year === year && m.month === monthName);
    const entry = idx >= 0 ? overview[idx] : { month: monthName, year };
    entry.ordersPlaced = totalPlaced;
    entry.ordersFulfilled = totalFulfilled;
    entry.fulfillmentRate = totalPlaced > 0 ? `${Math.round(totalFulfilled / totalPlaced * 1000) / 10}%` : "0%";
    entry.lastUpdated = now.toISOString().split("T")[0];
    if (idx >= 0) overview[idx] = entry;
    else overview.push(entry);
    overview.sort((a, b) => (a.year - b.year) || new Date(`${a.month} 1`).getMonth() - new Date(`${b.month} 1`).getMonth());
    await env.RCO_KPI.put("orders-overview", JSON.stringify(overview));

    // --- INTERNATIONAL (current year, current month) ---
    const countries = {};
    const usStates = {};
    // Fetch with shipping_address for geo data
    for (const apiFn of [shopifyGet, shopifyGetWholesale]) {
      let url = `orders.json?limit=250&status=any&created_at_min=${startDate}T00:00:00${chicagoOffset(year, month+1, 1)}&created_at_max=${endDate}T23:59:59${chicagoOffset(year, month+1, daysInMonth)}&fields=id,shipping_address`;
      let hasNext = true;
      while (hasNext) {
        const { json: data, headers } = await apiFn(env, url);
        for (const o of (data.orders || [])) {
          const addr = o.shipping_address;
          if (!addr) continue;
          const cc = addr.country_code;
          if (cc) countries[cc] = (countries[cc] || 0) + 1;
          if (cc === "US" && addr.province_code) {
            const st = `US-${addr.province_code}`;
            usStates[st] = (usStates[st] || 0) + 1;
          }
        }
        hasNext = false;
        const link = headers.get("link") || headers.get("Link") || "";
        const m = link.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
        if (m) { url = `orders.json?limit=250&page_info=${m[1]}&fields=id,shipping_address`; hasNext = true; }
      }
    }

    // Merge into existing year data
    const intlKey = `intl-${year}`;
    const intlRaw = await env.RCO_KPI.get(intlKey);
    let intlData = intlRaw ? JSON.parse(intlRaw) : { countries: {}, usStates: {} };
    // For a nightly refresh we merge the current month's data
    // This is additive — over time it accumulates. Full accuracy requires periodic full backfill.
    for (const [k, v] of Object.entries(countries)) intlData.countries[k] = (intlData.countries[k] || 0) + v;
    for (const [k, v] of Object.entries(usStates)) intlData.usStates[k] = (intlData.usStates[k] || 0) + v;
    await env.RCO_KPI.put(intlKey, JSON.stringify(intlData));
  },
};
