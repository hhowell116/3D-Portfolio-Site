"""
KPI Backfill — fetches orders from Shopify locally, writes KPI data to Cloudflare KV.

READ-ONLY: Only makes GET requests to Shopify (plus one POST for OAuth token).
No credentials in this file — reads from scripts/.env

Usage:
  1. Fill in scripts/.env with your Shopify credentials
  2. python scripts/backfill.py
"""

import os
import sys
import json
import time
import subprocess
import tempfile
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


def get_token():
    """Get Shopify access token via client_credentials grant (only non-GET request)."""
    r = requests.post(
        f"https://{SHOPIFY_SHOP}.myshopify.com/admin/oauth/access_token",
        data={
            "grant_type": "client_credentials",
            "client_id": SHOPIFY_CLIENT_ID,
            "client_secret": SHOPIFY_CLIENT_SECRET,
        },
    )
    r.raise_for_status()
    print("  Shopify token acquired", flush=True)
    return r.json()["access_token"]


def get_order_count(token, date_str):
    """Get order count using processed_at in America/Chicago to match Shopify Analytics.
    READ-ONLY: GET only."""
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
    """Fetch all orders for a single day using created_at in America/Chicago.
    READ-ONLY: GET requests only."""
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
                r = requests.get(url, headers=headers, timeout=60)  # GET only
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

        # Pagination via Link header
        link = r.headers.get("Link", "")
        url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split("<")[1].split(">")[0]

        time.sleep(0.5)

    return orders


def compute_day_kpi(orders, date_str):
    """Compute fulfillment KPI for one day's orders.
    Order count: ALL orders (like Alisha does).
    Remaining: exclude cancelled + refunded, earliest fulfillment date."""
    if not orders:
        return None

    # Total count includes ALL orders (Alisha includes all)
    total = len(orders)
    if total == 0:
        return None

    # For remaining calculation, exclude cancelled and refunded/voided
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


def write_to_kv(key, value_json):
    """Write data to Cloudflare KV via wrangler CLI."""
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, dir=".", encoding="utf-8"
    )
    tmp.write(value_json)
    tmp.close()
    try:
        cmd = (
            f'npx wrangler kv key put --namespace-id {KV_NAMESPACE_ID}'
            f' "{key}" --path "{tmp.name}" --remote'
        )
        result = subprocess.run(
            cmd, cwd=WORKER_DIR, shell=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            encoding="utf-8", errors="replace",
        )
        if result.returncode != 0:
            print(f"    KV write error: {result.stderr[:200]}", flush=True)
            return False
        return True
    finally:
        os.unlink(tmp.name)


def backfill_month(year, month):
    """Backfill a single month."""
    token = get_token()
    days_in_month = monthrange(year, month)[1]
    month_data = []

    print(f"\n  Fetching {days_in_month} days...", flush=True)

    for day in range(1, days_in_month + 1):
        date_str = f"{year}-{str(month).zfill(2)}-{str(day).zfill(2)}"

        # Get order count via processed_at (matches Shopify Analytics)
        display_count = get_order_count(token, date_str)
        time.sleep(0.5)

        # Fetch actual orders via created_at (for fulfillment calculation)
        orders = fetch_orders_day(token, date_str)
        kpi = compute_day_kpi(orders, date_str)

        if kpi:
            # Override order count with the Analytics-matching count
            kpi["orders"] = display_count
            month_data.append(kpi)
            print(
                f"    {date_str}: {kpi['orders']} orders, "
                f"rate4={kpi['rate4']}%, rate7={kpi['rate7']}%",
                flush=True,
            )

    # Read existing year data from KV, merge this month in
    print(f"\n  Writing to KV...", end=" ", flush=True)

    year_key = f"kpi-retail-{year}"

    # Try to read existing year data
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

    # Remove old data for this month, add new
    year_data = [
        d for d in year_data if int(d["date"].split("/")[0]) != month
    ]
    year_data.extend(month_data)

    # Sort by date
    year_data.sort(key=lambda d: (
        int(d["date"].split("/")[2]),
        int(d["date"].split("/")[0]),
        int(d["date"].split("/")[1]),
    ))

    if write_to_kv(year_key, json.dumps(year_data)):
        print("OK", flush=True)
    else:
        print("FAILED", flush=True)

    total_orders = sum(d["orders"] for d in month_data)
    print(f"\n  Total: {len(month_data)} days, {total_orders} orders", flush=True)


if __name__ == "__main__":
    missing = []
    if not SHOPIFY_SHOP:
        missing.append("SHOPIFY_SHOP")
    if not SHOPIFY_CLIENT_ID:
        missing.append("SHOPIFY_CLIENT_ID")
    if not SHOPIFY_CLIENT_SECRET:
        missing.append("SHOPIFY_CLIENT_SECRET")
    if not KV_NAMESPACE_ID:
        missing.append("RCO_KPI_NAMESPACE_ID")

    if missing:
        print(f"Missing env vars in scripts/.env: {', '.join(missing)}")
        sys.exit(1)

    print("RCO KPI Backfill (Shopify -> Cloudflare KV)")
    print("READ-ONLY: Only GET requests to Shopify\n")

    year = int(input("Year [2026]: ").strip() or "2026")
    month = int(input("Month (1-12) [1]: ").strip() or "1")

    print(f"\nBackfilling {year}-{month:02d} (retail)...")
    backfill_month(year, month)
    print("\nDone!")
