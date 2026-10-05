# Survey & Architectural Assessment Report (Step 0)

## 1. Observation

### 1.1 Project Structure & Environment
- **Workspace Root**: `c:\Users\bobo\Documents\antigravity\fervent-hawking`
- **Framework & Dependencies** (`package.json` lines 11-29):
  - Next.js: `^15.2.0` (Resolved to Next.js 15.5.27 during build)
  - React: `^19.0.0` / `react-dom: ^19.0.0`
  - Supabase client: `@supabase/supabase-js: ^2.49.1` (installed, but currently unreferenced in `src/`)
  - AI SDK: `@google/genai: latest`
  - UI & Utilities: `lucide-react: ^1.16.0`, `clsx: ^2.1.1`, `tailwind-merge: ^3.0.2`, `tailwindcss: ^4.0.0`, `@tailwindcss/postcss: ^4.0.0`
- **Build & Execution Observation**:
  - `run_command` with `npm run build` directly in PowerShell failed with:
    ```
    npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system.
    ```
  - Executing via `cmd /c "npm run build"` or `npm.cmd run build` (as in `dev.bat` line 3: `npm.cmd run dev`) succeeded with exit code 0:
    ```
    ▲ Next.js 15.5.27
    ✓ Compiled successfully in 2.5s
    ✓ Generating static pages (12/12)
    ```
  - `package.json` scripts (lines 5-10) define `"dev"`, `"build"`, `"start"`, `"lint"`. There is NO `"test"` script.

### 1.2 User Constraints & Authoritative Directives
- **Authoritative Requirement Source** (`.agents/teamwork/ORIGINAL_REQUEST.md` lines 7-16, 22-23):
  ```markdown
  CRITICAL USER ARCHITECTURAL CONSTRAINT:
  "chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"
  - Do NOT store chat history or message logs in our database.
  - Pull conversations and message histories on-demand directly via Facebook Graph API and TikTok API.
  - Our database only stores:
    1. Shop profile & auth
    2. Connected channel credentials (Page ID, Access Token)
    3. Product catalog & stock counts
    4. Finalized customer orders & vouchers (when a sale is closed)
  ```
  ```markdown
  ### R1. Multi-Tenant Shop & Catalog Persistence (Stateless Chat)
  The platform must store only essential shop metadata, channel access tokens, product catalogs/stock, and finalized customer orders in a persistent database. Chat messages and conversation histories must NOT be stored in our database to keep storage costs at zero; chats must be fetched on-demand directly from Meta and TikTok APIs.
  ```

### 1.3 Database & Multi-Tenancy Architecture (Current State)
- **In-Memory Store in `src/lib/db.ts`** (lines 60-68):
  ```typescript
  class MultiTenantDB {
    private shops: Map<string, Shop> = new Map();
    private products: Map<string, Product[]> = new Map();
    private conversations: Map<string, Conversation[]> = new Map();
    private messages: Map<string, Message[]> = new Map();
    private orders: Map<string, Order[]> = new Map();
    private channels: Map<string, ChannelConnection[]> = new Map();
  ```
  - **No persistent database storage exists**: All data resides in volatile Node.js `Map` memory and resets upon server restart or multi-instance deployment.
  - **Direct violation of Zero Chat Storage**: `conversations` and `messages` are currently stored in `db.ts` and defined in `ARCHITECTURE_PLAN.md` (lines 130-150).
  - **Order Entity Coupling**: In `src/types/index.ts` line 68, `Order` has `conversationId: string`. In a stateless chat model, orders cannot foreign-key to a non-existent `conversations` table.
  - **Missing Access Token in Channel Model**: In `src/types/index.ts` (lines 24-32), `ChannelConnection` lacks an `accessToken` property, forcing `src/app/api/webhooks/facebook/route.ts` line 66 to fall back to `process.env.FB_PAGE_ACCESS_TOKEN || channel?.pageId`.
  - **Zero SQL / Migration files**: There are zero `.sql` migration files in the repository.

### 1.4 Channel Integration & On-Demand Messaging (R2 Current State)
- **Facebook Outbound Dispatcher** (`src/lib/facebook.ts` lines 19-32):
  - `sendFacebookMessage(recipientId, messageText, pageAccessToken)` dispatches messages via Meta Graph API v21.0 `https://graph.facebook.com/v21.0/me/messages`.
  - Missing: On-demand conversation fetching routines (`fetchFacebookConversations`, `fetchFacebookThreadMessages`) targeting `GET /{page_id}/conversations` and `GET /{thread_id}/messages`.
- **Facebook Webhook Route** (`src/app/api/webhooks/facebook/route.ts` lines 38-76):
  - Handles verification challenge `hub.verify_token` and `hub.challenge`.
  - Resolves `pageId` via `db.findShopByPageId(pageId)`.
  - Normalizes Burmese text, triggers `processCustomerMessage`, and invokes `sendFacebookMessage`.
  - Ephemeral processing is compliant with Zero Chat Storage (it does not persist message logs).
