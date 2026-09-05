AgentCart

AgentCart is an AI-powered conversational e-commerce assistant that allows users to search for products, get product information, receive recommendations, manage their cart, and complete purchases through Razorpay.

Tech Stack
Frontend: Next.js, React, TypeScript
Styling: Tailwind CSS
AI: Groq API
Payments: Razorpay
Product Data: JSON-based product catalog
Data Processing: Python, KaggleHub
Animations/UI: Framer Motion, Lucide React
Dataset

AgentCart uses the Amazon Products Dataset 2023 from Kaggle:

lokeshparab/amazon-products-dataset

The dataset contains product names, categories, subcategories, prices, ratings, rating counts, images, product links, and other product information.

The dataset is processed into a normalized catalog used by the recommendation and shopping system.

Workflow
User Query
    ↓
Intent Detection
    ↓
Product Information / Shopping Request
    ↓
Catalog Retrieval
    ↓
Hard Filtering
(Category, Product Type, Budget, Availability)
    ↓
Product Ranking
(Relevance, Preferences, Rating, Value)
    ↓
Recommendation
    ↓
Cart Management
    ↓
Spending Policy / Approval
    ↓
Razorpay Checkout
Core Workflow
The user interacts with AgentCart using natural language.
The system identifies the user's intent and requirements.
Relevant products are retrieved from the catalog.
Hard constraints such as category, product type, budget, and availability are applied first.
Matching products are ranked based on relevance, preferences, ratings, and value.
The best products are recommended to the user.
Selected products can be added to the cart.
Spending policies are checked before purchase.
Approved purchases proceed through Razorpay checkout.