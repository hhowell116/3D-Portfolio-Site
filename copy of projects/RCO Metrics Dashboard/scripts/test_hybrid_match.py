"""
Hybrid test: Shopify order counts + Katana fulfillment status.
Matches Alisha's exact methodology:
  - Order count from Shopify (all orders, no exclusions)
  - Remaining unfulfilled from Katana (only fully unfulfilled)

READ-ONLY: Only GET requests to both APIs.
"""

import os
import time
import json
import requests
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SHOPIFY_SHOP = os.environ.get("SHOPIFY_SHOP")
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")
KATANA_API_KEY = os.environ.get("KATANA_API_KEY")

ALISHA = {
    1: (2495, 0, 0), 2: (3068, 291, 0), 3: (1401, 0, 0),
    4: (1330, 0, 0), 5: (1193, 0, 0), 6: (1185, 0, 0),
    7: (1318, 0, 0), 8: (1270, 0, 0), 9: (1271, 4, 0),
    10: (1280, 0, 0),
}


# ========== SHOPIFY (order counts) ==========

def get_shopify_token():
    r = requests.post(
        f"https://{SHOPIFY_SHOP}.myshopify.com/admin/oauth/access_token",
        data={
            "grant_type": "client_credentials",
            "client_id": SHOPIFY_CLIENT_ID,
            "client_secret": SHOPIFY_CLIENT_SECRET,
        },
    )
    r.raise_for_status()
    return r.json()["access_token"]


def shopify_order_count(token, date_str):
    """GET order count for a single day from Shopify. READ-ONLY."""
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    params = {
        "status": "any",
        "created_at_min": f"{date_str}T00:00:00-06:00",
        "created_at_max": f"{date_str}T23:59:59-06:00",
    }

    for attempt in range(3):
        try:
            r = requests.get(
                f"https://{SHOPIFY_SHOP}.myshopify.com/admin/api/2024-10/orders/count.json",
                headers=headers, params=params, timeout=30,
            )
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", "2")))
                continue
            r.raise_for_status()
            return r.json().get("count", 0)
        except Exception as e:
            if attempt < 2:
                time.sleep(3)
            else:
                print(f"    Shopify FAILED: {e}", flush=True)
                return 0
    return 0


# ========== KATANA (fulfillment status) ==========

def fetch_katana_orders(start_date, end_date):
    """Fetch Katana orders by created_at range, group by order_created_date. GET only."""
    all_orders = []
    page = 1
    total_pages = 1

    while page <= total_pages:
        for attempt in range(3):
            try:
                r = requests.get(
                    "https://api.katanamrp.com/v1/sales_orders",
                    headers={
                        "Authorization": f"Bearer {KATANA_API_KEY}",
                        "Accept": "application/json",
                    },
                    params={
                        "limit": 250,
                        "page": page,
                        "created_at_min": f"{start_date}T00:00:00.000Z",
                        "created_at_max": f"{end_date}T23:59:59.999Z",
                    },
                    timeout=60,
                )
                if r.status_code == 429:
                    retry = int(r.headers.get("Retry-After", "5"))
                    print(f"    Rate limited, waiting {retry}s...", flush=True)
                    time.sleep(retry)
                    continue
                r.raise_for_status()
                break
            except Exception as e:
                if attempt < 2:
                    time.sleep(3)
                else:
                    print(f"    Katana FAILED: {e}", flush=True)
                    return all_orders

        data = r.json()
        orders = data.get("data", [])
        all_orders.extend(orders)

        pag = r.headers.get("X-Pagination", "{}")
        try:
            pag_data = json.loads(pag)
            total_pages = int(pag_data.get("total_pages", 1))
        except (json.JSONDecodeError, ValueError):
            pass

        print(f"    Katana page {page}/{total_pages} ({len(all_orders)} orders)", flush=True)
        page += 1
        time.sleep(1)

    return all_orders