- **TikTok Webhook Route** (`src/app/api/webhooks/tiktok/route.ts` lines 12-42):
  - Receives `im.message.receive`, normalizes Burmese text, and runs AI Agent.

### 1.5 Burmese Sales AI & Township Delivery (R3 Current State)
- **Burmese Normalizer** (`src/lib/burmese-converter.ts` lines 7-90):
  - `isZawgyi` detects Zawgyi specific code points and reordered E-vowels (`\u1031[\u1000-\u1021]`).
  - `normalizeBurmese` maps Zawgyi medial characters and reorders E-vowels into Unicode standard.
  - `normalizeMyanmarPhone` formats phone numbers to standard `09xxxxxxxxx`.
- **Township Delivery Matrix** (`src/lib/myanmar-townships.ts` lines 15-61):
  - Contains 34 preconfigured entries covering Yangon (24 townships), Mandalay (6 townships), Naypyitaw (3 townships), and 5 Regional Highway Express Terminals/Destinations (Aung Mingalar, Dagon Ayeyar, Taunggyi, Mawlamyine, Lashio).
- **Burmese AI Sales Agent** (`src/lib/gemini-agent.ts` lines 24-186):
  - Supports Google Gemini API (`gemini-2.5-flash` via `@google/genai`) with polite Burmese system prompt (`မင်မင်`, `ရှင်/ခင်ဗျာ`).
  - Fallback local rule engine operates offline when `GEMINI_API_KEY` is not supplied.

### 1.6 Testing & Verification (R4 Current State)
- **Test runner**: No test framework (`vitest`, `jest`) is installed in `node_modules` or configured in `package.json`.
- **Test suites**: Zero test files exist in the project root or `src/`.

---

## 2. Logic Chain

1. **Premise 1 (Requirement R1 & User Directive)**: The user explicitly specified:
   *"chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"*
   Therefore, our database schema must NOT include `conversations` or `messages` tables. It must strictly persist:
   (a) `shops`
   (b) `channel_connections` (with Page ID and Access Token)
   (c) `products`
   (d) `orders` (with customer details, items, delivery fee, payment slip, status, and external customer PSID/phone instead of a conversation FK).

2. **Premise 2 (Current Codebase vs R1)**:
   In `src/lib/db.ts` (lines 64-65, 81-83, 218-226), the codebase still maintains `conversations` and `messages` maps. Furthermore, all data is in-memory and lost upon restart.
   Therefore, a refactoring of the data tier is required:
   - Eliminate `messages` and `conversations` from database persistence models.
   - Establish a robust persistent database abstraction (PostgreSQL / Supabase with Row-Level Security policies, and a persistent local/file/SQLite fallback that persists across server restarts).
   - Update `Order` type to decouple from `conversationId` and link directly to `platform` + `customerPlatformId`.

3. **Premise 3 (Requirement R2 on-demand chat)**:
   Because chats are not stored in our database, the UI (`src/app/page.tsx`) must fetch customer conversations and message histories dynamically via Meta Graph API (`GET /{page_id}/conversations`) and TikTok API, or provide a live ephemeral simulator.
   `src/lib/facebook.ts` currently only has outbound sending (`sendFacebookMessage`). It must be expanded with on-demand retrieval functions (`fetchFacebookConversations` and `fetchFacebookThreadMessages`).

