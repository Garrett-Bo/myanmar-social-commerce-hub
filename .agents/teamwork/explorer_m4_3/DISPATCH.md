# DISPATCH — explorer_m4_3

## Task Assignment
- Agent: explorer_m4_3
- Archetype: teamwork_preview_explorer
- Role: Order Closing, Telegram Alerts & Test Harness Explorer
- Scope: Database Order Finalization, Atomic Stock Decrement, Telegram Notifications & M4 Verification Harness

## Objective
Analyze requirements and design the implementation blueprint for order creation, stock management, seller Telegram notifications, and the comprehensive Milestone 4 verification test harness.

## Context & Inputs
- Authoritative User Request: `c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md`
- Project Architecture & Feature Inventory: `c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md`
- Database Layer: `src/lib/db.ts` (`db.createOrder`, `db.updateProductStock`, `db.getProducts`)
- Existing Types: `src/types/index.ts` (`Order`, `Product`, `Shop`, `OrderStatus`)
- Existing Telegram Utility: `src/lib/telegram.ts`

## Key Analysis Requirements
1. **Order Finalization & Database Persistence**:
   - Contract: When all 5 checkout attributes are complete and order is confirmed:
     * Call `db.createOrder(shopId, orderData)` to persist order record.
     * Status initial: `'pending'` or `'confirmed'`.
     * Return `completedOrder?: Order` in `AgentResponse`.
2. **Atomic Stock Decrement & Concurrency Guard**:
   - Decrement product stock via `db.updateProductStock(shopId, productId, -quantity)`.
   - Protect against negative stock (if remaining stock < quantity, rollback / reject order with Burmese error message).
3. **Telegram Seller Instant Alert (`src/lib/telegram.ts`)**:
   - Design / enhance `sendTelegramOrderAlert(shop: Shop, order: Order, products: Product[])`:
     * Formatted alert message including Shop Name, Order ID, Customer Name, Phone, Delivery Address, Items, Total Amount, Payment Method.
     * Mock mode fallback when `TELEGRAM_BOT_TOKEN` or `shop.telegramChatId` is not configured, so tests run reliably offline.
     * Include test spy tracker for automated verification.
4. **Milestone 4 Verification Test Harness (`scripts/verify_m4_sales_closing.ts`)**:
   - Design comprehensive 7-suite verification script:
     * Suite 1: Burmese & Burglish intent classification (greeting, price, stock, delivery, payment, order).
     * Suite 2: Real-time product search & MMK price formatting.
     * Suite 3: 5-attribute conversational checkout extraction (product, qty, name, phone, address).
     * Suite 4: Township delivery calculation & prepaid policy enforcement (Yangon COD vs Taunggyi Prepaid).
     * Suite 5: Order voucher generation (`ဘောက်ချာ` format, Burmese text, calculations).
     * Suite 6: Order finalization, atomic stock decrement & negative stock guard.
     * Suite 7: Telegram notification alert & Zero-chat DB invariant verification.

## Output Requirements
Produce a comprehensive handoff report at:
`c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_3\handoff.md`
Report must include: Observation, Logic Chain, Implementation Blueprint, Proposed Code / Signatures, and Verification Strategy.
Send completion message to parent orchestrator (`6b3e572e-862e-4f21-b794-2d675500d1e9`).


## 2026-10-08T08:10:42Z
You are explorer_m4_3, a teamwork_preview_explorer agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_3
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope, feature inventory, and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read your dispatch instructions at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_3\DISPATCH.md

Your mission for Milestone 4 (Order Closing, Telegram Alerts & Test Harness):
Analyze requirements and design the implementation blueprint for order creation, atomic stock decrement, seller Telegram notifications, and the Milestone 4 verification test harness:
1. Order creation persistence via `db.createOrder` with status management.
2. Atomic stock decrement via `db.updateProductStock` with negative stock prevention.
3. Seller Telegram instant order alerts (`src/lib/telegram.ts`) with test mock mode fallback.
4. Comprehensive 7-suite verification test harness design for `scripts/verify_m4_sales_closing.ts`.

Produce a detailed handoff report in:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m4_3\handoff.md
Send completion message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9) with findings and path.

CONSTRAINTS:
- Do NOT write or modify application source code.
- Only write state/metadata files in your own working directory.
