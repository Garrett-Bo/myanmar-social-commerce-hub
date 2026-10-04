# 🇲🇲 ShweShop AI — Multi-Channel Social Commerce Inbox for Myanmar

An ultra low-cost, AI-powered social commerce centralization platform designed specifically for **online sellers in Myanmar**. Centralizes incoming customer chats from **Facebook Messenger** and **TikTok Shop**, with an intelligent Burmese-first AI Sales Agent, live stock/price checking via Google Sheets, township delivery calculators, and instant Telegram order alerts.

---

## 🌟 Key Features

1. **Unified Facebook & TikTok Live Inbox**
   - Single workspace to manage Facebook Page messages and TikTok direct messages.
   - Filter by platform, status, or unread messages.
   - Real-time conversation streaming.

2. **Burmese AI Sales Agent (Gemini Flash)**
   - Auto-detects and normalizes **Zawgyi and Unicode** input.
   - Grounded in real-time product stock counts and prices in MMK.
   - Natural Burmese business tone (`ရှင်/ခင်ဗျာ`), handling colloquial phrases (`instock shi lr`, `deli fee bl lout ll`).

3. **2-Way Google Sheets & Web Catalog Sync**
   - Sellers can update products and stock counts directly in **Google Sheets** or through the web dashboard.
   - Instant 2-way sync keeps the AI informed of current inventory levels.

4. **Myanmar Township Delivery Matrix**
   - Pre-configured rates for 45+ Yangon townships, Mandalay, Naypyitaw, and regional highway express gates (အောင်မင်္ဂလာ / ဒဂုံဧရာ ကားဂိတ်ပို့).
   - Automatically determines COD availability and transit days.

5. **End-to-End Sales Closing & KPay / WavePay Workflow**
   - Collects Customer Name, Phone Number, Township, Address, and Payment Method.
   - Shares seller's KBZPay / WavePay details.
   - Generates order vouchers with one-click payment slip verification.

6. **Instant Free Telegram Seller Alerts**
   - Sends real-time order alerts and transaction slip previews to the shop owner's Telegram bot without SMS or notification fees.

7. **One-Click Human Takeover**
   - Seamlessly switch between AI Auto-Response and Manual Staff Mode per conversation.

---

## 🚀 Quick Start

### 1. Installation
```bash
# Clone the repository
git clone <repo-url>
cd fervent-hawking

# Install dependencies
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Unified Live Inbox and Inbound Simulator.

---

## 🛠️ Tech Stack & Ultra-Low Cost Economics

- **Frontend & API**: Next.js 15 (App Router), Tailwind CSS, Lucide React
- **Database**: Supabase (PostgreSQL + Realtime WebSockets) — *Free Tier*
- **AI Model**: Google Gemini 2.5 / 3.0 Flash — *~<$3/mo for thousands of customer inquiries*
- **Catalog**: Google Sheets API v4 — *Free*
- **Push Alerts**: Telegram Bot API — *100% Free*

Total estimated hosting & operational cost: **< $5.00 / month**.
