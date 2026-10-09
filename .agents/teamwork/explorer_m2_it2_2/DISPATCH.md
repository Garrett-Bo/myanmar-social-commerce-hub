## 2026-10-07T06:53:44Z
You are explorer_m2_it2_2, a teamwork_preview_explorer agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_2
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read the challenger failure report at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\challenger_m2_2\handoff.md
4. Inspect the failing test suite at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\tests\challenge_m2_townships.ts

Your mission for Milestone 2 Iteration 2 Exploration:
Analyze `src/lib/myanmar-townships.ts` and formulate the exact remediation blueprint for the substring collision bug between `နေပြည်တော်` and `Pyay` (`ပြည်`):
1. In `TOWNSHIP_ALIASES['Zabuthiri']`, add `'နေပြည်တော်'`, `'နေပြည်တော်မြို့'`, `'naypyitaw'` so standalone capital queries resolve directly to Zabuthiri (Naypyitaw central township, 4,000 MMK, COD: true).
2. In Tier 2 prefix stripping, handle exact metro city names so they don't collapse to `""` and fall through to Tier 3.
3. In `isRegionalPrepaidOnly`, ensure metro indicators (`'yangon'`, `'mandalay'`, `'naypyitaw'`, `'ရန်ကုန်'`, `'မန္တလေး'`, `'နေပြည်တော်'`) return `false` (COD supported).
4. Verify all 61 locations and bus gates retain their exact behavior without regressions.

Produce a detailed remediation blueprint and proposed code in:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_it2_2\handoff.md
Once written, send a message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9).

CONSTRAINTS:
- Do NOT write or modify application source code.
- Only write state/metadata files in your own working directory.
