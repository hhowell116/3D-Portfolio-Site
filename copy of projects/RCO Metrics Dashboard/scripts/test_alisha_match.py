"""
Test different KPI computation methods against Alisha's manual data.
Fetches Jan 2026 orders from Shopify and tries 4 combinations:

  A) Include all orders, partial = fulfilled (current logic)
  B) Exclude cancelled, partial = fulfilled
  C) Include all orders, partial = remaining
  D) Exclude cancelled, partial = remaining

READ-ONLY: Only GET requests to Shopify.
"""

import os
import time
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SHOPIFY_SHOP = os.environ.get("SHOPIFY_SHOP")
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")

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


def get_token():
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


def fetch_orders_day(token, date_str):
    """Fetch all orders for a single day. GET only."""
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    orders = []

    url = (
        f"https://{SHOPIFY_SHOP}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={date_str}T00:00:00-06:00"
        f"&created_at_max={date_str}T23:59:59-06:00"
        f"&fields=id,created_at,fulfillment_status,fulfillments,cancelled_at,financial_status"
    )

    while url:
        for attempt in range(3):
            try:
                r = requests.get(url, headers=headers, timeout=60)
                if r.status_code == 429:
                    retry = float(r.headers.get("Retry-After", "2"))
                    print(f"    Rate limited, waiting {retry}s...", flush=True)
                    time.sleep(retry)
                    continue
                r.raise_for_status()
                break
            except Exception as e:
                wait = (attempt + 1) * 5
                if attempt < 2:
                    print(f"    Retry {attempt+1}/3 in {wait}s...", flush=True)
                    time.sleep(wait)
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


def compute_kpi(orders, date_str, exclude_cancelled, partial_is_remaining):
    """Compute KPI with different settings."""
    order_date = datetime.strptime(date_str, "%Y-%m-%d")

    filtered = []
    for o in orders:
        if exclude_cancelled:
            if o.get("cancelled_at") is not None:
                continue
            if o.get("financial_status") in ("refunded", "voided"):
                continue
        filtered.append(o)

    total = len(filtered)
    if total == 0:
        return None

    rem4 = 0
    rem7 = 0

    for o in filtered:
        ffs = o.get("fulfillments", [])
        fs = o.get("fulfillment_status")

        if not ffs or fs is None:
            # Completely unfulfilled
            rem4 += 1
            rem7 += 1
        elif partial_is_remaining and fs == "partial":
            # Partially fulfilled counts as remaining
            rem4 += 1
            rem7 += 1
        else:
            # Use earliest fulfillment date
            earliest = sorted(ffs, key=lambda f: f["created_at"])[0]
            ff_date = datetime.strptime(earliest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4:
                rem4 += 1
            if diff > 7:
                rem7 += 1

    return {"orders": total, "rem4": rem4, "rem7": rem7}


def main():
    print("Fetching Jan 2026 orders from Shopify (READ-ONLY)...\n", flush=True)
    token = get_token()
    print("Token acquired\n", flush=True)

    combos = [
        ("A", "Include all, partial=fulfilled", False, False),
        ("B", "Exclude cancelled, partial=fulfilled", True, False),
        ("C", "Include all, partial=remaining", False, True),
        ("D", "Exclude cancelled, partial=remaining", True, True),
    ]

    # Collect all days' orders first
    all_days = {}
    for day in range(1, 32):
        date_str = f"2026-01-{str(day).zfill(2)}"
        orders = fetch_orders_day(token, date_str)
        all_days[day] = orders
        count = len(orders)
        cancelled = sum(1 for o in orders if o.get("cancelled_at") is not None)
        refunded = sum(1 for o in orders if o.get("financial_status") in ("refunded", "voided"))
        print(f"  Jan {day:2d}: {count} total, {cancelled} cancelled, {refunded} refunded", flush=True)

    # Test each combination
    for label, desc, excl, partial in combos:
        print(f"\n{'='*70}", flush=True)
        print(f"  {label}) {desc}", flush=True)
        print(f"{'='*70}", flush=True)
        print(f"  {'Day':<6} {'Orders':>7} {'Alisha':>7} {'Match':>6}  "
              f"{'Rem4':>5} {'A-R4':>5} {'Match':>6}  "
              f"{'Rem7':>5} {'A-R7':>5} {'Match':>6}", flush=True)
        print(f"  {'-'*6} {'-'*7} {'-'*7} {'-'*6}  "
              f"{'-'*5} {'-'*5} {'-'*6}  "
              f"{'-'*5} {'-'*5} {'-'*6}", flush=True)

        order_matches = 0
        rem4_matches = 0
        rem7_matches = 0

        for day in range(1, 32):
            date_str = f"2026-01-{str(day).zfill(2)}"
            result = compute_kpi(all_days[day], date_str, excl, partial)
            a_orders, a_rem4, a_rem7 = ALISHA[day]

            if result is None:
                continue

            om = "YES" if result["orders"] == a_orders else ""
            r4m = "YES" if result["rem4"] == a_rem4 else ""
            r7m = "YES" if result["rem7"] == a_rem7 else ""

            if om:
                order_matches += 1
            if r4m:
                rem4_matches += 1
            if r7m:
                rem7_matches += 1

            print(
                f"  Jan {day:<2d} {result['orders']:>7} {a_orders:>7} {om:>6}  "
                f"{result['rem4']:>5} {a_rem4:>5} {r4m:>6}  "
                f"{result['rem7']:>5} {a_rem7:>5} {r7m:>6}",
                flush=True,
            )

        print(f"\n  Score: orders={order_matches}/31, "
              f"rem4={rem4_matches}/31, rem7={rem7_matches}/31", flush=True)

    print("\nDone!", flush=True)


if __name__ == "__main__":
    main()
