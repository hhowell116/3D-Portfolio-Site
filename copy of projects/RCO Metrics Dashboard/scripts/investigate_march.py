"""
Deep investigation: March 2026 retail orders.
Tests every method to match Alisha's data.
READ-ONLY: Only GET requests.
"""

import os
import time
import json
import requests
from datetime import datetime, timedelta
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SHOPIFY_SHOP = os.environ.get("SHOPIFY_SHOP")
SHOPIFY_CLIENT_ID = os.environ.get("SHOPIFY_CLIENT_ID")
SHOPIFY_CLIENT_SECRET = os.environ.get("SHOPIFY_CLIENT_SECRET")

# Alisha's March 2026 data: {day: (orders, rem4, rem7)}
ALISHA = {
    1: (1393, 0, 0), 2: (1232, 0, 0), 3: (2423, 0, 0),
    4: (1216, 0, 0), 5: (1225, 0, 1), 6: (1088, 0, 0),
    7: (988, 0, 0), 8: (1676, 0, 0), 9: (1776, 0, 0),
    10: (1040, 0, 0), 11: (1254, 0, 0), 12: (1170, 1, 0),
    13: (1115, 0, 0), 14: (1071, 0, 0), 15: (1342, 0, 0),
    16: (1074, 0, 0), 17: (1023, 0, 0), 18: (1032, 0, 0),
    19: (974, 0, 0), 20: (1008, 0, 0), 21: (861, 0, 0),
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
    """Fetch ALL order details for a single day. GET only."""
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    orders = []

    url = (
        f"https://{SHOPIFY_SHOP}.myshopify.com/admin/api/2024-10/orders.json"
        f"?status=any&limit=250"
        f"&created_at_min={date_str}T00:00:00-06:00"
        f"&created_at_max={date_str}T23:59:59-06:00"
        f"&fields=id,name,created_at,fulfillment_status,fulfillments,cancelled_at,financial_status,source_name,tags"
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
                if attempt < 2:
                    time.sleep(5)
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


def analyze_day(orders, date_str, day):
    """Analyze a day's orders in every way possible."""
    a_orders, a_rem4, a_rem7 = ALISHA[day]
    order_date = datetime.strptime(date_str, "%Y-%m-%d")
    check_4d = order_date + timedelta(days=4)
    check_7d = order_date + timedelta(days=7)

    total = len(orders)

    # Categorize every order
    cancelled = []
    refunded = []
    unfulfilled = []
    partial = []
    fulfilled = []

    for o in orders:
        is_cancelled = o.get("cancelled_at") is not None
        fin_status = o.get("financial_status", "")
        ff_status = o.get("fulfillment_status")
        ffs = o.get("fulfillments", [])

        if is_cancelled:
            cancelled.append(o)
        elif fin_status in ("refunded", "voided"):
            refunded.append(o)
        elif ff_status is None and not ffs:
            unfulfilled.append(o)
        elif ff_status == "partial":
            partial.append(o)
        else:
            fulfilled.append(o)

    # Method A: All orders, Shopify fulfillment dates
    rem4_a, rem7_a = 0, 0
    for o in orders:
        ffs = o.get("fulfillments", [])
        if not ffs or o.get("fulfillment_status") is None:
            rem4_a += 1
            rem7_a += 1
        else:
            earliest = sorted(ffs, key=lambda f: f["created_at"])[0]
            ff_date = datetime.strptime(earliest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4: rem4_a += 1
            if diff > 7: rem7_a += 1

    # Method B: Exclude cancelled, Shopify fulfillment dates
    non_cancelled = [o for o in orders if o.get("cancelled_at") is None]
    rem4_b, rem7_b = 0, 0
    for o in non_cancelled:
        ffs = o.get("fulfillments", [])
        if not ffs or o.get("fulfillment_status") is None:
            rem4_b += 1
            rem7_b += 1
        else:
            earliest = sorted(ffs, key=lambda f: f["created_at"])[0]
            ff_date = datetime.strptime(earliest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4: rem4_b += 1
            if diff > 7: rem7_b += 1

    # Method C: Exclude cancelled + refunded
    clean = [o for o in orders if o.get("cancelled_at") is None and o.get("financial_status") not in ("refunded", "voided")]
    rem4_c, rem7_c = 0, 0
    for o in clean:
        ffs = o.get("fulfillments", [])
        if not ffs or o.get("fulfillment_status") is None:
            rem4_c += 1
            rem7_c += 1
        else:
            earliest = sorted(ffs, key=lambda f: f["created_at"])[0]
            ff_date = datetime.strptime(earliest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4: rem4_c += 1
            if diff > 7: rem7_c += 1

    # Method D: All orders, use LATEST fulfillment date instead of earliest
    rem4_d, rem7_d = 0, 0
    for o in orders:
        ffs = o.get("fulfillments", [])
        if not ffs or o.get("fulfillment_status") is None:
            rem4_d += 1
            rem7_d += 1
        else:
            latest = sorted(ffs, key=lambda f: f["created_at"])[-1]
            ff_date = datetime.strptime(latest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4: rem4_d += 1
            if diff > 7: rem7_d += 1

    # Method E: Exclude cancelled, use LATEST fulfillment
    rem4_e, rem7_e = 0, 0
    for o in non_cancelled:
        ffs = o.get("fulfillments", [])
        if not ffs or o.get("fulfillment_status") is None:
            rem4_e += 1
            rem7_e += 1
        else:
            latest = sorted(ffs, key=lambda f: f["created_at"])[-1]
            ff_date = datetime.strptime(latest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4: rem4_e += 1
            if diff > 7: rem7_e += 1

    # Method F: Exclude cancelled, check if FULLY fulfilled (fulfillment_status == "fulfilled")
    rem4_f, rem7_f = 0, 0
    for o in non_cancelled:
        ff_status = o.get("fulfillment_status")
        ffs = o.get("fulfillments", [])

        if ff_status != "fulfilled":
            # Not fully fulfilled = remaining
            rem4_f += 1
            rem7_f += 1
        else:
            # Fully fulfilled - check when
            latest = sorted(ffs, key=lambda f: f["created_at"])[-1]
            ff_date = datetime.strptime(latest["created_at"][:10], "%Y-%m-%d")
            diff = (ff_date - order_date).days
            if diff > 4: rem4_f += 1
            if diff > 7: rem7_f += 1

    # Identify what the "remaining" orders actually are
    remaining_details = []
    for o in orders:
        ffs = o.get("fulfillments", [])
        ff_status = o.get("fulfillment_status")
        is_cancelled = o.get("cancelled_at") is not None
        fin = o.get("financial_status", "")

        if not ffs or ff_status is None:
            remaining_details.append({
                "name": o.get("name"),
                "cancelled": is_cancelled,
                "financial": fin,
                "ff_status": ff_status,
                "source": o.get("source_name"),
                "tags": o.get("tags", ""),
            })

    return {
        "total": total,
        "cancelled": len(cancelled),
        "refunded": len(refunded),
        "unfulfilled": len(unfulfilled),
        "partial": len(partial),
        "fulfilled": len(fulfilled),
        "methods": {
            "A_all_earliest": (rem4_a, rem7_a),
            "B_excl_canc_earliest": (rem4_b, rem7_b),
            "C_excl_canc_ref_earliest": (rem4_c, rem7_c),
            "D_all_latest": (rem4_d, rem7_d),
            "E_excl_canc_latest": (rem4_e, rem7_e),
            "F_excl_canc_fully_fulfilled": (rem4_f, rem7_f),
        },
        "remaining_orders": remaining_details,
    }


def main():
    print("DEEP INVESTIGATION: March 2026 Retail", flush=True)
    print("READ-ONLY: Only GET requests to Shopify\n", flush=True)

    token = get_token()
    print("Token acquired\n", flush=True)

    # Track scores for each method
    method_names = [
        "A_all_earliest", "B_excl_canc_earliest", "C_excl_canc_ref_earliest",
        "D_all_latest", "E_excl_canc_latest", "F_excl_canc_fully_fulfilled",
    ]
    scores = {m: {"orders": 0, "rem4": 0, "rem7": 0} for m in method_names}

    for day in range(1, 22):
        date_str = f"2026-03-{str(day).zfill(2)}"
        a_orders, a_rem4, a_rem7 = ALISHA[day]

        print(f"Mar {day} (Alisha: {a_orders} orders, rem4={a_rem4}, rem7={a_rem7})", flush=True)

        orders = fetch_orders_day(token, date_str)
        result = analyze_day(orders, date_str, day)

        print(f"  Shopify: {result['total']} total | "
              f"{result['cancelled']} cancelled | {result['refunded']} refunded | "
              f"{result['unfulfilled']} unfulfilled | {result['partial']} partial | "
              f"{result['fulfilled']} fulfilled", flush=True)

        # Show each method's results
        for m in method_names:
            r4, r7 = result["methods"][m]
            m4 = "Y" if r4 == a_rem4 else ""
            m7 = "Y" if r7 == a_rem7 else ""
            print(f"    {m:<35} rem4={r4:<4} {m4:<2} rem7={r7:<4} {m7}", flush=True)

            if r4 == a_rem4: scores[m]["rem4"] += 1
            if r7 == a_rem7: scores[m]["rem7"] += 1

        # Show details of unfulfilled orders
        if result["remaining_orders"]:
            print(f"  Unfulfilled orders:", flush=True)
            for ro in result["remaining_orders"][:10]:
                print(f"    {ro['name']}: cancelled={ro['cancelled']}, "
                      f"financial={ro['financial']}, source={ro['source']}, "
                      f"tags={ro['tags'][:50]}", flush=True)
            if len(result["remaining_orders"]) > 10:
                print(f"    ... and {len(result['remaining_orders'])-10} more", flush=True)

        print(flush=True)

    # Final scores
    print(f"\n{'='*70}", flush=True)
    print(f"FINAL SCORES (out of 21 days):", flush=True)
    print(f"{'='*70}", flush=True)
    print(f"{'Method':<35} {'Rem4':>6} {'Rem7':>6}", flush=True)
    print(f"{'-'*35} {'-'*6} {'-'*6}", flush=True)
    for m in method_names:
        print(f"{m:<35} {scores[m]['rem4']:>5}/21 {scores[m]['rem7']:>5}/21", flush=True)

    print("\nDone!", flush=True)


if __name__ == "__main__":
    main()
