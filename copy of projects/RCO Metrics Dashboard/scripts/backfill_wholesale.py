"""
Backfill ALL wholesale KPI data from 2024-present.
Uses the wholesale-rowe-casa Shopify store with same API credentials.
READ-ONLY: Only GET requests.
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
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SHOPIFY_SHOP = "wholesale-rowe-casa"
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")
KV_NAMESPACE_ID = os.environ.get("RCO_KPI_NAMESPACE_ID")
WORKER_DIR = os.path.join(os.path.dirname(__file__), "..", "worker")

sys.path.insert(0, os.path.dirname(__file__))
from backfill import write_to_kv


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
    print("  Wholesale token acquired", flush=True)
    return r.json()["access_token"]


def get_order_count(token, date_str):
    tz = ZoneInfo("America/Chicago")
    parts = date_str.split("-")
    day_start = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 0, 0, 0, tzinfo=tz)
    day_end = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 23, 59, 59, tzinfo=tz)

    r = requests.get(
        f"https://{SHOPIFY_SHOP}.myshopify.com/admin/api/2024-10/orders/count.json",
        headers={"X-Shopify-Access-Token": token},
        params={
            "status": "any",
            "processed_at_min": day_start.isoformat(),
            "processed_at_max": day_end.isoformat(),
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get("count", 0)


def fetch_orders_day(token, date_str):
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    orders = []

    tz = ZoneInfo("America/Chicago")
    parts = date_str.split("-")
    day_start = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 0, 0, 0, tzinfo=tz)
    day_end = datetime(int(parts[0]), int(parts[1]), int(parts[2]), 23, 59, 59, tzinfo=tz)

    url = (
        f"https://{SHOPIFY_SHOP}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={day_start.isoformat()}"
        f"&created_at_max={day_end.isoformat()}"
        f"&fields=id,created_at,fulfillment_status,fulfillments,cancelled_at,financial_status"
    )

    while url:
        for attempt in range(3):
            try:
                r = requests.get(url, headers=headers, timeout=60)
                if r.status_code == 429:
                    retry = float(r.headers.get("Retry-After", "2"))
                    time.sleep(retry)
                    continue
                r.raise_for_status()
                break
            except Exception as e:
                wait = (attempt + 1) * 5
                if attempt < 2:
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


def compute_day_kpi(orders, date_str):
    if not orders:
        return None

    total = len(orders)
    if total == 0:
        return None

    clean = [
        o for o in orders
        if o.get("cancelled_at") is None
        and o.get("financial_status") not in ("refunded", "voided")
    ]

    rem4 = 0
    rem7 = 0
    order_date = datetime.strptime(date_str, "%Y-%m-%d")

    for o in clean:
        ffs = o.get("fulfillments", [])
        if not ffs or o.get("fulfillment_status") is None:
            rem4 += 1
            rem7 += 1
        else:
            earliest = sorted(ffs, key=lambda f: f["created_at"])[0]
            ff_date = datetime.strptime(earliest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4:
                rem4 += 1
            if diff > 7:
                rem7 += 1

    rate4 = round(((total - rem4) / total) * 100, 2)
    rate7 = round(((total - rem7) / total) * 100, 2)

    parts = date_str.split("-")
    formatted = f"{int(parts[1])}/{int(parts[2])}/{parts[0]}"

    return {
        "date": formatted,
        "orders": total,
        "rem4": rem4,
        "rem7": rem7,
        "rate4": rate4,
        "rate7": rate7,
    }


def backfill_month(year, month, token):
    days_in_month = monthrange(year, month)[1]
    month_data = []
    month_name = datetime(year, month, 1).strftime("%B %Y")

    print(f"\n  {month_name} ({days_in_month} days)...", flush=True)

    for day in range(1, days_in_month + 1):
        date_str = f"{year}-{str(month).zfill(2)}-{str(day).zfill(2)}"

        display_count = get_order_count(token, date_str)
        time.sleep(0.5)

        orders = fetch_orders_day(token, date_str)
        kpi = compute_day_kpi(orders, date_str)

        if kpi:
            kpi["orders"] = display_count
            month_data.append(kpi)
            print(
                f"    {date_str}: {kpi['orders']} orders, "
                f"rate4={kpi['rate4']}%, rate7={kpi['rate7']}%",
                flush=True,
            )

    year_key = f"kpi-wholesale-{year}"
    read_cmd = (
        f'npx wrangler kv key get --namespace-id {KV_NAMESPACE_ID}'
        f' "{year_key}" --remote'
    )
    result = subprocess.run(
        read_cmd, cwd=WORKER_DIR, shell=True,
        capture_output=True, encoding="utf-8", errors="replace",
    )

    year_data = []
    if result.returncode == 0 and result.stdout.strip():
        try:
            year_data = json.loads(result.stdout)
        except json.JSONDecodeError:
            pass

    year_data = [
        d for d in year_data if int(d["date"].split("/")[0]) != month
    ]
    year_data.extend(month_data)
    year_data.sort(key=lambda d: (
        int(d["date"].split("/")[2]),
        int(d["date"].split("/")[0]),
        int(d["date"].split("/")[1]),
    ))

    print(f"  Writing {month_name} to KV...", end=" ", flush=True)
    if write_to_kv(year_key, json.dumps(year_data)):
        print("OK", flush=True)
    else:
        print("FAILED", flush=True)

    total_orders = sum(d["orders"] for d in month_data)
    print(f"  {month_name}: {len(month_data)} days, {total_orders} orders", flush=True)


def main():
    print("RCO WHOLESALE FULL BACKFILL: 2024 - Present")
    print("Store: wholesale-rowe-casa")
    print("READ-ONLY: Only GET requests to Shopify")
    print("=" * 50, flush=True)

    token = get_token()
    token_time = time.time()
    now = datetime.now()

    for year in [2024, 2025, 2026]:
        print(f"\n{'=' * 50}", flush=True)
        print(f"  YEAR: {year}", flush=True)
        print(f"{'=' * 50}", flush=True)

        max_month = 12 if year < now.year else now.month

        for month in range(1, max_month + 1):
            if time.time() - token_time > 72000:
                print("  Refreshing token...", flush=True)
                token = get_token()
                token_time = time.time()

            try:
                backfill_month(year, month, token)
            except Exception as e:
                print(f"\n  ERROR: {e}", flush=True)
                print("  Waiting 30s and retrying...", flush=True)
                time.sleep(30)
                try:
                    token = get_token()
                    token_time = time.time()
                    backfill_month(year, month, token)
                except Exception as e2:
                    print(f"  SKIPPING: {e2}", flush=True)
                    continue

    print(f"\n{'=' * 50}", flush=True)
    print("WHOLESALE BACKFILL COMPLETE!", flush=True)
    print(f"{'=' * 50}", flush=True)


if __name__ == "__main__":
    main()
