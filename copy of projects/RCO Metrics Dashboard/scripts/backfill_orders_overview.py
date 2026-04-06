"""
Backfill Orders Overview data from Shopify.
Computes monthly summaries: orders placed, fulfilled, items, customers, top product.
READ-ONLY: Only GET requests to Shopify.
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime
from calendar import monthrange
from zoneinfo import ZoneInfo
from collections import Counter
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SHOPIFY_SHOP_RETAIL = os.environ.get("SHOPIFY_SHOP")
SHOPIFY_SHOP_WHOLESALE = "wholesale-rowe-casa"
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")
KV_NAMESPACE_ID = os.environ.get("RCO_KPI_NAMESPACE_ID")
WORKER_DIR = os.path.join(os.path.dirname(__file__), "..", "worker")

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


def fetch_month_orders(token, year, month, shop=None):
    """Fetch all orders for a month with fields needed for overview. GET only."""
    shop = shop or SHOPIFY_SHOP_RETAIL
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    tz = ZoneInfo("America/Chicago")
    days = monthrange(year, month)[1]
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=tz)
    end = datetime(year, month, days, 23, 59, 59, tzinfo=tz)

    orders = []
    url = (
        f"https://{shop}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={start.isoformat()}"
        f"&created_at_max={end.isoformat()}"
        f"&fields=id,fulfillment_status,customer,line_items,cancelled_at,financial_status"
    )

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
                    print(f"    FAILED: {e}", flush=True)
                    return orders

        data = r.json()
        orders.extend(data.get("orders", []))

        link = r.headers.get("Link", "")
        url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split("<")[1].split(">")[0]
        time.sleep(0.5)

    return orders


def compute_month_summary(orders, year, month):
    """Compute monthly summary stats."""
    month_name = datetime(year, month, 1).strftime("%B")

    # Filter out cancelled/refunded for fulfillment stats
    active = [
        o for o in orders
        if not o.get("cancelled_at")
        and o.get("financial_status") not in ("refunded", "voided")
    ]

    total_placed = len(orders)
    total_fulfilled = sum(1 for o in active if o.get("fulfillment_status") == "fulfilled")

    # Count items and products
    total_items = 0
    product_counts = Counter()
    for o in orders:
        for li in o.get("line_items", []):
            qty = li.get("quantity", 0)
            title = li.get("title", "Unknown")
            # Skip non-product items
            tl = title.lower()
            if any(skip in tl for skip in [
                "shipping protection", "navidium", "10% off", "new customer card",
                "discount card", "gift card", "skip the line", "heat sensitive info card",
            ]):
                continue
            total_items += qty
            product_counts[title] += qty

    # Unique customers
    customer_ids = set()
    for o in orders:
        cust = o.get("customer")
        if cust and cust.get("id"):
            customer_ids.add(cust["id"])

    top_product = product_counts.most_common(1)[0][0] if product_counts else "N/A"
    avg_items = round(total_items / max(total_placed, 1), 2)
    ff_rate = f"{round(total_fulfilled / max(total_placed, 1) * 100, 1)}%" if total_placed else "0%"

    return {
        "month": month_name,
        "year": year,
        "ordersPlaced": total_placed,
        "ordersFulfilled": total_fulfilled,
        "totalItems": total_items,
        "uniqueCustomers": len(customer_ids),
        "avgItemsPerOrder": avg_items,
        "fulfillmentRate": ff_rate,
        "topProduct": top_product,
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }


def main():
    print("RCO Orders Overview Backfill — RETAIL + WHOLESALE")
    print("READ-ONLY: Only GET requests to Shopify")
    print("=" * 50, flush=True)

    retail_token = get_token()
    wholesale_token = get_wholesale_token()
    token_time = time.time()
    now = datetime.now()
    all_summaries = []

    for year in [2024, 2025, 2026]:
        print(f"\n{'=' * 50}", flush=True)
        print(f"  YEAR: {year}", flush=True)
        print(f"{'=' * 50}", flush=True)

        max_month = 12 if year < now.year else now.month

        for month in range(1, max_month + 1):
            month_name = datetime(year, month, 1).strftime("%B %Y")
            print(f"\n  {month_name}...", flush=True)

            if time.time() - token_time > 72000:
                retail_token = get_token()
                wholesale_token = get_wholesale_token()
                token_time = time.time()

            try:
                # Fetch from both stores
                print(f"    Retail...", end=" ", flush=True)
                retail_orders = fetch_month_orders(retail_token, year, month, SHOPIFY_SHOP_RETAIL)
                print(f"{len(retail_orders)} orders", flush=True)

                print(f"    Wholesale...", end=" ", flush=True)
                wholesale_orders = fetch_month_orders(wholesale_token, year, month, SHOPIFY_SHOP_WHOLESALE)
                print(f"{len(wholesale_orders)} orders", flush=True)

                # Combine both into one summary
                all_orders = retail_orders + wholesale_orders
                summary = compute_month_summary(all_orders, year, month)
                all_summaries.append(summary)
                print(
                    f"    COMBINED: {summary['ordersPlaced']} orders, "
                    f"{summary['ordersFulfilled']} fulfilled, "
                    f"{summary['uniqueCustomers']} customers, "
                    f"top: {summary['topProduct'][:30]}",
                    flush=True,
                )
            except Exception as e:
                print(f"    ERROR: {e}", flush=True)
                time.sleep(30)
                try:
                    retail_token = get_token()
                    wholesale_token = get_wholesale_token()
                    token_time = time.time()
                    retail_orders = fetch_month_orders(retail_token, year, month, SHOPIFY_SHOP_RETAIL)
                    wholesale_orders = fetch_month_orders(wholesale_token, year, month, SHOPIFY_SHOP_WHOLESALE)
                    all_orders = retail_orders + wholesale_orders
                    summary = compute_month_summary(all_orders, year, month)
                    all_summaries.append(summary)
                except Exception as e2:
                    print(f"    SKIPPING: {e2}", flush=True)

    # Write all summaries to KV
    print(f"\nWriting {len(all_summaries)} months to KV...", end=" ", flush=True)
    if write_to_kv("orders-overview", json.dumps(all_summaries)):
        print("OK", flush=True)
    else:
        print("FAILED", flush=True)

    print(f"\n{'=' * 50}", flush=True)
    print("ORDERS OVERVIEW BACKFILL COMPLETE (RETAIL + WHOLESALE)!", flush=True)
    print(f"{'=' * 50}", flush=True)


if __name__ == "__main__":
    main()
