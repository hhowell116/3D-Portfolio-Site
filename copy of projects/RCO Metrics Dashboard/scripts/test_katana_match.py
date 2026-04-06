"""
Test Katana sales order data against Alisha's manual KPI data.
READ-ONLY: Only GET requests to Katana API. No writes.

Fetches Jan 2026 retail orders from Katana, computes fulfillment KPI,
and compares with Alisha's manually reported numbers.
"""

import os
import time
import requests
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

KATANA_API_KEY = os.environ.get("KATANA_API_KEY")
KATANA_BASE = "https://api.katanamrp.com/v1"

# Alisha's Jan 2026 data: {day: (orders, rem4, rem7)}
ALISHA = {
    1: (2495, 0, 0), 2: (3068, 291, 0), 3: (1401, 0, 0),
    4: (1330, 0, 0), 5: (1193, 0, 0), 6: (1185, 0, 0),
    7: (1318, 0, 0), 8: (1270, 0, 0), 9: (1271, 4, 0),
    10: (1280, 0, 0), 11: (1385, 0, 0), 12: (1482, 0, 0),
    13: (1292, 0, 0), 14: (1320, 0, 0), 15: (1362, 0, 0),
    16: (1225, 4, 0), 17: (1281, 0, 0), 18: (1305, 0, 0),
    19: (1389, 0, 0), 20: (1302, 0, 0), 21: (1303, 0, 0),
    22: (1195, 0, 0), 23: (1138, 0, 0), 24: (1109, 14, 0),
    25: (1223, 0, 0), 26: (1330, 0, 0), 27: (1628, 0, 0),
    28: (1375, 0, 0), 29: (1364, 0, 0), 30: (1582, 0, 0),
    31: (1276, 0, 0),
}


def katana_get(endpoint, params=None):
    """READ-ONLY GET request to Katana API."""
    headers = {
        "Authorization": f"Bearer {KATANA_API_KEY}",
        "Accept": "application/json",
    }

    for attempt in range(3):
        try:
            r = requests.get(
                f"{KATANA_BASE}{endpoint}",
                headers=headers,
                params=params,
                timeout=60,
            )

            if r.status_code == 429:
                retry = int(r.headers.get("Retry-After", "5"))
                print(f"    Rate limited, waiting {retry}s...", flush=True)
                time.sleep(retry)
                continue

            r.raise_for_status()
            return r.json(), r.headers
        except Exception as e:
            if attempt < 2:
                wait = (attempt + 1) * 3
                print(f"    Retry {attempt+1}/3 in {wait}s...", flush=True)
                time.sleep(wait)
            else:
                print(f"    FAILED: {e}", flush=True)
                return None, None

    return None, None


def fetch_katana_orders(start_date, end_date):
    """Fetch all Katana sales orders for a date range. GET only."""
    all_orders = []
    page = 1
    total_pages = 1

    while page <= total_pages:
        data, headers = katana_get("/sales_orders", params={
            "limit": 250,
            "page": page,
            "created_at_min": f"{start_date}T00:00:00.000Z",
            "created_at_max": f"{end_date}T23:59:59.999Z",
        })

        if data is None:
            break

        orders = data.get("data", data if isinstance(data, list) else [])
        all_orders.extend(orders)

        # Parse pagination
        if headers:
            import json as _json
            pag = headers.get("X-Pagination", "{}")
            try:
                pag_data = _json.loads(pag)
                total_pages = int(pag_data.get("total_pages", 1))
            except (_json.JSONDecodeError, ValueError):
                pass

        print(f"    Page {page}/{total_pages} ({len(all_orders)} orders so far)", flush=True)
        page += 1
        time.sleep(1)  # Respect rate limits (60/min)

    return all_orders


def compute_kpi(orders):
    """Compute KPI from Katana orders using picked_date as fulfillment date."""
    by_date = defaultdict(list)

    for o in orders:
        created = o.get("order_created_date", "")
        if not created:
            continue
        date_str = created[:10]  # YYYY-MM-DD
        by_date[date_str].append(o)

    results = {}
    for date_str, day_orders in sorted(by_date.items()):
        total = len(day_orders)
        order_date = datetime.strptime(date_str, "%Y-%m-%d")
        rem4 = 0
        rem7 = 0

        for o in day_orders:
            status = o.get("status", "")
            picked = o.get("picked_date")

            if not picked or status not in ("PACKED", "DELIVERED"):
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

        day = int(date_str.split("-")[2])
        results[day] = {"orders": total, "rem4": rem4, "rem7": rem7}

    return results


def main():
    if not KATANA_API_KEY:
        print("Missing KATANA_API_KEY in scripts/.env")
        return

    print("Fetching Jan 2026 orders from Katana (READ-ONLY)...\n", flush=True)

    orders = fetch_katana_orders("2026-01-01", "2026-01-10")
    print(f"\n  Total orders fetched: {len(orders)}", flush=True)

    # Count statuses
    statuses = defaultdict(int)
    for o in orders:
        statuses[o.get("status", "unknown")] += 1
    print(f"  Statuses: {dict(statuses)}\n", flush=True)

    kpi = compute_kpi(orders)

    print(f"  {'Day':<6} {'Orders':>7} {'Alisha':>7} {'Match':>6}  "
          f"{'Rem4':>5} {'A-R4':>5} {'Match':>6}  "
          f"{'Rem7':>5} {'A-R7':>5} {'Match':>6}", flush=True)
    print(f"  {'-'*6} {'-'*7} {'-'*7} {'-'*6}  "
          f"{'-'*5} {'-'*5} {'-'*6}  "
          f"{'-'*5} {'-'*5} {'-'*6}", flush=True)

    order_matches = 0
    rem4_matches = 0
    rem7_matches = 0

    for day in range(1, 11):
        a_orders, a_rem4, a_rem7 = ALISHA[day]
        k = kpi.get(day, {"orders": 0, "rem4": 0, "rem7": 0})

        om = "YES" if k["orders"] == a_orders else ""
        r4m = "YES" if k["rem4"] == a_rem4 else ""
        r7m = "YES" if k["rem7"] == a_rem7 else ""

        if om:
            order_matches += 1
        if r4m:
            rem4_matches += 1
        if r7m:
            rem7_matches += 1

        print(
            f"  Jan {day:<2d} {k['orders']:>7} {a_orders:>7} {om:>6}  "
            f"{k['rem4']:>5} {a_rem4:>5} {r4m:>6}  "
            f"{k['rem7']:>5} {a_rem7:>5} {r7m:>6}",
            flush=True,
        )

    print(f"\n  Score: orders={order_matches}/10, "
          f"rem4={rem4_matches}/10, rem7={rem7_matches}/10", flush=True)
    print("\nDone!", flush=True)


if __name__ == "__main__":
    main()