def main():
    print("HYBRID TEST: Shopify counts + Katana fulfillment", flush=True)
    print("READ-ONLY: Only GET requests\n", flush=True)

    # Step 1: Shopify order counts
    print("Step 1: Getting order counts from Shopify...", flush=True)
    token = get_shopify_token()
    shopify_counts = {}
    for day in range(1, 11):
        date_str = f"2026-01-{str(day).zfill(2)}"
        count = shopify_order_count(token, date_str)
        shopify_counts[day] = count
        print(f"    Jan {day}: {count} orders", flush=True)
        time.sleep(0.5)

    # Step 2: Katana fulfillment data
    # Pull a wider range to catch orders that synced late
    print("\nStep 2: Getting fulfillment data from Katana...", flush=True)
    katana_orders = fetch_katana_orders("2025-12-28", "2026-01-17")

    # Group by order_created_date (the Shopify order date)
    by_date = defaultdict(list)
    for o in katana_orders:
        odate = o.get("order_created_date", "")
        if odate:
            by_date[odate[:10]].append(o)

    print(f"\n  Katana orders grouped by order date:", flush=True)
    for day in range(1, 11):
        date_str = f"2026-01-{str(day).zfill(2)}"
        orders = by_date.get(date_str, [])
        statuses = defaultdict(int)
        for o in orders:
            statuses[o.get("status", "unknown")] += 1
        print(f"    Jan {day}: {len(orders)} orders - {dict(statuses)}", flush=True)

    # Step 3: Compute KPI using Shopify counts + Katana fulfillment
    print(f"\n{'='*70}", flush=True)
    print(f"  HYBRID: Shopify order count + Katana fulfillment", flush=True)
    print(f"{'='*70}", flush=True)
    print(f"  {'Day':<6} {'Shop#':>6} {'Kat#':>6} {'Alisha':>7}  "
          f"{'Rem4':>5} {'A-R4':>5} {'Match':>6}  "
          f"{'Rem7':>5} {'A-R7':>5} {'Match':>6}", flush=True)
    print(f"  {'-'*6} {'-'*6} {'-'*6} {'-'*7}  "
          f"{'-'*5} {'-'*5} {'-'*6}  "
          f"{'-'*5} {'-'*5} {'-'*6}", flush=True)

    order_matches = 0
    rem4_matches = 0
    rem7_matches = 0

    for day in range(1, 11):
        date_str = f"2026-01-{str(day).zfill(2)}"
        a_orders, a_rem4, a_rem7 = ALISHA[day]

        shopify_count = shopify_counts[day]
        katana_day = by_date.get(date_str, [])
        order_date = datetime.strptime(date_str, "%Y-%m-%d")

        # Count remaining using Katana status + picked_date
        rem4 = 0
        rem7 = 0
        for o in katana_day:
            status = o.get("status", "")
            picked = o.get("picked_date")

            if status not in ("PACKED", "DELIVERED") or not picked:
                # Not fulfilled in Katana
                rem4 += 1
                rem7 += 1
            else:
                picked_date = datetime.strptime(picked[:10], "%Y-%m-%d")
                diff = (picked_date - order_date).days
                if diff > 4:
                    rem4 += 1
                if diff > 7:
                    rem7 += 1

        om = "YES" if shopify_count == a_orders else ""
        r4m = "YES" if rem4 == a_rem4 else ""
        r7m = "YES" if rem7 == a_rem7 else ""
        if om: order_matches += 1
        if r4m: rem4_matches += 1
        if r7m: rem7_matches += 1

        print(
            f"  Jan {day:<2d} {shopify_count:>6} {len(katana_day):>6} {a_orders:>7} {om:>3}  "
            f"{rem4:>5} {a_rem4:>5} {r4m:>6}  "
            f"{rem7:>5} {a_rem7:>5} {r7m:>6}",
            flush=True,
        )

    print(f"\n  Score: orders={order_matches}/10, "
          f"rem4={rem4_matches}/10, rem7={rem7_matches}/10", flush=True)
    print("\nDone!", flush=True)


if __name__ == "__main__":
    main()
