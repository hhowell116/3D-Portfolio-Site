"""
Report: Customers who received Microderm Scrub between 3/24-3/27/2026
Pulls from both Retail and Wholesale Shopify stores.
"""
import os, requests, time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

RETAIL_SHOP = os.environ["SHOPIFY_SHOP"]
WHOLESALE_SHOP = "wholesale-rowe-casa"
CLIENT_ID = os.environ["SHOPIFY_CLIENT_ID"]
CLIENT_SECRET = os.environ["SHOPIFY_CLIENT_SECRET"]

def get_token(shop):
    r = requests.post(
        f"https://{shop}.myshopify.com/admin/oauth/access_token",
        data={"grant_type": "client_credentials", "client_id": CLIENT_ID, "client_secret": CLIENT_SECRET},
    )
    r.raise_for_status()
    return r.json()["access_token"]

def fetch_orders(shop, token, min_date, max_date):
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    orders = []
    url = (
        f"https://{shop}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={min_date}&created_at_max={max_date}"
        f"&fields=id,name,created_at,customer,line_items,fulfillment_status,fulfillments,shipping_address"
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
                    print(f"  FAILED: {e}")
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

def find_microderm_customers(orders, store_label):
    results = []
    for o in orders:
        # Check if any line item is a microderm scrub
        microderm_items = []
        for li in o.get("line_items", []):
            title = (li.get("title") or "").lower()
            if "microderm" in title:
                microderm_items.append({
                    "product": li.get("title"),
                    "variant": li.get("variant_title") or "",
                    "qty": li.get("quantity", 0),
                })
        if not microderm_items:
            continue

        cust = o.get("customer") or {}
        ship = o.get("shipping_address") or {}
        email = cust.get("email") or "N/A"
        first = cust.get("first_name") or ship.get("first_name") or ""
        last = cust.get("last_name") or ship.get("last_name") or ""
        name = f"{first} {last}".strip() or "N/A"

        results.append({
            "store": store_label,
            "order": o.get("name", ""),
            "date": o.get("created_at", "")[:10],
            "customer_name": name,
            "email": email,
            "fulfillment_status": o.get("fulfillment_status") or "unfulfilled",
            "items": microderm_items,
        })
    return results

def main():
    min_date = "2026-03-24T00:00:00-05:00"
    max_date = "2026-03-27T23:59:59-05:00"

    print("Fetching retail orders...", flush=True)
    retail_token = get_token(RETAIL_SHOP)
    retail_orders = fetch_orders(RETAIL_SHOP, retail_token, min_date, max_date)
    print(f"  {len(retail_orders)} total retail orders", flush=True)

    print("Fetching wholesale orders...", flush=True)
    wholesale_token = get_token(WHOLESALE_SHOP)
    wholesale_orders = fetch_orders(WHOLESALE_SHOP, wholesale_token, min_date, max_date)
    print(f"  {len(wholesale_orders)} total wholesale orders", flush=True)

    retail_results = find_microderm_customers(retail_orders, "Retail")
    wholesale_results = find_microderm_customers(wholesale_orders, "Wholesale")
    all_results = retail_results + wholesale_results
    all_results.sort(key=lambda x: x["date"])

    # Write report
    report_path = os.path.join(os.path.dirname(__file__), "..", "microderm_report_3_24_to_3_27.txt")
    with open(report_path, "w") as f:
        f.write("=" * 70 + "\n")
        f.write("MICRODERM SCRUB CUSTOMER REPORT\n")
        f.write(f"Date Range: March 24 - March 27, 2026\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write("=" * 70 + "\n\n")

        f.write(f"Total Orders with Microderm Scrub: {len(all_results)}\n")
        f.write(f"  Retail:    {len(retail_results)}\n")
        f.write(f"  Wholesale: {len(wholesale_results)}\n\n")

        f.write("-" * 70 + "\n")
        f.write(f"{'Order':<12} {'Date':<12} {'Store':<12} {'Customer':<25} {'Email':<30} {'Status':<14} {'Product / Qty'}\n")
        f.write("-" * 70 + "\n")

        for r in all_results:
            for i, item in enumerate(r["items"]):
                prefix = f"{r['order']:<12} {r['date']:<12} {r['store']:<12} {r['customer_name']:<25} {r['email']:<30} {r['fulfillment_status']:<14}" if i == 0 else " " * 82
                variant = f" ({item['variant']})" if item['variant'] else ""
                f.write(f"{prefix} {item['product']}{variant} x{item['qty']}\n")

        f.write("\n" + "=" * 70 + "\n")
        f.write("END OF REPORT\n")
        f.write("=" * 70 + "\n")

    print(f"\nReport written to: {report_path}")
    print(f"  {len(all_results)} orders with Microderm Scrub found")

if __name__ == "__main__":
    main()
