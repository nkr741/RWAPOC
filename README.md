# Ryvan E2E — Hybrid + POM Playwright Framework

Enterprise-grade Playwright + TypeScript test automation framework built against the
**Cypress Real World App (RWA)** — a full-stack React + Express application with real
authentication, transactions, bank accounts, notifications, and user management.

Uses a **Hybrid testing model**: Page Object Model (POM) + Data-Driven + Keyword-Driven
components, all running in a **single browser window** per project with cross-browser support.

---

## Quick Start

```bash
npm ci
npx playwright install --with-deps chromium firefox webkit

# Start the RWA (in a separate terminal)
cd rwa-app && yarn dev

# Run tests
cp .env.example .env                 # set QA_USER / QA_PASSWORD
npm test                             # full suite: API + Chromium
npm run test:e2e                     # UI E2E only (Chromium)
npm run test:api                     # API layer only
npm run test:cross-browser           # Chromium + Firefox + WebKit
npm run report                       # open HTML report
```

Requires **Node >= 22.5**.

---

## Framework Architecture — Hybrid Model

```
┌─────────────────────────────────────────────────────────────┐
│                        TEST LAYER                           │
│  tests/e2e/          UI E2E specs                           │
│  tests/api/          API contract specs                     │
│  tests/integration/  UI + API + DB three-layer validation   │
│  tests/practice/     Playwright feature demos               │
│  tests/setup/        Auth setup (storageState)              │
└────────────────┬────────────────────────────────────────────┘
                 │ imports
┌────────────────▼────────────────────────────────────────────┐
│                     FIXTURE LAYER                           │
│  fixtures/test.ts   Single entry point — DI for all POM,   │
│                     components, API client, DB client       │
└────────────────┬────────────────────────────────────────────┘
                 │ injects
    ┌────────────┼─────────────┬──────────────┐
    ▼            ▼             ▼              ▼
┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐
│   POM   │ │ KEYWORD  │ │   API   │ │  DATABASE  │
│  LAYER  │ │  LAYER   │ │  LAYER  │ │   LAYER    │
│         │ │          │ │         │ │            │
│ pages/  │ │ pages/   │ │ utils/  │ │ utils/     │
│ *.page  │ │ compo-   │ │ api.    │ │ db.client  │
│         │ │ nents/   │ │ client  │ │            │
└────┬────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘
     │           │            │             │
     ▼           ▼            ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                 CYPRESS REAL WORLD APP                       │
│  Frontend: React + MUI (port 3000)                          │
│  Backend:  Express REST API (port 3001)                     │
│  Database: lowdb JSON file                                  │
└─────────────────────────────────────────────────────────────┘
```

### Three pillars of the Hybrid model

| Pillar | Location | Purpose |
|--------|----------|---------|
| **Page Object Model** | `pages/*.page.ts` | Encapsulate page locators + actions. Extends `BasePage` with template method (`open` → `goto` + `waitForLoaded`) |
| **Keyword-Driven** | `pages/components/` | Reusable UI component classes (`SideNavComponent`, `TopNavComponent`) injected as fixtures — shared navigation keywords across all tests |
| **Data-Driven** | `data/test-data.ts` | Dynamic test data via `@faker-js/faker` (`TestUsers`, `BankAccountData`, `TransactionData`, `SignupData`) separated from test logic |

---

## Directory Structure

