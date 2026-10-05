## 2026-10-04T12:14:48Z
You are explorer_m2_1, a teamwork_preview_explorer agent.
Your working directory is:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_1
Your parent is orchestrator_1 (conversation ID: 6b3e572e-862e-4f21-b794-2d675500d1e9).

MANDATORY FIRST STEPS:
1. Read the authoritative user requirements at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project scope and architecture at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\PROJECT.md
3. Read the specification mining survey at:
   c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\spec_miner_survey_2\handoff.md

Your mission for Milestone 2 (Burmese NLP, Digit Normalization & Logistics Matrix):
Analyze `src/lib/burmese-converter.ts` and formulate a comprehensive implementation blueprint for:
1. Robust Zawgyi vs Unicode auto-detection (`isZawgyi`) and conversion (`normalizeBurmese`).
2. Complete Burmese digit normalization: `၀-၉`, Thai zero `๐`, and Shan digits `႐-႙` to standard ASCII `0-9`.
3. Burmese consonant letter Wa `ဝ` (U+101D) vs digit zero `၀` (U+1040) contextual correction for phone numbers (e.g. `ဝ၉...` -> `09...`).
4. Robust Myanmar phone normalizer (`normalizeMyanmarPhone`): handles local `09...`, international `+959...` / `959...`, hyphens, spaces, and Burmese digits, returning standardized `09XXXXXXXXX`.
5. Canonical Unicode diacritic tone mark ordering and duplicate removal.
6. Design unit test cases covering all edge cases.

Produce a detailed technical handoff report in:
c:\Users\bobo\Documents\antigravity\fervent-hawking\.agents\teamwork\explorer_m2_1\handoff.md
Once written, send a message to parent (Recipient: 6b3e572e-862e-4f21-b794-2d675500d1e9).

CONSTRAINTS:
- Do NOT write or modify application source code.
- Only write state/metadata files in your own working directory.
