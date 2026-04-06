"""
Report: Customers who received Microderm Scrub between 3/24-3/27/2026
Pulls from both Retail and Wholesale Shopify stores. Outputs a basic PDF.
"""
import os, requests, time
from datetime import datetime
from fpdf import FPDF
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
        f"&fields=id,name,created_at,customer,line_items,fulfillment_status,shipping_address"
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
        for li in o.get("line_items", []):
            if "microderm" in (li.get("title") or "").lower():
                cust = o.get("customer") or {}
                ship = o.get("shipping_address") or {}
                first = cust.get("first_name") or ship.get("first_name") or ""
                last = cust.get("last_name") or ship.get("last_name") or ""
                results.append({
                    "store": store_label,
                    "order": o.get("name", ""),
                    "date": o.get("created_at", "")[:10],
                    "name": f"{first} {last}".strip() or "N/A",
                    "email": cust.get("email") or "N/A",
                    "qty": li.get("quantity", 0),
                })
                break
    return results

def main():
    min_date = "2026-03-24T00:00:00-05:00"
    max_date = "2026-03-27T23:59:59-05:00"

    print("Fetching retail orders...", flush=True)
    rt = get_token(RETAIL_SHOP)
    retail = find_microderm_customers(fetch_orders(RETAIL_SHOP, rt, min_date, max_date), "Retail")
    print(f"  {len(retail)} retail microderm orders", flush=True)

    print("Fetching wholesale orders...", flush=True)
    wt = get_token(WHOLESALE_SHOP)
    wholesale = find_microderm_customers(fetch_orders(WHOLESALE_SHOP, wt, min_date, max_date), "Wholesale")
    print(f"  {len(wholesale)} wholesale microderm orders", flush=True)

    all_results = sorted(retail + wholesale, key=lambda x: x["date"])

    pdf = FPDF(orientation="L", format="letter")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Microderm Scrub Customer Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Date Range: March 24 - March 27, 2026", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Total: {len(all_results)}  |  Retail: {len(retail)}  |  Wholesale: {len(wholesale)}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 9)
    for r in all_results:
        line = f"{r['order']}  |  {r['date']}  |  {r['store']}  |  {r['name']}  |  {r['email']}  |  Qty: {r['qty']}"
        pdf.cell(0, 5.5, line, new_x="LMARGIN", new_y="NEXT")

    output_path = os.path.join(os.path.dirname(__file__), "..", "Microderm_Scrub_Report_3-24_to_3-27.pdf")
    pdf.output(output_path)
    print(f"\nPDF written to: {output_path}")

if __name__ == "__main__":
    main()
