"""Download and normalize the Kaggle Amazon Products Dataset 2023.

Dataset: lokeshparab/amazon-products-dataset
Uses kagglehub.dataset_download(), so Kaggle handles the download/cache.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import sys
from pathlib import Path

DATASET = "lokeshparab/amazon-products-dataset"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "products.json"
# Keep the local app catalog responsive while preserving broad ecommerce coverage.
MAX_PRODUCTS = 24000
MAX_PER_CATEGORY = 1200


def clean(value) -> str:
    return str(value or "").strip()


def key(value) -> str:
    return re.sub(r"[^a-z0-9]+", "_", clean(value).lower()).strip("_")


def parse_money(value):
    s = clean(value)
    if not s or s.lower() in {"nan", "none", "null", "-", "n/a"}:
        return None
    # Dataset uses strings such as ₹1,299, $19.99, or 1,299.
    s = s.replace("₹", "").replace("$", "").replace("€", "").replace("£", "")
    s = re.sub(r"[^0-9.]", "", s)
    try:
        return float(s) if s else None
    except ValueError:
        return None


def parse_rating(value):
    s = clean(value)
    if not s:
        return 0.0
    s = re.sub(r"[^0-9.]", "", s)
    try:
        n = float(s)
        return n if 0 <= n <= 5 else 0.0
    except ValueError:
        return 0.0


def parse_count(value):
    s = clean(value)
    s = re.sub(r"[^0-9]", "", s)
    try:
        return int(s) if s else 0
    except ValueError:
        return 0


def find_col(headers, *names):
    normalized = {key(h): h for h in headers}
    for name in names:
        k = key(name)
        if k in normalized:
            return normalized[k]
    return None


def category_slug(main, sub):
    value = sub or main or "other"
    value = clean(value).lower()
    # Preserve meaningful phrases for the agent while making a stable category key.
    if "shoe" in value or "footwear" in value:
        return "shoes"
    if "laptop" in value or "computer" in value:
        return "laptops"
    if "mobile" in value or "smartphone" in value or "phone" in value:
        return "smartphones"
    if "tablet" in value:
        return "tablets"
    if "watch" in value:
        return "watches"
    if "camera" in value:
        return "cameras"
    if "headphone" in value or "earbud" in value or "audio" in value:
        return "audio"
    if "furniture" in value or any(x in value for x in ("sofa", "chair", "table", "bed")):
        return "furniture"
    if "beauty" in value or "skin" in value or "makeup" in value or "fragrance" in value:
        return "beauty"
    if "toy" in value or "game" in value:
        return "toys"
    if "sport" in value or "fitness" in value:
        return "sports"
    if "kitchen" in value or "appliance" in value:
        return "kitchen"
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-") or "other"


def stable_stock(product_id: str) -> int:
    # Stock is not a live field in this dataset. Keep the existing UI functional
    # with a deterministic demo availability value and mark it synthetic.
    n = int(hashlib.sha1(product_id.encode()).hexdigest()[:8], 16)
    return 5 + (n % 46)


def normalize_row(row):
    headers = list(row.keys())
    name_col = find_col(headers, "name", "product_name", "product")
    if not name_col:
        return None
    name = clean(row.get(name_col))
    if not name:
        return None

    main_col = find_col(headers, "main_category", "main category", "category")
    sub_col = find_col(headers, "sub_category", "sub category", "subcategory")
    image_col = find_col(headers, "image", "image_url")
    link_col = find_col(headers, "link", "product_link", "url")
    rating_col = find_col(headers, "ratings", "rating")
    rating_count_col = find_col(headers, "no_of_ratings", "no of ratings", "rating_count")
    discount_col = find_col(headers, "discount_price", "discount price", "sale_price", "price")
    actual_col = find_col(headers, "actual_price", "actual price", "mrp", "list_price")

    main = clean(row.get(main_col)) if main_col else ""
    sub = clean(row.get(sub_col)) if sub_col else ""
    price = parse_money(row.get(discount_col)) if discount_col else None
    if price is None:
        price = parse_money(row.get(actual_col)) if actual_col else None
    if price is None or price <= 0:
        return None

    rating = parse_rating(row.get(rating_col)) if rating_col else 0.0
    rating_count = parse_count(row.get(rating_count_col)) if rating_count_col else 0
    image = clean(row.get(image_col)) if image_col else ""
    link = clean(row.get(link_col)) if link_col else ""

    # Prefer the dataset's own stable product link when available.
    raw_id = link or f"{name}|{main}|{sub}"
    product_id = hashlib.sha1(raw_id.encode("utf-8", "ignore")).hexdigest()[:16]

    category = category_slug(main, sub)
    product_type = sub or main
    keywords = " ".join(x for x in (main, sub, name) if x)
    actual_price = round(parse_money(row.get(actual_col)) or price) if actual_col else round(price)
    discount_price = round(price)
    discount_amount = max(0, actual_price - discount_price)
    discount_percent = round((discount_amount / actual_price) * 100) if actual_price > 0 else 0

    return {
        "id": product_id,
        "name": name,
        "category": category,
        "price": round(price),
        "rating": round(rating, 1),
        "stock": stable_stock(product_id),
        "image": image,
        "attributes": {
            "source": "Kaggle Amazon Products Dataset 2023",
            "dataset": DATASET,
            "marketplace": "Amazon",
            "mainCategory": main,
            "subCategory": sub,
            "productType": product_type,
            "ratingCount": rating_count,
            "actualPrice": actual_price,
            "discountPrice": discount_price,
            "discountAmount": discount_amount,
            "discountPercent": discount_percent,
            "productLink": link,
            "keywords": keywords,
            "syntheticStock": True,
        },
        "relatedProducts": [],
        "description": (
            f"{name}. Category: {main}{(' / ' + sub) if sub else ''}. "
            "Price and rating come from the Kaggle Amazon Products Dataset 2023; "
            "stock is a deterministic demo value because the dataset is not a live inventory feed."
        ),
    }


def main():
    try:
        import kagglehub
    except ImportError:
        print("kagglehub is not installed.")
        print("Run: python -m pip install kagglehub")
        sys.exit(1)

    print(f"Downloading Kaggle dataset: {DATASET}")
    path = Path(kagglehub.dataset_download(DATASET))
    print(f"Kaggle dataset path: {path}")

    csv_files = sorted(path.rglob("*.csv"))
    if not csv_files:
        raise RuntimeError(f"No CSV files found under {path}")
    print(f"Found {len(csv_files)} CSV file(s). Processing...")

    products = []
    seen = set()
    category_counts = {}
    for csv_file in csv_files:
        print(f"  {csv_file.name}")
        with csv_file.open("r", encoding="utf-8-sig", newline="", errors="replace") as fh:
            reader = csv.DictReader(fh)
            if not reader.fieldnames:
                continue
            for row in reader:
                product = normalize_row(row)
                if product and product["id"] not in seen:
                    cat = product["category"]
                    if category_counts.get(cat, 0) >= MAX_PER_CATEGORY or len(products) >= MAX_PRODUCTS:
                        continue
                    seen.add(product["id"])
                    category_counts[cat] = category_counts.get(cat, 0) + 1
                    products.append(product)
                    if len(products) >= MAX_PRODUCTS:
                        break
        if len(products) >= MAX_PRODUCTS:
            break

    if not products:
        raise RuntimeError("No usable products were found. Check the downloaded Kaggle files/columns.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as fh:
        json.dump(products, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"\nCatalog ready: {len(products):,} products (capped for app performance; source dataset remains available in Kaggle cache)")
    print(f"Saved to: {OUT}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nKaggle catalog import failed: {exc}")
        sys.exit(1)
