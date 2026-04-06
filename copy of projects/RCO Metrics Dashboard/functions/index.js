const functions = require("firebase-functions");
const fetch = require("node-fetch");

const SHOP = process.env.SHOPIFY_SHOP;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

// Cache the token in memory so we don't re-fetch on every request
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Fetches a fresh access token using client_credentials grant.
 * Tokens last ~24 hours; we refresh 5 minutes early to be safe.
 */
async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch(
    `https://${SHOP}.myshopify.com/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Refresh 5 minutes before expiry
  tokenExpiresAt = now + (data.expires_in - 300) * 1000;
  return cachedToken;
}

/**
 * Makes a READ-ONLY GET request to the Shopify Admin REST API.
 * Only GET method is allowed — no writes, no deletes, no updates.
 */
async function shopifyGet(endpoint, apiVersion = "2024-10") {
  const token = await getAccessToken();
  const url = `https://${SHOP}.myshopify.com/admin/api/${apiVersion}/${endpoint}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// --- Cloud Function endpoints (all READ-ONLY) ---

/**
 * GET /shopifyOrders
 * Returns recent orders. Supports query params: status, limit, created_at_min, created_at_max
 */
exports.shopifyOrders = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  // SAFETY: Only allow GET requests
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET requests allowed (read-only)" });
    return;
  }

  try {
    const limit = req.query.limit || 50;
    const status = req.query.status || "any";
    const params = new URLSearchParams({ limit, status });

    if (req.query.created_at_min) params.set("created_at_min", req.query.created_at_min);
    if (req.query.created_at_max) params.set("created_at_max", req.query.created_at_max);

    const data = await shopifyGet(`orders.json?${params}`);
    res.json(data);
  } catch (err) {
    console.error("shopifyOrders error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /shopifyProducts
 * Returns products. Supports query params: limit, collection_id
 */
exports.shopifyProducts = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET requests allowed (read-only)" });
    return;
  }

  try {
    const limit = req.query.limit || 50;
    const params = new URLSearchParams({ limit });
    if (req.query.collection_id) params.set("collection_id", req.query.collection_id);

    const data = await shopifyGet(`products.json?${params}`);
    res.json(data);
  } catch (err) {
    console.error("shopifyProducts error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /shopifyOrderCount
 * Returns order count. Supports query params: status, created_at_min, created_at_max
 */
exports.shopifyOrderCount = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET requests allowed (read-only)" });
    return;
  }

  try {
    const status = req.query.status || "any";
    const params = new URLSearchParams({ status });

    if (req.query.created_at_min) params.set("created_at_min", req.query.created_at_min);
    if (req.query.created_at_max) params.set("created_at_max", req.query.created_at_max);

    const data = await shopifyGet(`orders/count.json?${params}`);
    res.json(data);
  } catch (err) {
    console.error("shopifyOrderCount error:", err);
    res.status(500).json({ error: err.message });
  }
});
