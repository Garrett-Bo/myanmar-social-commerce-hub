-- ==============================================================================
-- OPTIONAL SEED DATA: MULTI-TENANT DEMO STORES (Stateless Zero-Chat)
-- Target: supabase/seed.sql or migration test runner
-- ==============================================================================

-- 1. Insert Demo Shops
INSERT INTO shops (id, name, owner_email, telegram_chat_id, telegram_bot_token, google_sheet_id, kpay_number, kpay_name, wave_number, wave_name)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Aung Thukha Beauty & Fashion Store (ရန်ကုန်)', 'aungthukha.shop@gmail.com', '@aungthukha_orders_bot', '789123456:AAFd9s8a7df98asd7f', '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', '09798765432', 'Daw Thandar Aung', '09798765432', 'Daw Thandar Aung'),
  ('a0000000-0000-0000-0000-000000000002', 'Mandalay Trendy Closet (မန္တလေး)', 'mandalay.closet@gmail.com', '@mdy_closet_bot', '', '', '09451122334', 'Ko Ye Yint Aung', '09451122334', 'Ko Ye Yint Aung'),
  ('a0000000-0000-0000-0000-000000000003', 'Naypyitaw Digital Store (နေပြည်တော်)', 'naypyitaw.tech@gmail.com', '', '', '', '09250099887', 'Daw May Thu', '09250099887', 'Daw May Thu')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Channel Connections
INSERT INTO channel_connections (id, shop_id, platform, account_name, page_id, access_token, avatar_url, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'facebook', 'Aung Thukha Fashion - FB Page', '109283746501928', 'EAAG...mock_yangon_token', 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100&h=100&fit=crop', true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'tiktok', '@aungthukha_trend', 'tt_shop_8291029', 'act.mock_yangon_tiktok_token', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'facebook', 'Mandalay Closet FB Page', '209384756102938', 'EAAG...mock_mandalay_token', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Products
INSERT INTO products (id, shop_id, sku, name_mm, name_en, category, price_mmk, stock_quantity, image_url, is_available, variants)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SKIN-SERUM-01', 'Niacinamide Whitening Serum (30ml)', 'Glow Niacinamide Serum 10%', 'Skincare', 28000, 15, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop', true, '["30ml standard bottle"]'::jsonb),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'LIP-VELVET-02', 'Matte Velvet Lip Tint (မိတ်ကပ်နှုတ်ခမ်းနီ)', 'Soft Velvet Matte Lip Tint', 'Cosmetics', 14500, 42, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop', true, '["#01 Cherry Red", "#02 Peach Coral", "#03 Rosy Nude"]'::jsonb),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'BAG-CROSS-03', 'Vintage Leather Crossbody Bag (ကိုရီးယားစတိုင်)', 'Korean Style Vintage Shoulder Bag', 'Bags & Accessories', 35000, 4, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', true, '["Classic Brown", "Midnight Black"]'::jsonb),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'MDY-SILK-01', 'မန္တလေး ချည်ပိုးထည် ပုဆိုး/လုံချည်', 'Traditional Mandalay Silk Longyi', 'Traditional Fashion', 45000, 20, 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=400&h=400&fit=crop', true, '["Navy Blue", "Emerald Green"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Finalized Orders (Stateless Chat Reference - NO conversation FK)
INSERT INTO orders (id, shop_id, platform, customer_platform_id, customer_name, customer_phone, township, full_address, items, subtotal_mmk, delivery_fee_mmk, total_mmk, payment_method, payment_slip_url, status)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'facebook', 'fb_usr_yangon_9021', 'Ko Kyaw Swar Lin', '09791234567', 'Tamwe', 'No. 45, Kyaikkasan Road, Tamwe Township, Yangon', '[{"productId": "b0000000-0000-0000-0000-000000000002", "name": "Matte Velvet Lip Tint (#01 Cherry Red)", "quantity": 1, "priceMmk": 14500}, {"productId": "b0000000-0000-0000-0000-000000000003", "name": "Vintage Leather Crossbody Bag (Brown)", "quantity": 1, "priceMmk": 35000}]'::jsonb, 49500, 2500, 52000, 'kpay', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=600&fit=crop', 'pending_approval'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'facebook', 'fb_usr_yangon_9018', 'Ma Sandar', '09450011223', 'Sanchaung', 'Shin Saw Pu Road, Sanchaung, Yangon', '[{"productId": "b0000000-0000-0000-0000-000000000001", "name": "Niacinamide Whitening Serum", "quantity": 2, "priceMmk": 28000}]'::jsonb, 56000, 2500, 58500, 'cod', null, 'confirmed')
ON CONFLICT (id) DO NOTHING;