```
ryvan-e2e/
├── config/
│   └── env.ts                    Typed env config — fails fast on missing vars
├── data/
│   └── test-data.ts              Dynamic test data via faker (data-driven layer)
├── fixtures/
│   └── test.ts                   Fixture hub — POM + components + API + DB
├── pages/
│   ├── base.page.ts              Abstract base: sidenav/topnav composition
│   ├── components/
│   │   ├── sidenav.component.ts  Keyword-driven: navigateHome, logout, etc.
│   │   └── topnav.component.ts   Keyword-driven: newTransaction, notifications
│   ├── signin.page.ts
│   ├── signup.page.ts
│   ├── home.page.ts
│   ├── transaction.page.ts
│   ├── bankaccount.page.ts
│   ├── notification.page.ts
│   └── settings.page.ts
├── tests/
│   ├── setup/
│   │   └── auth.setup.ts         Auth once → storageState
│   ├── e2e/                      UI E2E tests (10 spec files, 72 tests)
│   │   ├── auth.spec.ts
│   │   ├── sidenav.spec.ts
│   │   ├── bank-accounts.spec.ts
│   │   ├── user-settings.spec.ts
│   │   ├── notifications.spec.ts
│   │   ├── transaction.spec.ts
│   │   ├── multi-tab.spec.ts
│   │   ├── dialogs.spec.ts
│   │   ├── cookies-storage.spec.ts
│   │   └── iframes.spec.ts
│   ├── api/                      API contract tests (6 spec files, 22 tests)
│   │   ├── bank-accounts.api.spec.ts
│   │   ├── contacts.api.spec.ts
│   │   ├── likes-comments.api.spec.ts
│   │   ├── notifications.api.spec.ts
│   │   ├── transactions.api.spec.ts
│   │   └── users.api.spec.ts
│   ├── integration/              Three-layer: UI → API → DB (1 spec)
│   │   └── transaction.integration.spec.ts
│   └── practice/                 Playwright feature demos (6 specs, 20 tests)
│       ├── form-controls.spec.ts
│       ├── advanced-actions.spec.ts
│       ├── file-operations.spec.ts
│       ├── network-mocking.spec.ts
│       ├── soft-assertions.spec.ts
│       └── visual-regression.spec.ts
├── utils/
│   ├── api.client.ts             Typed REST client with ApiError
│   ├── db.client.ts              Direct JSON DB reader
│   ├── login.helper.ts           Smart login state management
│   └── onboarding.helper.ts     Auto-dismiss onboarding dialog
├── types/
│   ├── global.d.ts
│   └── matchers.d.ts
├── playwright.config.ts          Projects: api, setup, chromium, firefox, webkit
├── tsconfig.json
├── .env
└── package.json
```

---

## Test Coverage — 114 Tests

| Category | Spec File | Tests | What it covers |
|----------|-----------|-------|----------------|
| **Auth** | `auth.spec.ts` | 6 | Redirect, signin, invalid creds, validation, signup flow, page navigation |
| **Side Nav** | `sidenav.spec.ts` | 6 | User info display, all nav links, logout |
| **Bank Accounts** | `bank-accounts.spec.ts` | 5 | Navigate, display, create, validate, delete |
| **User Settings** | `user-settings.spec.ts` | 4 | Navigate, pre-populated fields, update profile, validate |
| **Notifications** | `notifications.spec.ts` | 4 | Sidenav nav, topbar nav, list/empty state, click handling |
| **Transactions** | `transaction.spec.ts` | 11 | Feed display, tab switching, new transaction, search, payment, request, return, detail view, like, comment |
| **Multi-Tab** | `multi-tab.spec.ts` | 5 | Shared auth across tabs, independent navigation, cross-tab data sync, page enumeration, popup handling |
| **Dialogs** | `dialogs.spec.ts` | 7 | Native alert/confirm/prompt (accept/dismiss), addLocatorHandler overlay, sequential dialogs |
| **Cookies & Storage** | `cookies-storage.spec.ts` | 16 | Session cookies, cookie injection, clearCookies auth loss, localStorage read/write/enumerate/clear, sessionStorage isolation, addInitScript |
| **Iframes & Frames** | `iframes.spec.ts` | 8 | frameLocator, frame by name/URL, enumerate frames, nested iframes, postMessage, RWA embed, multi-tab + iframe |
| **Integration** | `transaction.integration.spec.ts` | 1 | Full three-layer: UI payment → API verification → DB persistence |
| **Form Controls** | `form-controls.spec.ts` | 4 | check/uncheck, selectOption (value/label/index), radio buttons, e-commerce sort |
| **Advanced Actions** | `advanced-actions.spec.ts` | 5 | hover, keyboard.press, keyboard.type, dragTo, mouse.click coordinates |
| **File Operations** | `file-operations.spec.ts` | 3 | setInputFiles (buffer + disk), download + saveAs |
| **Network Mocking** | `network-mocking.spec.ts` | 4 | route.abort, route.continue (headers), route.fulfill, route.fetch + modify |
| **Soft Assertions** | `soft-assertions.spec.ts` | 2 | expect.soft, mixed soft + hard assertions |
| **Visual Regression** | `visual-regression.spec.ts` | 2 | toHaveScreenshot (full page + element) |
| **API - Bank Accounts** | `bank-accounts.api.spec.ts` | 4 | CRUD + auth check |
| **API - Contacts** | `contacts.api.spec.ts` | 2 | List + create |
| **API - Likes/Comments** | `likes-comments.api.spec.ts` | 4 | Like, get likes, comment, get comments |
| **API - Notifications** | `notifications.api.spec.ts` | 2 | List + auth check |
| **API - Transactions** | `transactions.api.spec.ts` | 4 | Paginated list, public feed, create, get by ID |
| **API - Users** | `users.api.spec.ts` | 6 | List, profile, search, create, login, invalid login |
| **Total** | | **114** | |

