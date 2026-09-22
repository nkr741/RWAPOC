---
name: audit-locators
description: Audit all locators in test files and rate their resilience S through F
---

# /audit-locators — Locator Resilience Audit

Scan test files for Playwright locators and rate each one's resilience to UI changes.

## Steps

1. Scan all `.spec.ts` files in `tests/` and `pages/` (or the specified path)
2. Extract every locator call: `getByRole`, `getByTestId`, `locator()`, `getByLabel`, etc.
3. Rate each locator using the tier system:
   - **S tier**: `getByRole`, `getByLabel` — survives any redesign
   - **A tier**: `getByTestId`, `getByPlaceholder` — survives unless test IDs removed
   - **B tier**: Simple structural CSS — survives minor changes
   - **C tier**: CSS class selectors — breaks on styling changes
   - **D tier**: Complex CSS, nth-child — very fragile
   - **F tier**: Absolute XPath — breaks on any DOM change
4. Generate a summary report with counts per tier
5. For each C/D/F locator, suggest an upgrade

## Output

Table format:

```
File                              S  A  B  C  D  F  Score
01-fallback-locators.spec.ts      4  2  1  0  0  0  95%
02-attribute-cascade.spec.ts      1  5  0  1  0  0  88%
...
```

Then detailed findings for anything below B tier.

## Usage

```
/audit-locators                           # audit all specs
/audit-locators pages/               # audit only the page objects
```
