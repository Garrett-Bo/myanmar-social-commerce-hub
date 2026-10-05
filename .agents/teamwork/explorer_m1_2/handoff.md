# Milestone 1 Technical Handoff Report: Multi-Tenant Database Persistence & Zero-Chat Storage

**Agent**: `explorer_m1_2`  
**Milestone**: M1 (Multi-Tenant Database Persistence & Zero-Chat Storage)  
**Parent**: `orchestrator_1` (`6b3e572e-862e-4f21-b794-2d675500d1e9`)  
**Artifact Path**: `.agents/teamwork/explorer_m1_2/handoff.md`  
**Proposed Migration Path**: `.agents/teamwork/explorer_m1_2/proposed_001_multi_tenant_schema.sql`  
**Target Migration Destination**: `supabase/migrations/001_multi_tenant_schema.sql`

---

## 1. Observation

### 1.1 Direct Requirements Observation
From `.agents/teamwork/ORIGINAL_REQUEST.md` (lines 7–16, 22–24):
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
From `PROJECT.md` (lines 6–10, 71, 80–92):
- Database tier must persist strictly:
  1. `shops`
  2. `channel_connections`
  3. `products`
  4. `orders`
- **Critical Invariant**: "No `conversations` or `messages` tables exist in database. Storage is strictly reserved for shops, channel credentials, products, and finalized orders."

### 1.2 Existing Codebase Observations
1. **`package.json`**:
   - Line 15: `@supabase/supabase-js: ^2.49.1` is installed.
   - Currently, there is NO `supabase/` directory and zero migration files in the project.
2. **`src/types/index.ts`**:
   - Lines 24–32: `ChannelConnection` lacks an `accessToken` field and `webhookSecret` field.
   - Line 68: `Order` interface has `conversationId: string;`, tightly coupling orders to chat records.
   - Lines 48–56 & 83–96: `Message` and `Conversation` interfaces are currently defined as persistent entities.
3. **`src/lib/db.ts`**:
   - Lines 60–68:
     ```typescript
     class MultiTenantDB {
       private shops: Map<string, Shop> = new Map();
       private products: Map<string, Product[]> = new Map();
       private conversations: Map<string, Conversation[]> = new Map();
       private messages: Map<string, Message[]> = new Map();
       private orders: Map<string, Order[]> = new Map();
       private channels: Map<string, ChannelConnection[]> = new Map();
     ```
   - All state is currently stored in ephemeral Node.js `Map` memory and resets on server restart.
   - It directly maintains `conversations` and `messages` maps, violating the Zero-Chat Storage mandate.
4. **Validation Test Execution**:
   - Created and executed `.agents/teamwork/explorer_m1_2/validate_schema.js` via Node v24.19.0.
   - Output: All 16 verification checks passed cleanly (0 errors).

---

## 2. Logic Chain

1. **Step 1: Elimination of Chat Storage**:
   - *Premise*: The authoritative requirement strictly prohibits storing chat messages or conversation threads in our database to eliminate storage costs.
   - *Inference*: The schema must define exactly 4 tables (`shops`, `channel_connections`, `products`, `orders`). No tables named `conversations`, `messages`, `chat_logs`, or similar may be created. Orders must reference external customer platform IDs (`customer_platform_id` and `platform`) rather than a local conversation foreign key.

