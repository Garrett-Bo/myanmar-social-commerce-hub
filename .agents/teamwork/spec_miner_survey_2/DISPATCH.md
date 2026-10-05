## 2026-10-04T11:34:16Z
You are spec_miner_survey_2, a teamwork_preview_spec_miner agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_survey_2
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEP: Read the authoritative user requirements at:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md

Your mission for Step 0 (Survey Phase):
1. Extract and mine the exact specifications, business logic, and rules required for Requirement R3:
   - Burmese Sales Closing & Logistics Calculation:
     * Zawgyi vs Unicode auto-detection and bidirectional/normalization algorithms (encoding conversion, Burmese digits 0-9 ๐-၉ / ၀-၉ to Arabic, tone mark normalization).
     * Burmese conversational intent recognition, colloquialisms, and slang (e.g. "ဈေးဘယ်လောက်လဲ", "ပစ္စည်းရှိလား", "discount ရမလား", "မှာမယ်", "kbzpay ရလား", etc.).
     * Product matching against MMK pricing and inventory in Burmese.
     * Logistics & Township delivery calculation rules: 45+ Myanmar townships (Yangon townships, Mandalay townships, regional townships/divisions) with standard delivery fees, estimated delivery timelines (days), and regional highway bus gates (e.g., Aung Mingalar, Highway gates, delivery to bus station).
     * Checkout details collection: customer name, phone number (Myanmar format 09...), full delivery address, township, payment methods (KBZPay, WavePay, Cash on Delivery / COD), payment screenshot or transaction ID handling.
2. Check if any Burmese dictionary, township data, or NLP helpers exist in the project or need to be authored.
3. Document a comprehensive specification report in:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_survey_2\handoff.md
4. Once handoff.md is written, send a message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9) with a summary of findings and the path to handoff.md.

CONSTRAINTS:
- Do NOT modify application source code.
- Only write your state and metadata files in your own working directory.

## 2026-10-04T11:35:01Z
**Context**: Critical Architectural Update for Survey
**Content**: Sentinel has provided a critical requirement update recorded in ORIGINAL_REQUEST.md:
"chat wont store on ourside we will jsut pull the tik tok and facebook api messaging .. it's expensive to store"
- DO NOT store messages or chat history in the database.
- Database only stores: shops, channel credentials, products/stock, and closed orders/vouchers.
- Conversation threads are pulled on-demand or processed ephemerally in-memory.
**Action**: Please reflect this zero-chat-storage requirement in your spec mining analysis and handoff report.

