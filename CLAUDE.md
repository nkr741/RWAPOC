# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Playwright + TypeScript E2E test framework targeting the Cypress Real World App (RWA) — a React + Express banking app. 117 unique tests across UI, API, integration, and practice categories; 262 test runs once the UI specs are replayed on Chromium, Firefox and WebKit.

## Commands

```bash
# Run EVERY project — api, setup, chromium, practice, firefox, webkit (262 runs).
# Firefox and WebKit need `npx playwright install firefox webkit` first, and the
# RWA app must be started the way CI does (`yarn build && yarn start:ci`) — against
# the Vite dev server Firefox never fires 'load' and every navigation times out.
npm test

# Run by category
npm run test:e2e          # UI E2E (Chromium)
npm run test:api          # API tests (no browser)
npm run test:integration  # UI → API → DB three-layer tests
npm run test:practice     # Demo/feature tests
npm run test:smoke        # @smoke tagged tests only

# Cross-browser
npm run test:cross-browser   # Chromium + Firefox + WebKit
npm run test:firefox
npm run test:webkit

# Run a single test file
npx playwright test tests/e2e/auth.spec.ts

# Run a single test by name
npx playwright test -g "should login"

# Debug and inspect
npm run test:ui            # Playwright Inspector UI mode
npm run test:debug         # Debug mode
npm run report             # Open HTML report

# Code quality (CI gate)
npm run check              # typecheck + lint
npm run typecheck          # tsc --noEmit
npm run lint               # ESLint
npm run format             # Prettier
```

## Environment

Requires Node >= 22.5.0. Copy `.env.example` to `.env` with:
- `QA_USER` / `QA_PASSWORD` — seeded RWA test credentials (default password: `s3cret`)
- `BASE_URL` — frontend (default `http://localhost:3000`)
- `API_URL` — backend (default `http://localhost:3001`)

The RWA app lives in `rwa-app/` and runs on ports 3000/3001. Config is loaded and validated in `config/env.ts` (fail-fast on missing vars).

## Architecture

**Three-layer hybrid pattern:** Page Object Model + Keyword-Driven Components + Data-Driven tests.

### Test execution model
- All UI tests in a project share **one browser context/page** via worker-scoped `sharedPage` fixture (not isolated per test)
- `ensureLoggedIn()` / `ensureLoggedOut()` in `utils/login.helper.ts` skip redundant auth flows
- `utils/onboarding.helper.ts` auto-dismisses RWA's welcome dialog via `page.addLocatorHandler()`
- Tests run with `fullyParallel: false`, 1 worker per project

### Fixtures (`fixtures/`)
All POM classes, components, API/DB clients are injected as Playwright fixtures. The fixture file is the central wiring point — page objects are never instantiated directly in tests.

### Pages (`pages/`)
All pages extend `BasePage` which provides `open()` (goto + waitForLoaded) and composes `SideNavComponent` + `TopNavComponent`. Locators are declared as readonly properties, actions as async methods.

### Components (`pages/components/`)
`SideNavComponent` and `TopNavComponent` — keyword-driven wrappers exposing navigation actions. Composed into `BasePage`, also available as standalone fixtures.

### API client (`utils/api.client.ts`)
Typed REST client wrapping `APIRequestContext`. The `authedApi` fixture auto-authenticates on first use. Custom `ApiError` includes status + URL.

### DB client (`utils/db.client.ts`)
Reads RWA's `database.json` directly (lowdb format). Worker-scoped, single read cached for the shard.

### Test data (`data/test-data.ts`)
Faker-generated, declared `as const`. Tests reference data objects, not hardcoded strings.

## Key Conventions

- **Test ID attribute is `data-test`** (not `data-testid`) — set in `playwright.config.ts`
- **No `any`** — all `JSON.parse()` and `.json()` use explicit type assertions; ESLint enforces `no-explicit-any: error`
- **No `waitForTimeout`** — ESLint rule `playwright/no-wait-for-timeout: error`
- **No force clicks** — ESLint rule `playwright/no-force-option: error`
- **Every test must assert** — `playwright/expect-expect: error`
- **Floating promises are errors** — `@typescript-eslint/no-floating-promises: error`
- Prettier: single quotes, semicolons, 100 char width, trailing commas

## CI/CD

GitHub Actions (`.github/workflows/e2e.yml`):
- **PR gate:** typecheck + lint + API tests + smoke tests (Chromium)
- **Nightly:** full suite with 4-way sharding, all browsers, blob report merging, Slack/Teams notifications
- CI uses 2 retries; local uses 0