2. **Step 2: Table Schema Design**:
   - `shops`:
     - Primary key `id UUID DEFAULT gen_random_uuid()`.
     - Fields: `name TEXT NOT NULL`, `owner_email TEXT NOT NULL`, `telegram_chat_id TEXT`, `telegram_bot_token TEXT`, `google_sheet_id TEXT`, `kpay_number TEXT`, `kpay_name TEXT`, `wave_number TEXT`, `wave_name TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
     - Trigger: `update_timestamp()` ensures `updated_at` stays accurate.
   - `channel_connections`:
     - Foreign key: `shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE`.
     - Channel credentials: `platform TEXT CHECK (platform IN ('facebook', 'tiktok'))`, `account_name TEXT`, `page_id TEXT`, `access_token TEXT`, `webhook_secret TEXT`, `avatar_url TEXT`, `is_active BOOLEAN DEFAULT true`.
     - Uniqueness: `CONSTRAINT uq_channel_shop_platform_page UNIQUE (shop_id, platform, page_id)`.
   - `products`:
     - Foreign key: `shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE`.
     - Catalog: `sku TEXT NOT NULL`, `name_mm TEXT NOT NULL`, `name_en TEXT NOT NULL`, `category TEXT DEFAULT 'General'`, `price_mmk NUMERIC(12, 2) CHECK (price_mmk >= 0)`, `stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0)`, `image_url TEXT`, `is_available BOOLEAN DEFAULT true`, `variants JSONB DEFAULT '[]'::jsonb`.
     - Uniqueness: `CONSTRAINT uq_products_shop_sku UNIQUE (shop_id, sku)`.
   - `orders`:
     - Foreign key: `shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE`.
     - Zero-chat reference: `platform TEXT CHECK (platform IN ('facebook', 'tiktok', 'manual'))`, `customer_platform_id TEXT NOT NULL` (Page-scoped ID `PSID` or TikTok user ID).
     - Customer details: `customer_name TEXT`, `customer_phone TEXT`, `township TEXT`, `full_address TEXT`.
     - Order contents: `items JSONB DEFAULT '[]'::jsonb` (storing line items `[{productId, name, quantity, priceMmk}]`).
     - Totals in MMK: `subtotal_mmk NUMERIC(14, 2)`, `delivery_fee_mmk NUMERIC(10, 2) DEFAULT 0`, `total_mmk NUMERIC(14, 2)`.
     - Payment & Fulfillment: `payment_method TEXT CHECK (payment_method IN ('kpay', 'wavepay', 'cod', 'cbpay', 'ayapay'))`, `payment_slip_url TEXT`, `status TEXT DEFAULT 'pending_slip' CHECK (status IN ('pending_slip', 'pending_approval', 'confirmed', 'shipped', 'cancelled'))`.

3. **Step 3: Performance Indices for Multi-Tenant Lookups**:
   - `channel_connections`:
     - `idx_channel_connections_shop_id` on `(shop_id)`: Quick tenant channel listing.
     - `idx_channel_connections_lookup` on `(shop_id, platform, page_id)`: Verification of connected accounts.
     - `idx_channel_connections_routing` on `(platform, page_id) WHERE is_active = true`: Critical for O(1) webhook dispatch when an incoming message delivers only `page_id` and platform.
   - `products`:
     - `idx_products_shop_id` on `(shop_id)`: Catalog retrieval.
     - `idx_products_shop_sku` on `(shop_id, sku)`: Barcode/SKU scans.
     - `idx_products_shop_category` on `(shop_id, category)`: Category filtering.
     - `idx_products_shop_available` on `(shop_id, is_available)`: In-stock customer queries.
   - `orders`:
     - `idx_orders_shop_id` on `(shop_id)`: Dashboard vouchers.
     - `idx_orders_shop_status` on `(shop_id, status)`: Tab views (pending slip, confirmed, shipped).
     - `idx_orders_shop_created_at` on `(shop_id, created_at DESC)`: Chronological voucher feeds.
     - `idx_orders_customer_lookup` on `(shop_id, customer_platform_id)`: Locating previous orders for the same social user without querying chat history.

4. **Step 4: Row-Level Security (RLS) & Multi-Tenant Isolation**:
   - `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` on all 4 tables.
   - Tenants access data with Supabase JWT tokens containing custom claim `shop_id`.
   - To guard against runtime UUID syntax errors when JWT claim is absent or empty, the policy utilizes:
     ```sql
     shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
     ```
   - Backend webhooks and asynchronous queue workers authenticate using the Supabase Service Role Key. Hence, each policy permits `auth.role() = 'service_role'` for unhindered backend ingestion.
   - For `shops`, owners can also access their own record if `owner_email = auth.jwt() ->> 'email'`.

5. **Step 5: Zero-Chat Schema Integrity Check**:
   - Added an automated PL/pgSQL verification block that executes at migration time:
     ```sql
     DO $$
     BEGIN
         IF EXISTS (
             SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('conversations', 'messages', 'chat_logs', 'chat_history')
         ) THEN
             RAISE EXCEPTION 'ZERO CHAT STORAGE VIOLATION: Forbidden chat tables detected in public schema!';
         END IF;
     END $$;
     ```

---

## 3. Caveats

1. **Dual Storage Mode (Supabase vs Local Offline Fallback)**:
   - In production or when Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are present in `.env`, the system executes directly against this PostgreSQL schema.
   - However, during offline development, test runner execution, or if credentials are omitted, `src/lib/db.ts` must provide a local persistent disk fallback (e.g. `data/db.json` or SQLite) adhering to the exact same 4-table schema and zero-chat invariant.
2. **JWT Custom Claim Setup**:
   - When deploying to Supabase Auth, custom JWT claims (setting `shop_id` in `auth.jwt()`) should be configured via a custom Auth Hook or metadata mapping. The fallback `owner_email = auth.jwt() ->> 'email'` on `shops` allows bootstrapping prior to claim attachment.
3. **Price & Quantity Datatypes**:
   - `price_mmk` and total amounts are typed as `NUMERIC(14, 2)` instead of standard 32-bit `INTEGER` because Myanmar Kyat amounts commonly exceed hundreds of thousands or millions, and integer types risk overflow.

---

## 4. Conclusion & Actionable Recommendations

### 4.1 Production Migration Script Content
The proposed migration has been written to:
`.agents/teamwork/explorer_m1_2/proposed_001_multi_tenant_schema.sql`

Here is the complete production SQL specification for `supabase/migrations/001_multi_tenant_schema.sql`:

```sql
-- ==============================================================================
-- MILESTONE 1: MULTI-TENANT DATABASE PERSISTENCE & ZERO-CHAT STORAGE SCHEMA
-- Target File: supabase/migrations/001_multi_tenant_schema.sql
-- ==============================================================================
-- CRITICAL ARCHITECTURAL DIRECTIVE (Zero Chat Storage):
-- "chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"
-- 
-- Strictly persists 4 zero-chat tables:
-- 1. shops: Merchant profile, auth, payment credentials, and notification settings.
-- 2. channel_connections: Connected social channels (Facebook Page, TikTok) with access tokens.
-- 3. products: Merchant catalog with SKU, MMK pricing, stock quantity, and variants.
-- 4. orders: Finalized customer purchase vouchers with customer delivery details and slips.
-- 
-- STRICT GUARANTEE: NO 'conversations' or 'messages' tables exist.
-- Live chat threads and customer messages are fetched ephemerally on-demand
-- via Facebook Graph API and TikTok Open API.
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing triggers & functions if reloading
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TABLE 1: SHOPS (Tenants)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS shops (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_shops_updated_at ON shops;
CREATE TRIGGER trg_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- TABLE 2: CHANNEL_CONNECTIONS (Social Channel Credentials per Tenant)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS channel_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'tiktok')),
    account_name TEXT NOT NULL,
    page_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    webhook_secret TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_channel_shop_platform_page UNIQUE (shop_id, platform, page_id)
);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_channel_connections_updated_at ON channel_connections;
CREATE TRIGGER trg_channel_connections_updated_at
    BEFORE UPDATE ON channel_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- TABLE 3: PRODUCTS (Catalog & Real-time Inventory in MMK)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    name_en TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    price_mmk NUMERIC(12, 2) NOT NULL CHECK (price_mmk >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    image_url TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_products_shop_sku UNIQUE (shop_id, sku)
);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- TABLE 4: ORDERS (Finalized Customer Vouchers - Zero Chat Storage Reference)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'tiktok', 'manual')),
    customer_platform_id TEXT NOT NULL, -- PSID or TikTok User ID (Stateless chat reference)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    township TEXT NOT NULL,
    full_address TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of [{productId, name, quantity, priceMmk}]
    subtotal_mmk NUMERIC(14, 2) NOT NULL CHECK (subtotal_mmk >= 0),
    delivery_fee_mmk NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee_mmk >= 0),
    total_mmk NUMERIC(14, 2) NOT NULL CHECK (total_mmk >= 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('kpay', 'wavepay', 'cod', 'cbpay', 'ayapay')),
    payment_slip_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending_slip' CHECK (status IN ('pending_slip', 'pending_approval', 'confirmed', 'shipped', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- PERFORMANCE INDICES (Multi-Tenant Lookups & Webhook Dispatch)
