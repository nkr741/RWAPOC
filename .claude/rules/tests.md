---
paths:
  - tests/**
  - pages/**
  - fixtures/**
---

# Rules for test code (loaded only when these paths are touched)

- Every test must contain at least one `expect`; prefer web-first assertions (`toBeVisible`, `toHaveText`) over reading state and asserting later.
- Locator priority: `getByTestId` (attribute is `data-test`) → `getByRole` → `getByLabel` → `getByText` → CSS. Never XPath.
- No `waitForTimeout`, no `{ force: true }`, no `any`, no floating promises — ESLint blocks all four and so does the PreToolUse hook.
- Tests share one page per worker (`sharedPage`): use `ensureLoggedIn()` / `ensureLoggedOut()` and never assume a previous test's state.
- Test data comes from `data/test-data.ts` (faker); no literals for names, amounts, or credentials.
- New page objects extend `BasePage`, declare locators as `readonly`, and expose actions as async methods; wire them in `fixtures/test.ts`, never `new` them in a test.