4. **Premise 4 (Requirement R4 Automated Testing)**:
   `ORIGINAL_REQUEST.md` line 49 mandates: `Automated test suite runs with all tests passing cleanly (npm test)`.
   Because `package.json` lacks a test script and test framework, a lightweight, fast test runner (such as `vitest` or Node's native test runner) must be configured along with comprehensive unit, integration, and webhook test suites.

---

## 3. Caveats

1. **Meta and TikTok Live API Credentials**: In local or testing environments, live Page Access Tokens or TikTok developer keys may not always be provisioned in `.env`. The system must gracefully support simulated/sandbox channel interaction without crashing or requiring external network calls.
2. **Supabase Cloud Dependency vs Local Self-Contained Persistence**: While `@supabase/supabase-js` is installed and Supabase SQL migrations with RLS are required for production, a self-contained persistent store (e.g., persistent JSON file store or SQLite) must be provided in `src/lib/db.ts` so the application runs and persists tenant data across server restarts even if external Supabase cloud credentials are not active.
3. **PowerShell Script Execution Policy**: Windows PowerShell prevents executing `npm.ps1`. All commands in development and scripts must invoke `npm.cmd` or `cmd /c`.

---

## 4. Conclusion & Architectural Foundation Plan

### 4.1 Recommended Multi-Tenant Database Schema (Zero Chat Storage)
The database must contain exactly 4 tables with Row Level Security (RLS) enabled:

```sql
-- 1. Shops (Tenants)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    telegram_chat_id TEXT,
    telegram_bot_token TEXT,
    google_sheet_id TEXT,
    kpay_number TEXT,
    kpay_name TEXT,
    wave_number TEXT,
    wave_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Channel Connections
CREATE TABLE channel_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'tiktok')),
    account_name TEXT NOT NULL,
    page_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    webhook_secret TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (shop_id, platform, page_id)
);

-- 3. Product Catalog
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    price_mmk INTEGER NOT NULL CHECK (price_mmk >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    variants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Customer Orders & Vouchers (Zero Chat Storage: References external customer_platform_id)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'tiktok', 'manual')),
    customer_platform_id TEXT NOT NULL, -- PSID or TikTok User ID
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    township TEXT NOT NULL,
    full_address TEXT NOT NULL,
    items JSONB NOT NULL, -- [{productId, name, quantity, priceMmk}]
    subtotal_mmk NUMERIC NOT NULL,
    delivery_fee_mmk NUMERIC DEFAULT 0,
    total_mmk NUMERIC NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('kpay', 'wavepay', 'cod', 'cbpay', 'ayapay')),
    payment_slip_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_slip' CHECK (status IN ('pending_slip', 'pending_approval', 'confirmed', 'shipped', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- STRICT RULE: NO 'conversations' OR 'messages' TABLES CREATED!
```

### 4.2 Row Level Security (RLS) Policy Design
```sql
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies based on auth.jwt() ->> 'shop_id' or service role
CREATE POLICY "Tenant isolation for channel_connections"
    ON channel_connections FOR ALL
    USING (shop_id = (auth.jwt() ->> 'shop_id')::uuid);

CREATE POLICY "Tenant isolation for products"
    ON products FOR ALL
    USING (shop_id = (auth.jwt() ->> 'shop_id')::uuid);

CREATE POLICY "Tenant isolation for orders"
    ON orders FOR ALL
    USING (shop_id = (auth.jwt() ->> 'shop_id')::uuid);
```

### 4.3 Implementation Strategy by Requirement
- **For R1 (Persistence & Multi-Tenancy)**:
  - Create Supabase SQL migration script `supabase/migrations/001_multi_tenant_schema.sql` reflecting the 4 zero-chat tables and RLS policies.
  - Implement a persistent database layer in `src/lib/db.ts` that persists to file/disk (e.g. `data/db.json` or SQLite) when Supabase environment variables are in dev/mock mode, guaranteeing data survives server restarts.
  - Remove all `conversations` and `messages` database maps and persistence methods from `db.ts`.
- **For R2 (On-Demand Social Channel Messaging)**:
  - Add `fetchFacebookConversations` and `fetchFacebookThreadMessages` to `src/lib/facebook.ts`.
  - Add `accessToken` to `ChannelConnection` model.
  - Update `src/app/page.tsx` live inbox to pull message threads on-demand from connected channels or the in-memory ephemeral simulator, avoiding any database storage of chats.
- **For R3 (Burmese Sales & Logistics)**:
  - Expand `MYANMAR_DELIVERY_MATRIX` in `src/lib/myanmar-townships.ts` to ensure 45+ townships are covered with exact MMK rates and COD availability.
- **For R4 (Automated Testing Suite)**:
  - Install a fast testing framework (`vitest` or `jest`).
  - Add `"test": "vitest run"` (or equivalent) to `package.json`.
  - Create comprehensive tests:
    - `tests/tenant-isolation.test.ts`: Verifies complete data isolation between registered shops.
    - `tests/zero-chat-storage.test.ts`: Asserts database contains no message or conversation tables/records.
    - `tests/burmese-converter.test.ts`: Verifies Zawgyi/Unicode normalization and phone formatting.
    - `tests/delivery-matrix.test.ts`: Validates township delivery lookup for Yangon, Mandalay, and Highway bus gates.
    - `tests/webhook-dispatch.test.ts`: Tests Meta Webhook signature verification, customer routing, and outbound dispatch.

---

## 5. Verification Method

1. **Build Verification**:
   - Run `cmd /c "npm run build"` or `npm.cmd run build`.
   - Expected result: 0 TypeScript errors, all routes statically/dynamically generated.
2. **Schema & Zero-Chat Verification**:
   - Inspect database models in `src/lib/db.ts` and `src/types/index.ts`.
   - Verify absence of `messages` or `conversations` tables/stores.
3. **Multi-Tenant Persistence Across Restarts**:
   - Add/edit a product or order in Shop A.
   - Restart server process.
   - Reload and verify Shop A's data persists and is invisible to Shop B.
4. **Test Suite Verification**:
   - Run `cmd /c "npm test"` or `npm.cmd test`.
   - Expected result: All automated test suites execute and pass cleanly.
