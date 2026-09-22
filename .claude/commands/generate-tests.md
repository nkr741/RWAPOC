---
name: generate-tests
description: Generate Playwright tests from a natural language feature description
---

# /generate-tests — AI Test Generation

Generate complete Playwright test files from plain English descriptions.

## Steps

1. Read the feature description provided as argument
2. Open the RWA page with the Playwright MCP server (`browser_navigate` to $BASE_URL) and snapshot it, or read the matching page object in `pages/`
3. Identify test scenarios: happy path, edge cases, error cases
4. Generate a complete `.spec.ts` file with:
   - Proper `test.describe` wrapper
   - Semantic locators (`getByRole`, `getByLabel`, `getByPlaceholder`)
   - Web-first assertions (`toBeVisible`, `toHaveText`)
   - No `waitForTimeout`, no `force: true`
   - Descriptive test names

## Usage

```
/generate-tests "Test the login page with valid and invalid credentials"
/generate-tests "Test transaction filtering by amount and category"
/generate-tests "Test the profile update form with validation"
```

## Output

Writes the spec under `tests/e2e/` following `fixtures/test.ts`, then runs it with `npx playwright test <file>` to verify.
