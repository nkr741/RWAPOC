---
name: heal
description: Heal broken Playwright locators in a test file
---

# /heal — Fix Broken Locators

When a test fails due to broken selectors, this command analyzes the test file and the target page HTML to suggest healed locators.

## Steps

1. Read the test file provided as argument (or the most recently failed test)
2. Identify all locators in the file
3. For each locator, check it against the live RWA page (Playwright MCP `browser_snapshot`) or the page object in `pages/`
4. Prefer `data-test` ids (the repo test-id attribute) and role/label locators
5. For any locator that won't work on the broken page, suggest a resilient replacement

## Locator Priority

Prefer (in order): `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS → XPath

## Output

For each broken locator, show:

- **Line number** in the test file
- **Current selector** (broken)
- **Suggested selector** (healed)
- **Why** it's more resilient

Then offer to apply all fixes automatically.

## Usage

```
/heal tests/e2e/bank-accounts.spec.ts
/heal                  # heals the last failed test
```
