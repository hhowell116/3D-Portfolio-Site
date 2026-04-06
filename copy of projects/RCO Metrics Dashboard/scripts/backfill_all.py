"""
Backfill ALL KPI data from 2024-present.
Runs each month sequentially to avoid Shopify rate limits.
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

SHOPIFY_SHOP = os.environ.get("SHOPIFY_SHOP")
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")
KV_NAMESPACE_ID = os.environ.get("RCO_KPI_NAMESPACE_ID")
WORKER_DIR = os.path.join(os.path.dirname(__file__), "..", "worker")

# Import functions from backfill.py
sys.path.insert(0, os.path.dirname(__file__))
from backfill import get_token, get_order_count, fetch_orders_day, compute_day_kpi, write_to_kv


def backfill_month(year, month, token):
    """Backfill a single month. Returns token (may refresh)."""
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

    # Read existing year data, merge
    year_key = f"kpi-retail-{year}"
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
    print("RCO FULL BACKFILL: 2024 - Present")
    print("READ-ONLY: Only GET requests to Shopify")
    print("=" * 50, flush=True)

    token = get_token()
    token_time = time.time()
    now = datetime.now()

    for year in [2024, 2025, 2026]:
        print(f"\n{'=' * 50}", flush=True)
        print(f"  YEAR: {year}", flush=True)
        print(f"{'=' * 50}", flush=True)

        max_month = 12
        if year == now.year:
            max_month = now.month

        for month in range(1, max_month + 1):
            # Skip 2026 months we already backfilled
            if year == 2026 and month <= 3:
                print(f"\n  Skipping {datetime(year, month, 1).strftime('%B %Y')} (already done)", flush=True)
                continue

            # Refresh token every 20 hours
            if time.time() - token_time > 72000:
                print("  Refreshing token...", flush=True)
                token = get_token()
                token_time = time.time()

            try:
                backfill_month(year, month, token)
            except Exception as e:
                print(f"\n  ERROR on {datetime(year, month, 1).strftime('%B %Y')}: {e}", flush=True)
                print("  Waiting 30s and retrying...", flush=True)
                time.sleep(30)
                try:
                    token = get_token()
                    token_time = time.time()
                    backfill_month(year, month, token)
                except Exception as e2:
                    print(f"  SKIPPING {datetime(year, month, 1).strftime('%B %Y')}: {e2}", flush=True)
                    continue

    print(f"\n{'=' * 50}", flush=True)
    print("FULL BACKFILL COMPLETE!", flush=True)
    print(f"{'=' * 50}", flush=True)


if __name__ == "__main__":
    main()
