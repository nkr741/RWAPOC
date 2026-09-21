---
name: heal
description: Heal broken Playwright locators in a test file
---

# /heal — Fix Broken Locators

When a test fails due to broken selectors, this command analyzes the test file and the target page HTML to suggest healed locators.

## Steps

1. Read the test file provided as argument (or the most recently failed test)
2. Identify all locators in the file
3. For each locator, check if the element exists in the demo app HTML (`demo-app/index.html`)
4. Check both normal and broken (`?broken`) versions of the page
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
/heal self-healing/without-ai/01-fallback-locators.spec.ts
/heal                  # heals the last failed test
```
