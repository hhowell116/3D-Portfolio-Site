"""
Backfill Top Products data (last 7 and 30 days).
READ-ONLY: Only GET requests to Shopify.
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collections import Counter
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SHOPIFY_SHOP_RETAIL = os.environ.get("SHOPIFY_SHOP")
SHOPIFY_SHOP_WHOLESALE = "wholesale-rowe-casa"
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")

sys.path.insert(0, os.path.dirname(__file__))
from backfill import get_token, write_to_kv


def get_wholesale_token():
    r = requests.post(
        f"https://{SHOPIFY_SHOP_WHOLESALE}.myshopify.com/admin/oauth/access_token",
        data={
            "grant_type": "client_credentials",
            "client_id": SHOPIFY_CLIENT_ID,
            "client_secret": SHOPIFY_CLIENT_SECRET,
        },
    )
    r.raise_for_status()
    print("  Wholesale token acquired", flush=True)
    return r.json()["access_token"]


def fetch_products_period(token, days_back, shop=None):
    """Fetch line items for last N days. GET only."""
    shop = shop or SHOPIFY_SHOP_RETAIL
    headers = {"X-Shopify-Access-Token": token}
    tz = ZoneInfo("America/Chicago")
    now = datetime.now(tz)
    start = now - timedelta(days=days_back)

    products = Counter()
    url = (
        f"https://{shop}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={start.strftime('%Y-%m-%dT%H:%M:%S%z')}"
        f"&created_at_max={now.strftime('%Y-%m-%dT%H:%M:%S%z')}"
        f"&fields=id,line_items"
    )

    pages = 0
    while url:
        for attempt in range(3):
            try:
                r = requests.get(url, headers=headers, timeout=60)
                if r.status_code == 429:
                    time.sleep(float(r.headers.get("Retry-After", "2")))
                    continue
                r.raise_for_status()
                break
            except Exception as e:
                if attempt < 2:
                    time.sleep((attempt + 1) * 5)
                else:
                    print(f"  FAILED: {e}", flush=True)
                    return products

        for o in r.json().get("orders", []):
            for li in o.get("line_items", []):
                title = li.get("title", "Unknown")
                title_lower = title.lower()
                if any(skip in title_lower for skip in [
                    "shipping protection", "navidium", "10% off", "new customer card",
                    "discount card", "gift card", "skip the line", "heat sensitive info card",
                ]):
                    continue
                products[title] += li.get("quantity", 0)

        link = r.headers.get("Link", "")
        url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split("<")[1].split(">")[0]

        pages += 1
        if pages % 10 == 0:
            print(f"  Page {pages}...", flush=True)
        time.sleep(0.5)

    return products


def main():
    print("Top Products Backfill — RETAIL + WHOLESALE")
    print("READ-ONLY: Only GET requests\n", flush=True)

    retail_token = get_token()
    wholesale_token = get_wholesale_token()

    print("Fetching last 7 days (retail)...", flush=True)
    p7 = fetch_products_period(retail_token, 7, SHOPIFY_SHOP_RETAIL)
    print(f"  Retail: {len(p7)} products", flush=True)
    print("Fetching last 7 days (wholesale)...", flush=True)
    p7w = fetch_products_period(wholesale_token, 7, SHOPIFY_SHOP_WHOLESALE)
    print(f"  Wholesale: {len(p7w)} products", flush=True)
    p7 += p7w
    last7 = [{"name": n, "qty": q} for n, q in p7.most_common()]
    print(f"  Combined: {len(p7)} products, top: {last7[0]['name'] if last7 else 'none'}", flush=True)

    print("\nFetching last 30 days (retail)...", flush=True)
    p30 = fetch_products_period(retail_token, 30, SHOPIFY_SHOP_RETAIL)
    print(f"  Retail: {len(p30)} products", flush=True)
    print("Fetching last 30 days (wholesale)...", flush=True)
    p30w = fetch_products_period(wholesale_token, 30, SHOPIFY_SHOP_WHOLESALE)
    print(f"  Wholesale: {len(p30w)} products", flush=True)
    p30 += p30w
    last30 = [{"name": n, "qty": q} for n, q in p30.most_common()]
    print(f"  Combined: {len(p30)} products, top: {last30[0]['name'] if last30 else 'none'}", flush=True)

    data = {
        "last7Days": last7,
        "last30Days": last30,
        "updatedAt": datetime.now().isoformat(),
    }

    print("\nWriting to KV...", end=" ", flush=True)
    if write_to_kv("top-products", json.dumps(data)):
        print("OK", flush=True)
    else:
        print("FAILED", flush=True)

    print("\nDone!", flush=True)


if __name__ == "__main__":
    main()
