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

-- Webhook routing index: Incoming webhooks route by platform + page_id
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
-- Enable Row Level Security on all 4 tables
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
-- The following block verifies at migration time that no 'conversations' or
-- 'messages' tables exist or have been accidentally created in public schema.
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
