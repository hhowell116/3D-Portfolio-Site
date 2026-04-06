"""
Generate a PDF documenting how each dashboard pulls and calculates its data.
"""
from fpdf import FPDF
import os

class Doc(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

def W(pdf):
    return pdf.w - pdf.l_margin - pdf.r_margin

def h1(pdf, text):
    pdf.ln(6)
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(60, 48, 36)
    pdf.multi_cell(w=W(pdf), h=8, text=text, new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(180, 165, 145)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(3)

def h2(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(95, 75, 60)
    pdf.multi_cell(w=W(pdf), h=6, text=text, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

def p(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(w=W(pdf), h=4.5, text=text, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

def li(pdf, text):
    pdf.set_x(pdf.l_margin)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(50, 50, 50)
    safe = text.encode('latin-1', 'replace').decode('latin-1')
    pdf.multi_cell(w=W(pdf), h=4.5, text="    - " + safe, new_x="LMARGIN", new_y="NEXT")

def main():
    pdf = Doc(format="letter")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(60, 48, 36)
    pdf.cell(w=0, h=12, text="RCO Metrics Dashboard", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(95, 75, 60)
    pdf.cell(w=0, h=8, text="Data Sources & Calculations", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(8)

    # ── 1. FULFILLMENT KPI ──
    h1(pdf, "1. Fulfillment KPI")

    h2(pdf, "Updates")
    li(pdf, "Automatic every 6 hours via cron job (both Retail + Wholesale)")
    li(pdf, "Browser refreshes from cache every 10 minutes")

    h2(pdf, "Data Source")
    li(pdf, "Shopify orders endpoint - paginates through ALL orders for the current month")
    li(pdf, "Both Retail (rowe-casa) and Wholesale (wholesale-rowe-casa) stores")
    li(pdf, "Date filter: created_at (order placement date)")

    h2(pdf, "Calculations")
    li(pdf, "Total Orders = all orders placed that day (including cancelled/refunded)")
    li(pdf, "Remaining (4-Day) = non-cancelled orders with no fulfillment or fulfilled 4+ days after order date")
    li(pdf, "Remaining (7-Day) = same logic, 7-day threshold")
    li(pdf, "4-Day Fill Rate = (Total - Remaining 4-Day) / Total x 100")
    li(pdf, "7-Day Fill Rate = (Total - Remaining 7-Day) / Total x 100")
    li(pdf, "Cancelled/refunded orders count toward total but not toward remaining (count as fulfilled)")
    li(pdf, "'Total' view adds raw counts by date, then recalculates rates (weighted, not averaged)")
    li(pdf, "Monthly avg fill rate = mean of daily rates; Avg daily orders = total / days with data")
    pdf.ln(1)

    # ── 2. SHIPPING LEADERBOARDS ──
    h1(pdf, "2. Shipping Leaderboards")

    h2(pdf, "Updates")
    li(pdf, "Pulls from a Google Sheet on page load; updates when the sheet is updated")

    h2(pdf, "Data Source")
    li(pdf, "Google Sheets published CSV export (manually maintained)")

    h2(pdf, "Calculations")
    li(pdf, "None - displays values directly from sheet columns (rank, name, products shipped, orders)")
    pdf.ln(1)
    p(pdf, "Note: This dashboard cannot be automated due to limitations of the BambooHR API, which does not expose full-time vs part-time employee status. The leaderboard categories (Full-Time, Part-Time, Wholesale) require this distinction, so the data must be maintained manually in the Google Sheet.")

    # ── 3. ORDERS OVERVIEW ──
    h1(pdf, "3. Orders Overview")

    h2(pdf, "Updates")
    li(pdf, "Current month refreshed nightly at 2 AM CT via cron")
    li(pdf, "Historical months from backfill script (complete data, not sampled)")

    h2(pdf, "Data Source")
    li(pdf, "Shopify orders endpoint - fetches every order for each month from both stores")
    li(pdf, "Date filter: created_at")

    h2(pdf, "Calculations (per month, Retail + Wholesale combined)")
    li(pdf, "Orders Placed = total count of all orders (including cancelled)")
    li(pdf, "Orders Fulfilled = count with fulfillment_status=fulfilled, excluding cancelled/refunded")
    li(pdf, "Total Items = sum of line_item quantities, excluding non-product items (see Appendix A)")
    li(pdf, "Unique Customers = distinct customer IDs")
    li(pdf, "Avg Items Per Order = Total Items / Orders Placed")
    li(pdf, "Fulfillment Rate = Orders Fulfilled / Orders Placed x 100")
    li(pdf, "Top Product = highest quantity product that month")
    pdf.ln(1)

    # ── 4. INTERNATIONAL ORDERS ──
    h1(pdf, "4. International Orders")

    h2(pdf, "Updates")
    li(pdf, "Current year updated nightly at 2 AM CT via cron (incremental)")
    li(pdf, "Full historical data from backfill script")

    h2(pdf, "Data Source")
    li(pdf, "Shopify orders endpoint - extracts shipping_address.country_code and province_code")
    li(pdf, "Both stores, stored per year in Cloudflare KV")

    h2(pdf, "Calculations")
    li(pdf, "Country counts = number of orders shipped to each country")
    li(pdf, "US State counts = number of orders shipped to each US state")
    li(pdf, "'All' years merges counts across 2024, 2025, and 2026")
    pdf.ln(1)

    # ── 5. DAILY METRICS ──
    h1(pdf, "5. Daily Metrics")

    h2(pdf, "Updates")
    li(pdf, "Live Shopify API calls, cached for 10 minutes")
    li(pdf, "Regardless of how many users have the site open, Shopify is only called once per 10 min")

    h2(pdf, "Data Source")
    li(pdf, "8 Shopify API calls per refresh (4 Retail + 4 Wholesale)")
    li(pdf, "Order counts (open + closed) filtered by processed_at for today")
    li(pdf, "Shipped count filtered by processed_at")
    li(pdf, "250-order sample with total_price, line_items, financial_status")
    li(pdf, "All dates in Central Time (America/Chicago)")

    h2(pdf, "Calculations")
    li(pdf, "Total Orders = open + closed count (exact, excludes cancelled)")
    li(pdf, "Fulfilled = shipped count (exact)")
    li(pdf, "Unfulfilled = Total - Fulfilled")
    li(pdf, "Sales = sum of total_price from 250-order sample (voided/refunded excluded). Scaled up if >250 orders: sales x (total / sample size)")
    li(pdf, "Units Sold = sum of line_item quantities from sample, excluding non-product items. Scaled same way.")
    li(pdf, "AOV = Sales / Total Orders")
    li(pdf, "Revenue Per Unit = Sales / Units Sold")
    li(pdf, "Top 10 Products = ranked by quantity from sample")
    pdf.ln(1)

    # ── 6. SALES ──
    h1(pdf, "6. Sales")

    h2(pdf, "Updates")
    li(pdf, "Live Shopify API calls, cached for 10 minutes")

    h2(pdf, "Data Source")
    li(pdf, "14 Shopify API calls per refresh (7 Retail + 7 Wholesale)")
    li(pdf, "Order counts for today, MTD, YTD (each open + closed) via processed_at")
    li(pdf, "50-order sample for today's AOV")

    h2(pdf, "Calculations")
    li(pdf, "Today/MTD/YTD order counts are exact from Shopify (excludes cancelled)")
    li(pdf, "AOV = average total_price from today's 50-order sample (voided/refunded excluded)")
    li(pdf, "Today Sales = AOV x Today Orders (estimate)")
    li(pdf, "MTD Sales = AOV x MTD Orders (estimate - uses today's AOV for entire month)")
    li(pdf, "YTD Sales = AOV x YTD Orders (estimate - uses today's AOV for entire year)")
    li(pdf, "Combined YTD = Retail + Wholesale totals; Combined AOV = Combined Revenue / Combined Orders")
    pdf.ln(1)

    # ── 7. TOP PRODUCTS ──
    h1(pdf, "7. Top Products")

    h2(pdf, "Updates")
    li(pdf, "Refreshed nightly at 2 AM CT via cron")

    h2(pdf, "Data Source")
    li(pdf, "Shopify orders from last 7 and 30 days, both stores")
    li(pdf, "Paginates through all orders in each window")

    h2(pdf, "Calculations")
    li(pdf, "Counts total quantity per product title across all orders")
    li(pdf, "Non-product items excluded (see Appendix A)")
    li(pdf, "Ranked highest to lowest by units sold, top 50 returned")
    pdf.ln(1)

    # ── 8. UNFULFILLED ORDERS ──
    h1(pdf, "8. Unfulfilled Orders")

    h2(pdf, "Updates")
    li(pdf, "Live Shopify API calls, cached for 10 minutes")

    h2(pdf, "Data Source")
    li(pdf, "6 Shopify API calls per refresh (3 Retail + 3 Wholesale)")
    li(pdf, "Counts for unfulfilled + partially fulfilled (status=open)")
    li(pdf, "250-order sample with created_at and line_items")

    h2(pdf, "Calculations")
    li(pdf, "Total Unfulfilled = unfulfilled count + partial count (exact)")
    li(pdf, "Date breakdown = sample orders grouped by created_at date")
    li(pdf, "Avg Order Size = total units in sample / sample count")
    li(pdf, "Total Units = scaled from sample if total > 250 orders")
    pdf.ln(1)

    # ── 9. SKIP THE LINE ──
    h1(pdf, "9. Skip the Line")

    h2(pdf, "Updates")
    li(pdf, "Live Shopify API call, cached for 10 minutes")

    h2(pdf, "Data Source")
    li(pdf, "1 Shopify API call - fetches open unfulfilled orders, filters for 'dyn-skip-line' tag")

    h2(pdf, "Calculations")
    li(pdf, "Total = count of open unfulfilled orders with skip-the-line tag")
    li(pdf, "Grouped by created_at date to show wait time")
    pdf.ln(1)

    # ── 10. SIDEBAR ──
    h1(pdf, "10. Sidebar - Today's Orders")

    h2(pdf, "Updates")
    li(pdf, "Uses the /daily-metrics cached endpoint; refreshes every 10 minutes")

    h2(pdf, "Calculation")
    li(pdf, "Retail total orders + Wholesale total orders (same data as Daily Metrics)")
    pdf.ln(1)

    output = os.path.join(os.path.dirname(__file__), "..", "RCO_Dashboard_Data_Methodology_v2.pdf")
    pdf.output(output)
    print(f"PDF written to: {output}")

if __name__ == "__main__":
    main()