-- ==============================================================================
-- 1. Channel Connections Indices
CREATE INDEX IF NOT EXISTS idx_channel_connections_shop_id 
    ON channel_connections (shop_id);

CREATE INDEX IF NOT EXISTS idx_channel_connections_lookup 
    ON channel_connections (shop_id, platform, page_id);

CREATE INDEX IF NOT EXISTS idx_channel_connections_routing 
    ON channel_connections (platform, page_id) 
    WHERE is_active = true;

-- 2. Products Indices
CREATE INDEX IF NOT EXISTS idx_products_shop_id 
    ON products (shop_id);

CREATE INDEX IF NOT EXISTS idx_products_shop_sku 
    ON products (shop_id, sku);

CREATE INDEX IF NOT EXISTS idx_products_shop_category 
    ON products (shop_id, category);

CREATE INDEX IF NOT EXISTS idx_products_shop_available 
    ON products (shop_id, is_available);

-- 3. Orders Indices
CREATE INDEX IF NOT EXISTS idx_orders_shop_id 
    ON orders (shop_id);

CREATE INDEX IF NOT EXISTS idx_orders_shop_status 
    ON orders (shop_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_shop_created_at 
    ON orders (shop_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer_lookup 
    ON orders (shop_id, customer_platform_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer_phone 
    ON orders (shop_id, customer_phone);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS Policy: shops
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation_shops" ON shops;
CREATE POLICY "tenant_isolation_shops" ON shops
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
        OR owner_email = auth.jwt() ->> 'email'
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
        OR owner_email = auth.jwt() ->> 'email'
    );

-- ------------------------------------------------------------------------------
-- RLS Policy: channel_connections
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation_channel_connections" ON channel_connections;
CREATE POLICY "tenant_isolation_channel_connections" ON channel_connections
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
    );

-- ------------------------------------------------------------------------------
-- RLS Policy: products
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation_products" ON products;
CREATE POLICY "tenant_isolation_products" ON products
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
    );

