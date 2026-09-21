---
name: generate-tests
description: Generate Playwright tests from a natural language feature description
---

# /generate-tests — AI Test Generation

Generate complete Playwright test files from plain English descriptions.

## Steps

1. Read the feature description provided as argument
2. Read the target page HTML from `demo-app/index.html`
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

Writes the generated spec file to `self-healing/generated/` and runs it with `--headed` to verify.
