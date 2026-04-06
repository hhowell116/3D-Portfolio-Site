"""
Backfill International Orders data from Shopify.
Computes country and US state order counts per year.
READ-ONLY: Only GET requests to Shopify.
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from calendar import monthrange
from zoneinfo import ZoneInfo
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


def fetch_month_geo(token, year, month, shop=None):
    """Fetch shipping address data for a month. GET only."""
    shop = shop or SHOPIFY_SHOP_RETAIL
    headers = {"X-Shopify-Access-Token": token}
    tz = ZoneInfo("America/Chicago")
    days = monthrange(year, month)[1]
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=tz)
    end = datetime(year, month, days, 23, 59, 59, tzinfo=tz)

    countries = {}
    us_states = {}

    url = (
        f"https://{shop}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={start.isoformat()}"
        f"&created_at_max={end.isoformat()}"
        f"&fields=id,shipping_address"
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
                    return countries, us_states

        for o in r.json().get("orders", []):
            addr = o.get("shipping_address") or {}
            cc = addr.get("country_code", "")
            if cc:
                countries[cc] = countries.get(cc, 0) + 1
                if cc == "US":
                    st = addr.get("province_code", "")
                    if st:
                        us_states[f"US-{st}"] = us_states.get(f"US-{st}", 0) + 1

        link = r.headers.get("Link", "")
        url = None
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split("<")[1].split(">")[0]
        time.sleep(0.5)

    return countries, us_states


def main():
    print("RCO International Orders Backfill — RETAIL + WHOLESALE")
    print("READ-ONLY: Only GET requests to Shopify")
    print("=" * 50, flush=True)

    retail_token = get_token()
    wholesale_token = get_wholesale_token()
    token_time = time.time()
    now = datetime.now()

    for year in [2024, 2025, 2026]:
        print(f"\n{'=' * 50}", flush=True)
        print(f"  YEAR: {year}", flush=True)
        print(f"{'=' * 50}", flush=True)

        year_countries = {}
        year_states = {}
        max_month = 12 if year < now.year else now.month

        for month in range(1, max_month + 1):
            month_name = datetime(year, month, 1).strftime("%B %Y")

            if time.time() - token_time > 72000:
                retail_token = get_token()
                wholesale_token = get_wholesale_token()
                token_time = time.time()

            # Retail
            print(f"  {month_name} (retail)...", end=" ", flush=True)
            try:
                rc, rs = fetch_month_geo(retail_token, year, month, SHOPIFY_SHOP_RETAIL)
                for k, v in rc.items():
                    year_countries[k] = year_countries.get(k, 0) + v
                for k, v in rs.items():
                    year_states[k] = year_states.get(k, 0) + v
                print(f"{sum(rc.values())} orders", flush=True)
            except Exception as e:
                print(f"ERROR: {e}", flush=True)
                try:
                    retail_token = get_token()
                    token_time = time.time()
                except:
                    pass

            # Wholesale
            print(f"  {month_name} (wholesale)...", end=" ", flush=True)
            try:
                wc, ws = fetch_month_geo(wholesale_token, year, month, SHOPIFY_SHOP_WHOLESALE)
                for k, v in wc.items():
                    year_countries[k] = year_countries.get(k, 0) + v
                for k, v in ws.items():
                    year_states[k] = year_states.get(k, 0) + v
                print(f"{sum(wc.values())} orders", flush=True)
            except Exception as e:
                print(f"ERROR: {e}", flush=True)
                try:
                    wholesale_token = get_wholesale_token()
                    token_time = time.time()
                except:
                    pass

        # Write year data to KV
        year_data = {"countries": year_countries, "usStates": year_states}
        print(f"\n  Writing {year} to KV...", end=" ", flush=True)
        if write_to_kv(f"intl-{year}", json.dumps(year_data)):
            print("OK", flush=True)
        else:
            print("FAILED", flush=True)

        total_orders = sum(year_countries.values())
        intl_orders = total_orders - year_countries.get("US", 0)
        print(f"  {year}: {total_orders} total, {intl_orders} international, "
              f"{len(year_countries)} countries, {len(year_states)} US states", flush=True)

    print(f"\n{'=' * 50}", flush=True)
    print("INTERNATIONAL BACKFILL COMPLETE (RETAIL + WHOLESALE)!", flush=True)
    print(f"{'=' * 50}", flush=True)


if __name__ == "__main__":
    main()
