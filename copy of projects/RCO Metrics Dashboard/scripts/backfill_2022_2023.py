"""
Backfill Orders Overview + International for 2022-2023 only.
Merges into existing KV data without overwriting 2024-2026.
"""
import os, sys, json, time, requests
from datetime import datetime
from calendar import monthrange
from zoneinfo import ZoneInfo
from collections import Counter
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

RETAIL_SHOP = os.environ["SHOPIFY_SHOP"]
WHOLESALE_SHOP = "wholesale-rowe-casa"
CLIENT_ID = os.environ["SHOPIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SHOPIFY_CLIENT_SECRET"]

sys.path.insert(0, os.path.dirname(__file__))
from backfill import write_to_kv

BLACKLIST = ["shipping protection", "navidium", "10% off", "new customer card",
             "discount card", "gift card", "skip the line", "heat sensitive info card"]
KV_NS = os.environ["RCO_KPI_NAMESPACE_ID"]
WORKER_DIR = os.path.join(os.path.dirname(__file__), "..", "worker")

def get_token(shop):
    r = requests.post(f"https://{shop}.myshopify.com/admin/oauth/access_token",
        data={"grant_type": "client_credentials", "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET})
    r.raise_for_status()
    return r.json()["access_token"]

def fetch_month(token, year, month, shop, fields):
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    tz = ZoneInfo("America/Chicago")
    days = monthrange(year, month)[1]
    start = datetime(year, month, 1, 0, 0, 0, tzinfo=tz)
    end = datetime(year, month, days, 23, 59, 59, tzinfo=tz)
    orders = []
    url = (f"https://{shop}.myshopify.com/admin/api/2024-10/orders.json"
           f"?status=any&limit=250&created_at_min={start.isoformat()}&created_at_max={end.isoformat()}&fields={fields}")
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
                if attempt < 2: time.sleep((attempt+1)*5)
                else:
                    print(f"    FAILED: {e}", flush=True)
                    return orders
        data = r.json()
        orders.extend(data.get("orders", []))
        url = None
        link = r.headers.get("Link", "")
        if 'rel="next"' in link:
            for part in link.split(","):
                if 'rel="next"' in part:
                    url = part.split("<")[1].split(">")[0]
        time.sleep(0.5)
    return orders

def main():
    import subprocess

    print("BACKFILL 2022-2023: Orders Overview + International")
    print("=" * 50, flush=True)

    rt = get_token(RETAIL_SHOP)
    wt = get_token(WHOLESALE_SHOP)
    print("Tokens acquired", flush=True)
    token_time = time.time()

    # Load existing orders overview from KV
    print("\nLoading existing Orders Overview from KV...", flush=True)
    result = subprocess.run(
        f'npx wrangler kv key get --namespace-id {KV_NS} "orders-overview" --remote',
        cwd=WORKER_DIR, shell=True, capture_output=True, encoding="utf-8", errors="replace")
    existing_overview = json.loads(result.stdout) if result.returncode == 0 and result.stdout.strip() else []
    print(f"  {len(existing_overview)} existing months", flush=True)

    new_summaries = []
    intl_by_year = {}

    for year in [2022, 2023]:
        print(f"\n{'='*50}\n  YEAR: {year}\n{'='*50}", flush=True)
        countries = {}
        us_states = {}

        for month in range(1, 13):
            month_name = datetime(year, month, 1).strftime("%B %Y")
            print(f"\n  {month_name}...", flush=True)

            if time.time() - token_time > 72000:
                rt = get_token(RETAIL_SHOP)
                wt = get_token(WHOLESALE_SHOP)
                token_time = time.time()

            # Orders Overview data
            print(f"    Retail (overview)...", end=" ", flush=True)
            r_orders = fetch_month(rt, year, month, RETAIL_SHOP,
                "id,fulfillment_status,customer,line_items,cancelled_at,financial_status")
            print(f"{len(r_orders)} orders", flush=True)

            print(f"    Wholesale (overview)...", end=" ", flush=True)
            w_orders = fetch_month(wt, year, month, WHOLESALE_SHOP,
                "id,fulfillment_status,customer,line_items,cancelled_at,financial_status")
            print(f"{len(w_orders)} orders", flush=True)

            all_orders = r_orders + w_orders
            active = [o for o in all_orders if not o.get("cancelled_at")
                      and o.get("financial_status") not in ("refunded", "voided")]
            total_placed = len(all_orders)
            total_fulfilled = sum(1 for o in active if o.get("fulfillment_status") == "fulfilled")
            total_items = 0
            product_counts = Counter()
            customer_ids = set()
            for o in all_orders:
                cust = o.get("customer")
                if cust and cust.get("id"): customer_ids.add(cust["id"])
                for li in o.get("line_items", []):
                    tl = (li.get("title") or "").lower()
                    if any(b in tl for b in BLACKLIST): continue
                    qty = li.get("quantity", 0)
                    total_items += qty
                    product_counts[li.get("title", "Unknown")] += qty

            top_product = product_counts.most_common(1)[0][0] if product_counts else "N/A"
            ff_rate = f"{round(total_fulfilled / max(total_placed,1) * 100, 1)}%"

            new_summaries.append({
                "month": datetime(year, month, 1).strftime("%B"),
                "year": year,
                "ordersPlaced": total_placed,
                "ordersFulfilled": total_fulfilled,
                "totalItems": total_items,
                "uniqueCustomers": len(customer_ids),
                "avgItemsPerOrder": round(total_items / max(total_placed,1), 2),
                "fulfillmentRate": ff_rate,
                "topProduct": top_product,
                "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M"),
            })
            print(f"    COMBINED: {total_placed} orders, {total_fulfilled} fulfilled, top: {top_product[:30]}", flush=True)

            # International data (from same orders + geo fetch)
            print(f"    Retail (intl)...", end=" ", flush=True)
            r_geo = fetch_month(rt, year, month, RETAIL_SHOP, "id,shipping_address")
            print(f"{len(r_geo)}", flush=True)

            print(f"    Wholesale (intl)...", end=" ", flush=True)
            w_geo = fetch_month(wt, year, month, WHOLESALE_SHOP, "id,shipping_address")
            print(f"{len(w_geo)}", flush=True)

            for o in r_geo + w_geo:
                addr = o.get("shipping_address")
                if not addr: continue
                cc = addr.get("country_code")
                if cc: countries[cc] = countries.get(cc, 0) + 1
                if cc == "US" and addr.get("province_code"):
                    st = f"US-{addr['province_code']}"
                    us_states[st] = us_states.get(st, 0) + 1

        intl_by_year[year] = {"countries": countries, "usStates": us_states}
        print(f"\n  {year} International: {sum(countries.values())} orders, {len(countries)} countries", flush=True)

    # Merge orders overview: add new months, keep existing 2024-2026
    existing_overview = [m for m in existing_overview if m.get("year", 0) >= 2024]
    all_overview = new_summaries + existing_overview
    all_overview.sort(key=lambda m: (m["year"], datetime.strptime(m["month"], "%B").month))

    print(f"\nWriting Orders Overview ({len(all_overview)} months)...", end=" ", flush=True)
    if write_to_kv("orders-overview", json.dumps(all_overview)):
        print("OK", flush=True)
    else:
        print("FAILED", flush=True)

    # Write international data per year
    for year, data in intl_by_year.items():
        print(f"Writing International {year}...", end=" ", flush=True)
        if write_to_kv(f"intl-{year}", json.dumps(data)):
            print("OK", flush=True)
        else:
            print("FAILED", flush=True)

    total = sum(m["ordersPlaced"] for m in all_overview)
    print(f"\n{'='*50}")
    print(f"DONE! Total orders across all months: {total:,}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
