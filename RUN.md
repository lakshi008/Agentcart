# AgentCart — Kaggle Amazon Catalog Edition

AgentCart keeps the existing shopping-agent UI, authentication, cart, policy, approval, Razorpay checkout, recommendation and conversation flows. The product catalog is now built from the **Kaggle Amazon Products Dataset 2023** (`lokeshparab/amazon-products-dataset`) using `kagglehub`.

## What changed

- Replaced the previous ABO catalog importer with the Kaggle dataset requested for the project.
- Uses `kagglehub.dataset_download("lokeshparab/amazon-products-dataset")` to download the latest dataset files.
- Normalizes the dataset into the existing AgentCart `Product` shape.
- Keeps Amazon-style product names, categories, images, links, ratings and discount/actual prices from the dataset.
- Shopping retrieval applies **hard constraints before ranking**: product type, category, maximum budget and availability.
- Product-information questions still use the same catalog and remember the last discussed product for follow-ups.
- Razorpay checkout and `.env.local` are preserved.

## Dataset

Kaggle dataset: https://www.kaggle.com/datasets/lokeshparab/amazon-products-dataset

The dataset is described as a 2023 Amazon product sales/catalog dataset with product names, main/sub categories, images, Amazon links, ratings, rating counts, discount prices and actual prices. It is a scraped snapshot, **not live Amazon inventory**. Third-party descriptions of the dataset document these fields and its broad category coverage.

Do not describe the catalog as live Amazon stock or current Amazon pricing. The dataset is a historical snapshot. The AgentCart `stock` field is a deterministic demo availability value because the dataset does not provide live inventory.

## Setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Install Python + kagglehub

You need Python 3 and the KaggleHub package:

```bash
python -m pip install kagglehub
```

If `python` is not recognized on Windows, install Python from python.org and make sure **Add Python to PATH** is enabled.

### 3. Kaggle authentication

For public datasets, KaggleHub may be able to download the dataset without extra configuration. If Kaggle asks for authentication, configure Kaggle credentials using Kaggle's normal authentication flow before running the importer.

### 4. Download and normalize the catalog

```bash
npm run fetch-kaggle
npm run verify-catalog
```

This runs the equivalent of:

```python
import kagglehub
path = kagglehub.dataset_download("lokeshparab/amazon-products-dataset")
print("Path to dataset files:", path)
```

The importer scans the downloaded directory for CSV files and writes the normalized catalog to:

```text
data/products.json
```

You only need to run the download/import when you want to refresh the catalog. The app itself does **not** download from Kaggle during `npm run dev` or `npm run build`.

### 5. Start AgentCart

```bash
npm run dev
```

## Razorpay

Your existing Razorpay checkout is preserved. Keep your existing `.env.local` values:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```

Never commit a real Razorpay secret to Git or expose it through a `NEXT_PUBLIC_` variable.

## How shopping works

```text
User request
    ↓
Intent extraction
    ↓
Kaggle Amazon catalog retrieval
    ↓
HARD FILTERS
    ├── product type
    ├── category
    ├── budget
    └── availability
    ↓
Ranking
    ├── preferences
    ├── rating
    └── relevance
    ↓
Existing AgentCart UI / cart / policy / Razorpay
```

A product that violates a hard requirement is rejected **before** ranking. For example, a shirt cannot win a request for running shoes merely because it is cheaper or has a higher rating.

## Product information questions

Examples:

- `Tell me about this laptop`
- `What is the rating?`
- `What is the price?`
- `What category is it?`
- `What brand is it?`

After discussing a product, follow-ups such as `what is the price?` remain attached to that product.

## Important catalog limitation

This Kaggle dataset is a historical scraped snapshot rather than a live commerce API. Prices and ratings are dataset values from the snapshot; stock is synthetic in AgentCart. Product links point to the URLs included by the dataset when present. Do not represent the catalog as real-time Amazon availability.

## Useful commands

```bash
npm run dev
npm run build
npm run lint
npm run fetch-kaggle
npm run fetch-catalog
npm run verify-catalog
```

## Main files

```text
lib/catalog.ts          catalog retrieval + hard constraints
lib/intent.ts           intent extraction
lib/recommendation.ts   ranking after hard filtering
lib/product-info.ts     product-information answers
lib/agent.ts            shopping/info orchestration
scripts/fetch-kaggle.py KaggleHub downloader + CSV normalizer
data/products.json      normalized catalog
.env.local              Razorpay/LLM configuration
```

## Dataset attribution

Kaggle dataset: `lokeshparab/amazon-products-dataset`. Follow the dataset's current Kaggle license and attribution requirements when redistributing or publishing the normalized catalog.


## Kaggle catalog performance
The importer intentionally caps the generated local catalog at 24,000 products with up to 1,200 products per normalized category. This keeps Next.js responsive while retaining broad ecommerce coverage. Run `npm run fetch-kaggle` again after updating to regenerate the catalog. The Shop page requests products in pages rather than sending the entire JSON catalog to the browser.

## Product discounts
Product-info questions such as `Is there a discount on <product>?` or `What's the discount on <product>?` use the dataset's `actualPrice` and `discountPrice` fields when available and calculate the percentage off.


## Important: regenerate the catalog after updating
If `data/products.json` was previously generated as a ~600 MB file, delete it or simply run `npm run fetch-kaggle` again. The updated importer creates a performance-safe catalog capped at 24,000 products (1,200 per normalized category). The Shop page is paginated and never sends the whole catalog to the browser.