-- ------------------------------------------------------------------------------
-- RLS Policy: orders
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tenant_isolation_orders" ON orders;
CREATE POLICY "tenant_isolation_orders" ON orders
    FOR ALL
    USING (
        auth.role() = 'service_role'
        OR shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR shop_id = NULLIF(auth.jwt() ->> 'shop_id', '')::uuid
    );

-- ==============================================================================
-- ZERO-CHAT ARCHITECTURE VALIDATION ASSERTION
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('conversations', 'messages', 'chat_logs', 'chat_history')
    ) THEN
        RAISE EXCEPTION 'ZERO CHAT STORAGE VIOLATION: Forbidden chat tables detected in public schema!';
    END IF;
END $$;
```

### 4.2 Required TypeScript Model Alignment in `src/types/index.ts`
When the implementation agent applies changes:
```typescript
// Add accessToken & webhookSecret to ChannelConnection
export interface ChannelConnection {
  id: string;
  shopId: string;
  platform: PlatformType;
  accountName: string;
  pageId: string;
  accessToken: string; // REQUIRED
  webhookSecret?: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt?: string;
}

// Decouple Order from conversationId
export interface Order {
  id: string;
  shopId: string;
  platform: 'facebook' | 'tiktok' | 'manual';
  customerPlatformId: string; // PSID or TikTok UID
  customerName: string;
  customerPhone: string;
  township: string;
  fullAddress: string;
  items: OrderItem[];
  subtotalMmk: number;
  deliveryFeeMmk: number;
  totalMmk: number;
  paymentMethod: PaymentMethod;
  paymentSlipUrl?: string;
  status: OrderStatus;
  createdAt: string;
}
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Schema Syntax & Rule Verification**:
   Execute the automated validator script:
   ```powershell
   node .agents/teamwork/explorer_m1_2/validate_schema.js
   ```
   *Expected Result*: Exits 0, reporting all 16 checks passed.
2. **File Migration Copy Verification**:
   Once the implementer copies the file to `supabase/migrations/001_multi_tenant_schema.sql`, verify file existence:
   ```powershell
   node -e "console.log(fs.existsSync('supabase/migrations/001_multi_tenant_schema.sql'))"
   ```
3. **Application Build Verification**:
   Ensure Next.js compiles cleanly:
   ```powershell
   cmd /c "npm run build"
   ```
4. **Invalidation Conditions**:
   The schema is invalidated if:
   - Any table named `conversations`, `messages`, or `chat_logs` is created.
   - Any order record requires a foreign key to a local chat conversation.
   - A tenant is able to read another shop's channel credentials or orders via Supabase queries without a service role token.