---

## Key Design Decisions

### Single Browser Window
All UI tests share one browser context per worker via `sharedContext`/`sharedPage` fixtures.
No multiple Chrome windows opening per test.

### Smart Login State
`ensureLoggedIn()` / `ensureLoggedOut()` helpers check current state before acting —
avoids redundant login flows when tests run sequentially in one window.

### Auto-dismiss Onboarding
`page.addLocatorHandler()` automatically detects and dismisses the RWA's 3-step onboarding
dialog (Welcome → Bank Account Form → Done) whenever it appears.

### Component Composition
`BasePage` composes `SideNavComponent` + `TopNavComponent` — every page object inherits
navigation keywords without repeating locators.

### RWA-specific: `data-test` attributes
Config uses `testIdAttribute: 'data-test'` (not `data-testid`). Bank account form fields
use `.locator('input')` chaining because `data-test` is on the MUI wrapper `<div>`.

### Dynamic Test Data via Faker
`@faker-js/faker` generates unique, realistic data per run — bank names, routing numbers,
transaction amounts, user credentials. No hardcoded test data. Assertions reference
`TestUsers.default.firstName` instead of hardcoded strings.

### Strict Lint & Type Safety
Zero ESLint errors (including `playwright/no-networkidle`, `playwright/no-wait-for-timeout`,
`playwright/no-conditional-in-test`). Zero TypeScript errors. All `JSON.parse()` and
`.json()` calls use explicit type assertions — no `any` leakage.

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Full suite (all projects) |
| `npm run test:e2e` | UI E2E tests on Chromium |
| `npm run test:api` | API tests only (no browser) |
| `npm run test:integration` | Three-layer integration test |
| `npm run test:cross-browser` | Chromium + Firefox + WebKit |
| `npm run test:firefox` | Firefox only |
| `npm run test:webkit` | WebKit only |
| `npm run test:practice` | Practice tests (external sites, no RWA needed) |
| `npm run test:update-snapshots` | Regenerate visual regression baselines |
| `npm run test:smoke` | Smoke tests (`@smoke` tag) |
| `npm run test:ui` | Playwright UI mode |
| `npm run test:debug` | Debug mode |
| `npm run report` | Open HTML report |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run check` | typecheck + lint |

---

## Cross-Browser Support

| Project | Engine | Status |
|---------|--------|--------|
| `chromium` | Desktop Chrome | Primary |
| `firefox` | Desktop Firefox | Supported |
| `webkit` | Desktop Safari | Supported |

Run specific browsers:
```bash
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project=chromium --project=firefox --project=webkit
```

---

## Sharding (CI/CD)

Split the test suite across multiple machines for parallel CI execution:

```bash
# Split into 3 shards
npx playwright test --shard=1/3   # Machine 1
npx playwright test --shard=2/3   # Machine 2
npx playwright test --shard=3/3   # Machine 3
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@playwright/test` | Test runner, browser automation, assertions |
| `@faker-js/faker` | Dynamic test data generation |
| `dotenv` | Environment variable loading |
| `eslint` + `eslint-plugin-playwright` | Linting with Playwright best practices |
| `typescript` + `typescript-eslint` | Type checking + typed lint rules |
| `prettier` | Code formatting |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_URL` | No | `http://localhost:3000` | RWA frontend URL |
| `API_URL` | No | `http://localhost:3001` | RWA backend URL |
| `QA_USER` | **Yes** | — | Test user username |
| `QA_PASSWORD` | **Yes** | — | Test user password |
