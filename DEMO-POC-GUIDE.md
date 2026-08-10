# Ryvan E2E — POC Demo Presentation Guide

> Step-by-step guide for presenting the Playwright + TypeScript hybrid framework in a POC demo call.
> Covers all 30 curriculum modules with code walkthroughs and architect-level Q&A.

---

## Pre-Demo Checklist

```bash
# Terminal 1 — Start the Cypress Real World App
cd rwa-app && yarn dev          # Frontend: localhost:3000, Backend: localhost:3001

# Terminal 2 — Verify all 114 tests pass
npm test                        # Full suite: API + E2E + Practice + Integration

# Terminal 3 — Open Playwright UI mode (optional, for live demo)
npm run test:ui
```

- Have VS Code open with the project root
- Have a browser tab on `localhost:3000` showing the RWA
- Have the Playwright HTML report ready: `npm run report`

---

## PHASE 1: Foundation (Modules 1-5) — 10 min

---

### Module 1: JavaScript / TypeScript Essentials

**What to show:** `config/env.ts` → typed config with `EnvConfig` interface, `req()` fail-fast function

```
Open: config/env.ts
Point out: interface EnvConfig, readonly properties, template literals in error messages
```

**Code highlight:**
```typescript
// config/env.ts — TypeScript interfaces, const assertions, fail-fast pattern
export interface EnvConfig {
  readonly baseURL: string;
  readonly apiURL: string;
  readonly user: { readonly username: string; readonly password: string };
}
function req(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
```

Then show `data/test-data.ts` → `@faker-js/faker` dynamic data, `as const` assertions, factory functions (`SignupData.newUser()`).

```typescript
// data/test-data.ts — Dynamic test data via faker
import { faker } from '@faker-js/faker';

export const BankAccountData = {
  valid: {
    bankName: `${faker.company.name()} Bank`,
    routingNumber: faker.finance.routingNumber(),
    accountNumber: faker.finance.accountNumber(9),
  },
} as const;

export const SignupData = {
  newUser: () => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    password: faker.internet.password({ length: 12 }),
  }),
} as const;
```

**Q&A:**

**Q: Why TypeScript over plain JavaScript for test automation?**
A: Compile-time type safety catches locator typos, wrong method signatures, and missing properties before tests run. IDE autocompletion on page objects means testers don't need to memorize APIs. The `EnvConfig` interface in `config/env.ts` guarantees every consumer gets the right shape — if someone misspells `baseURL` as `baseUrl`, TypeScript fails the build, not the test at runtime. Cost: zero runtime overhead (TS compiles away), and Playwright has first-class TS support with zero config. The project maintains zero ESLint errors and zero TypeScript errors — all `JSON.parse()` and `.json()` calls use explicit type assertions to prevent `any` leakage.

**Q: How do you handle environment-specific configuration without hardcoding?**
A: `config/env.ts` uses dotenv + a `req()` function that throws immediately on missing required vars. Optional vars get defaults (`process.env.BASE_URL || 'http://localhost:3000'`). This means CI fails fast with a clear error instead of timing out on a wrong URL. The `.env` file is gitignored; `.env.example` is committed as documentation.

**Q: What's the `as const` assertion doing in test data?**
A: It makes the object deeply readonly and narrows string types to literal types. This prevents accidental mutation across tests sharing data and gives better IDE hints. Combined with faker, it means `BankAccountData.valid.bankName` is a unique string per run but immutable once generated — tests can read it but never accidentally overwrite it.

---

### Module 2: Node.js & npm Ecosystem

**What to show:** `package.json` → scripts section, `playwright.config.ts` → project configuration

```
Open: package.json (scripts section)
Open: playwright.config.ts (full file)
```

**Code highlight:**
```json
// package.json — npm scripts as the single entry point
"test": "playwright test",
"test:e2e": "playwright test --project=chromium",
"test:api": "playwright test --project=api",
"test:cross-browser": "playwright test --project=chromium --project=firefox --project=webkit",
"test:practice": "playwright test --project=practice",
"test:smoke": "playwright test --grep @smoke"
```

**Q&A:**

**Q: Why not use a task runner like Gulp or a Makefile?**
A: npm scripts are already installed, universally understood, and sufficient. Every developer knows `npm test`. Playwright's CLI handles parallelism, filtering, and reporting — a task runner would just be a wrapper around `npx playwright test` with flags. Unnecessary abstraction.

**Q: How does the project structure scale for a team of 10+ QA engineers?**
A: The `projects` array in `playwright.config.ts` provides natural boundaries. Each project (`api`, `chromium`, `practice`) has its own `testMatch`/`testIgnore` patterns, dependencies, and device config. New test categories (e.g., `mobile`, `performance`) are added as new project entries — no restructuring needed. The fixture DI system means page objects and utilities are automatically available to any test that imports from `fixtures/test.ts`.

**Q: What Node version and why?**
A: Node >= 22.5 for native TypeScript support in newer Playwright versions. No Babel, no ts-node — Playwright handles TS compilation internally. The `tsconfig.json` uses `module: "ES2022"` with `moduleResolution: "bundler"` to support ESM-only packages like `@faker-js/faker` — the modern TypeScript config that avoids deprecated `commonjs`/`node` settings.

---

### Module 3: Playwright Fundamentals & Architecture

**What to show:** `playwright.config.ts` → full config (already open), then `fixtures/test.ts` → fixture system

```
Open: playwright.config.ts — show projects array, use block, timeouts, reporters
Open: fixtures/test.ts — show the full DI system
```

**Code highlight:**
```typescript
// playwright.config.ts — key architectural decisions
fullyParallel: false,    // Sequential within spec (shared browser)
workers: 1,              // Single worker = single browser window
testIdAttribute: 'data-test',  // RWA uses data-test, not data-testid
retries: process.env.CI ? 2 : 0,  // Retry only in CI
```

**Q&A:**

**Q: Why `workers: 1` and `fullyParallel: false`? Doesn't that slow everything down?**
A: This is a deliberate POC decision for single-browser-window testing — simulates a real user session where tests flow sequentially in one window. For CI speed, you flip to `workers: 4` + `fullyParallel: true`, but each test then needs full isolation (own login, own data). The `sharedContext`/`sharedPage` worker-scoped fixtures enable the single-window model. In production, you'd use sharding (`--shard=1/3`) across CI machines instead of local parallelism.

**Q: What's the difference between `testIdAttribute: 'data-test'` and the default `data-testid`?**
A: Playwright's `getByTestId()` looks for `data-testid` by default. The RWA app uses `data-test` attributes on its elements. One line in config (`testIdAttribute: 'data-test'`) makes every `getByTestId()` call work correctly. Without it, every locator would fail silently — elements exist but `getByTestId` wouldn't find them. This is the most common gotcha when adopting Playwright on an existing app.

**Q: How does the reporter config work?**
A: `['list']` gives real-time terminal output during runs. `['html', { open: 'never' }]` generates a self-contained HTML report with screenshots, traces, and step details. `open: 'never'` prevents auto-opening in CI. In CI, you'd add `['junit']` for test management integration and `['blob']` for sharded report merging.

---

### Module 4: Selectors & Locator Strategies

**What to show:** `pages/signin.page.ts`, `pages/components/sidenav.component.ts` → locator examples

```
Open: pages/signin.page.ts — getByLabel, getByRole, getByTestId
Open: pages/components/sidenav.component.ts — getByTestId for navigation
Open: tests/e2e/auth.spec.ts — show locator usage in tests
```

**Code highlight:**
```typescript
// signin.page.ts — multiple locator strategies
this.username = page.getByLabel('Username');           // Accessible locator
this.password = page.getByLabel('Password');           // Accessible locator
this.submitBtn = page.getByRole('button', { name: 'Sign In' });  // Role locator

// sidenav.component.ts — test ID locators
this.userFullName = page.getByTestId('sidenav-user-full-name');   // data-test attribute
this.homeLink = page.getByTestId('sidenav-home');

// auth.spec.ts — CSS + text locators
page.locator('[data-test="signup"]');                  // CSS attribute selector
page.locator('text=Username is required');             // Text selector
```

**Q&A:**

**Q: What's the locator priority/strategy in this framework?**
A: Hierarchy: `getByRole` > `getByLabel` > `getByTestId` > CSS selector. Role and label locators match how users and assistive tech find elements — they survive CSS refactors. `getByTestId` is the fallback for elements without semantic meaning (like sidebar links with `data-test` attributes). Raw CSS selectors are last resort. The RWA heavily uses `data-test` attributes, so `getByTestId` is dominant here.

**Q: Why does `bankaccount-bankName-input` need `.locator('input')` chaining?**
A: MUI (Material UI) wraps `<input>` elements in `<div>` containers. The `data-test` attribute is on the wrapper `<div>`, not the actual `<input>`. So `getByTestId('bankaccount-bankName-input')` finds the `<div>`, and `.locator('input')` drills down to the real input element. This is a common pattern with component libraries.

**Q: How do you handle dynamic locators (lists, tables)?**
A: `page.locator('[data-test*="transaction-item"]')` uses CSS `*=` (contains) for repeating items. `.filter({ hasText: 'something' })` narrows by content. `.first()`, `.nth(n)`, `.last()` for positional access. For tables: `page.locator('table tbody tr')` gives all rows, then chain `.locator('td').nth(2)` for a specific column.

---

### Module 5: Assertions & Expect API

**What to show:** `tests/practice/soft-assertions.spec.ts`, then assertions in `tests/e2e/auth.spec.ts`

```
Open: tests/practice/soft-assertions.spec.ts — soft vs hard assertions
Open: tests/e2e/auth.spec.ts — various assertion patterns
```

**Code highlight:**
```typescript
// Soft assertions — continue on failure, report all at end
await expect.soft(page.locator('#checkboxes')).toBeVisible();
await expect.soft(page.locator('#checkboxes input')).toHaveCount(2);
await expect.soft(page.locator('h3')).toContainText('Checkboxes');
await expect(page).toHaveURL(/\/checkboxes/);  // Hard assertion = final gate

// Auto-retrying assertions (built into Playwright)
await expect(page).toHaveURL(/\/signin/);       // Retries until URL matches
await expect(element).toBeVisible();             // Retries until visible
await expect(element).toContainText('...');      // Retries until text appears

// Non-retrying assertions (plain expect)
expect(cookies.length).toBeGreaterThan(0);       // Immediate check, no retry
expect(dialogMessage).toBe('Test alert message');
```

**Q&A:**

**Q: When should you use `expect.soft()` vs regular `expect()`?**
A: `expect.soft()` collects failures without stopping — use it for validation sweeps where you want ALL failures in one report (e.g., verifying 10 fields on a page). Regular `expect()` stops immediately — use it for preconditions that make subsequent steps meaningless (e.g., if login failed, don't test the dashboard). Pattern: soft assertions for data validation, hard assertion at the end as a gate.

**Q: What's the difference between `expect(locator).toBeVisible()` and `expect(value).toBe(true)`?**
A: `expect(locator).toBeVisible()` is an auto-retrying web assertion — it polls the DOM until the element becomes visible or times out (default 10s via `expect.timeout`). `expect(value).toBe(true)` is a plain assertion that evaluates once, immediately. The first survives dynamic pages; the second is for computed values you already have in hand.

**Q: How does assertion timeout differ from action timeout?**
A: `expect.timeout: 10_000` (10s) is how long auto-retrying assertions wait. `actionTimeout: 15_000` (15s) is how long actions like `click()` and `fill()` wait for actionability. `navigationTimeout: 30_000` (30s) is for page loads. `timeout: 60_000` (60s) is the overall test timeout. These are layered — a test can pass its action timeout but fail on assertion timeout.

---

## PHASE 2: Core Automation (Modules 6-10) — 15 min

---

### Module 6: Page Object Model (POM) Design

**What to show:** `pages/base.page.ts` → abstract base, `pages/home.page.ts` → concrete page, `fixtures/test.ts` → DI

```
Open: pages/base.page.ts — abstract class, composition, template method
Open: pages/home.page.ts or pages/signin.page.ts — concrete implementation
Open: fixtures/test.ts — how POMs are injected
```

**Code highlight:**
```typescript
// base.page.ts — Component Composition (not inheritance for nav)
export abstract class BasePage {
  readonly sidenav: SideNavComponent;  // Composition, not inheritance
  readonly topnav: TopNavComponent;    // Every page gets nav keywords for free

  constructor(public readonly page: Page) {
    this.sidenav = new SideNavComponent(page);
    this.topnav = new TopNavComponent(page);
  }

  abstract readonly path: string;
  abstract waitForLoaded(): Promise<void>;

  async open(): Promise<void> {
    await this.page.goto(this.path);  // Template method: goto + wait
    await this.waitForLoaded();
  }
}
```

**Q&A:**

**Q: Why composition over inheritance for navigation components?**
A: Inheritance creates a rigid tree — if `HomePage extends BasePage` and you need a page without sidenav (like `SigninPage`), you'd need a parallel hierarchy. Composition means `BasePage` HAS a `SideNavComponent` and `TopNavComponent`. Each component is independently testable, reusable, and replaceable. The keyword-driven layer (components) is injected via the constructor — any page object inherits navigation keywords automatically.

**Q: How does the template method pattern work in `open()`?**
A: `open()` calls `this.page.goto(this.path)` (concrete step) then `this.waitForLoaded()` (abstract step each page implements). `HomePage.waitForLoaded()` might wait for the transaction feed; `SettingsPage.waitForLoaded()` waits for the form. Callers just call `page.open()` — they don't need to know what "loaded" means for each page. This is the Template Method pattern from GoF.

**Q: How are page objects injected into tests?**
A: Via Playwright's custom fixtures in `fixtures/test.ts`. Tests destructure what they need: `async ({ signinPage, sidenav, authedApi }) => { ... }`. Playwright instantiates them lazily — if a test doesn't use `bankAccountPage`, it's never created. This is dependency injection without a DI container.

---

### Module 7: Component Composition & Keyword-Driven

**What to show:** `pages/components/sidenav.component.ts`, `pages/components/topnav.component.ts`

```
Open: pages/components/sidenav.component.ts — keyword methods
Open: pages/components/topnav.component.ts — keyword methods
Open: tests/e2e/sidenav.spec.ts — usage of keyword methods
```

**Code highlight:**
```typescript
// sidenav.component.ts — Keyword-driven: method names ARE the keywords
export class SideNavComponent {
  async navigateHome()          { await this.homeLink.click(); }
  async navigateBankAccounts()  { await this.bankAccountsLink.click(); }
  async navigateNotifications() { await this.notificationsLink.click(); }
  async logout()                { await this.logoutLink.click(); }
}

// In a test — reads like a manual test script
await sidenav.navigateBankAccounts();
await bankAccountPage.waitForLoaded();
await expect(bankAccountPage.list).toBeVisible();
```

**Q&A:**

**Q: What makes this "keyword-driven" vs just "page object methods"?**
A: In keyword-driven testing, business actions are abstracted as reusable keywords. `navigateHome()`, `logout()`, `clickNewTransaction()` are keywords — they map 1:1 to business actions a manual tester would write in a test case. The difference from plain POM: keywords are shared across page objects via composition. Every page that extends `BasePage` gets `sidenav.navigateHome()` without defining it. A manual tester can read the test and understand it without knowing CSS selectors.

**Q: How does this scale when you have 50 pages?**
A: Components (keywords) scale horizontally. Adding a new sidebar link means adding one method to `SideNavComponent` — all 50 page objects get it automatically via composition. New page-specific actions go in the page object itself. The fixture hub (`fixtures/test.ts`) is the single registration point — add one fixture definition, and every test file can destructure it.

---

### Module 8: Data-Driven Testing

**What to show:** `data/test-data.ts` → centralized test data, show usage in tests

```
Open: data/test-data.ts — test data objects
Open: tests/e2e/auth.spec.ts — TestUsers, SignupData usage
```

**Code highlight:**
```typescript
// data/test-data.ts — Dynamic test data via @faker-js/faker
import { faker } from '@faker-js/faker';

export const TestUsers = {
  default: { username: ENV.user.username, password: ENV.user.password,
             firstName: 'Ted', lastName: 'Parisian' },
  invalid: { username: faker.internet.username(), password: faker.internet.password() },
} as const;

export const BankAccountData = {
  valid: {
    bankName: `${faker.company.name()} Bank`,         // Unique per run
    routingNumber: faker.finance.routingNumber(),      // Valid format
    accountNumber: faker.finance.accountNumber(9),
  },
} as const;

export const TransactionData = {
  payment: {
    amount: faker.number.int({ min: 1, max: 50 }).toString(),
    description: `Payment ${faker.word.adjective()} ${faker.word.noun()}`,
  },
} as const;

export const SignupData = {
  newUser: () => ({                                    // Factory function
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    username: faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    password: faker.internet.password({ length: 12 }),
  }),
} as const;

// Usage in tests — data is imported, not hardcoded
await signinPage.login(TestUsers.default.username, TestUsers.default.password);
const newUser = SignupData.newUser();  // Fresh unique user each time
await expect(tab).toContainText(TestUsers.default.firstName);  // Not hardcoded 'Ted'
```

**Q&A:**

**Q: Why `@faker-js/faker` instead of hardcoded test data?**
A: Faker generates unique, realistic data per run — bank names, routing numbers, transaction amounts, user credentials. This prevents (1) test coupling to specific data values, (2) false positives from stale assertions, (3) data collisions in parallel runs. Assertions like `toContainText(TestUsers.default.firstName)` reference the data source instead of hardcoded strings like `'Ted'`. Only the default login user has known values (from the seed DB); everything else is dynamic.

**Q: Why separate test data from test logic?**
A: Three reasons: (1) Change data without touching tests — update a password in one file, not 20 specs. (2) Same data across API and UI tests — `TestUsers.default` is used in both `auth.spec.ts` and `users.api.spec.ts`. (3) Visibility — a new team member reads `test-data.ts` and knows every data fixture in the framework. This is the Data-Driven pillar of the hybrid model.

**Q: How do you handle test data that changes per environment?**
A: `TestUsers.default` reads from `ENV.user.username` which reads from `.env`. In CI, environment variables override the `.env` file. So the same test data module works across dev, staging, and prod-like environments. Only credentials come from env vars; structural data (bank names, amounts) is generated by faker — environment-independent and unique per run.

**Q: What about data cleanup between tests?**
A: The RWA seeds its lowdb database on startup (`yarn dev` runs `yarn db:seed`). Faker-generated unique data prevents collisions — no cleanup needed. For destructive operations (delete bank account), the seed data has enough records to absorb it. In a real project, you'd add a `beforeAll` DB reset or use API calls to create/teardown test data.

---

### Module 9: Fixtures & Custom Test Extensions

**What to show:** `fixtures/test.ts` → deep dive into worker vs test scoped fixtures

```
Open: fixtures/test.ts — the entire file
```

**Code highlight:**
```typescript
// fixtures/test.ts — Two scopes: worker (shared) and test (per-test)

// WORKER-SCOPED: created once per worker, shared across all tests
sharedContext: [async ({ browser }, use) => {
  const context = await browser.newContext({ baseURL: ENV.baseURL });
  await use(context);
  await context.close();
}, { scope: 'worker' }],

sharedPage: [async ({ sharedContext }, use) => {
  const page = await sharedContext.newPage();
  await registerOnboardingHandler(page);  // Auto-dismiss onboarding
  await use(page);
}, { scope: 'worker' }],

// TEST-SCOPED: created per-test (but uses shared page under the hood)
page: async ({ sharedPage }, use) => { await use(sharedPage); },
signinPage: async ({ sharedPage }, use) => { await use(new SigninPage(sharedPage)); },

// API fixtures: stateless, created per-test
api: async ({ request }, use) => { await use(new ApiClient(request, ENV.apiURL)); },
authedApi: async ({ request }, use) => {
  const client = new ApiClient(request, ENV.apiURL);
  await client.login(ENV.user.username, ENV.user.password);
  await use(client);
},
```

**Q&A:**

**Q: What's the difference between worker-scoped and test-scoped fixtures?**
A: Worker-scoped fixtures (`{ scope: 'worker' }`) are created once and survive across all tests in that worker. `sharedContext` and `sharedPage` are worker-scoped — that's how we get a single browser window for all tests. Test-scoped fixtures are created fresh per test — `signinPage` is a new instance each time, but it wraps the same `sharedPage`. Think: worker scope = expensive resources (browser, DB connection), test scope = cheap wrappers (page objects, API clients).

**Q: How does `page: async ({ sharedPage }, use) => use(sharedPage)` work?**
A: This overrides Playwright's built-in `page` fixture. Normally, Playwright creates a new page (and context) per test. Our override makes `page` point to `sharedPage` — so when a test uses `{ page }`, it gets the shared worker-level page. Tests think they have their own page; they're actually sharing one. This is the key trick for single-browser-window testing.

**Q: How do you ensure test isolation with shared state?**
A: `ensureLoggedIn()` / `ensureLoggedOut()` helpers check current state before acting. If a test needs logged-out state, `ensureLoggedOut()` clears cookies + storage + navigates to `/signin`. If a test needs logged-in state, `ensureLoggedIn()` checks if already logged in (sidenav visible) and skips login if so. This is smart state management — not full isolation, but sufficient for sequential testing.

---

### Module 10: Authentication & Session Management

**What to show:** `tests/setup/auth.setup.ts`, `utils/login.helper.ts`, `tests/e2e/cookies-storage.spec.ts`

```
Open: tests/setup/auth.setup.ts — storageState setup
Open: utils/login.helper.ts — ensureLoggedIn/ensureLoggedOut
Open: playwright.config.ts — show setup dependency
```

**Code highlight:**
```typescript
// auth.setup.ts — Login once, save state for all tests
setup('authenticate once for the whole run', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Username').fill(ENV.user.username);
  await page.getByLabel('Password').fill(ENV.user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});

// playwright.config.ts — chromium depends on setup
{ name: 'chromium', dependencies: ['setup'], ... }

// login.helper.ts — Smart state detection
export async function ensureLoggedIn(page: Page): Promise<void> {
  const signinBtn = page.getByRole('button', { name: 'Sign In' });
  const sidenav = page.getByTestId('sidenav-user-full-name');
  await signinBtn.or(sidenav).waitFor({ timeout: 10_000 });
  if (await signinBtn.isVisible()) { /* login */ }
  // Already logged in? Do nothing.
}
```

**Q&A:**

**Q: What is `storageState` and why is it important?**
A: `storageState` serializes cookies + localStorage to a JSON file after login. Subsequent tests load this state into their browser context — they start already logged in, without hitting the login page. This saves ~2-3 seconds per test. The `setup` project runs first (via `dependencies: ['setup']`), and the auth file is reused by all browser projects (chromium, firefox, webkit).

**Q: How does `signinBtn.or(sidenav).waitFor()` work?**
A: `.or()` creates a composite locator that matches if EITHER element appears. This handles the race condition: after `page.goto('/')`, either the signin form appears (not logged in) or the sidenav appears (logged in). Without `.or()`, you'd need try/catch or arbitrary waits. This is Playwright's way of handling branching UI state.

**Q: How would you handle multi-role testing (admin, user, guest)?**
A: Create multiple setup projects: `setup-admin`, `setup-user`. Each saves to a different storageState file (`admin.json`, `user.json`). Test projects specify which state to use: `use: { storageState: 'playwright/.auth/admin.json' }`. Tests for guest flows use `storageState: { cookies: [], origins: [] }` (empty state).

---

## PHASE 3: Advanced Interactions (Modules 11-15) — 15 min

---

### Module 11: Form Handling — Inputs, Dropdowns, Checkboxes, Radio Buttons

**What to show:** `tests/practice/form-controls.spec.ts`

```
Open: tests/practice/form-controls.spec.ts — all 4 tests
```

**Code highlight:**
```typescript
// Checkboxes: check(), uncheck(), toBeChecked()
await checkbox1.check();
await expect(checkbox1).toBeChecked();
await checkbox2.uncheck();
await expect(checkbox2).not.toBeChecked();

// Dropdown: selectOption() — three ways
await dropdown.selectOption('1');                    // By value
await dropdown.selectOption({ label: 'Option 2' }); // By visible text
await dropdown.selectOption({ index: 1 });           // By position

// Radio buttons: check() auto-deselects others
await red.check();
await expect(red).toBeChecked();
await expect(blue).not.toBeChecked();  // Auto-deselected
```

**Q&A:**

**Q: Why `check()` instead of `click()` for checkboxes?**
A: `check()` is idempotent — calling `check()` on an already-checked checkbox does nothing. `click()` would uncheck it. This makes tests resilient to state changes — `beforeEach` can call `check()` without worrying if a previous test left it checked. Similarly, `uncheck()` on an unchecked box is a no-op.

**Q: How do you test a MUI Select (not native `<select>`)?**
A: MUI Select renders as a `<div>` with a dropdown overlay, not a native `<select>`. You can't use `selectOption()`. Instead: `await muiSelect.click()` to open the dropdown, then `await page.getByRole('option', { name: 'Value' }).click()`. The RWA's bank account form uses MUI inputs — that's why we chain `.locator('input')` after `getByTestId`.

---

### Module 12: Navigation, Waits & Multi-Tab

**What to show:** `tests/e2e/multi-tab.spec.ts` — all 5 tests

```
Open: tests/e2e/multi-tab.spec.ts — shared auth, independent nav, cross-tab sync
```

**Code highlight:**
```typescript
// Open second tab in same context (shared cookies = shared auth)
const secondTab = await sharedContext.newPage();
await secondTab.goto('/');
await expect(secondTab.getByTestId('sidenav-user-full-name')).toBeVisible();

// Independent navigation
await page.goto('/notifications');
await expect(page).toHaveURL(/\/notifications/);
await expect(secondTab).toHaveURL(/\/bankaccounts/);  // Unaffected

// Popup handling
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.locator('#test-popup-link').click(),
]);
await popup.waitForLoadState();
```

**Q&A:**

**Q: What's the difference between `context.newPage()` and a popup?**
A: `context.newPage()` is programmatic — you control it entirely. A popup is user-triggered (via `window.open()` or `target="_blank"`). Both create new pages in the same context (shared cookies/storage). For popups, you MUST listen with `waitForEvent('popup')` before the trigger, or the popup reference is lost. `Promise.all` ensures the listener is registered before the click.

**Q: How do you test cross-tab data synchronization?**
A: Tab 1 creates a transaction, tab 2 does `await secondTab.reload()`, then asserts the new data appears. Real-time sync (WebSocket) would use `waitForResponse()` or `waitForSelector()` instead of manual reload. The test verifies that the backend persists correctly and the frontend fetches on reload — the two guarantees an E2E test needs.

**Q: How does `page.waitForURL()` differ from `expect(page).toHaveURL()`?**
A: `waitForURL()` is an action — it blocks until the URL matches. `expect(page).toHaveURL()` is an assertion that auto-retries. Use `waitForURL` as a step between actions ("wait for redirect, then do X"). Use `toHaveURL` as verification at the end ("assert we landed on the right page"). In practice, `toHaveURL` is preferred because it gives better error messages.

---

### Module 13: Dialogs, Alerts & Pop-ups

**What to show:** `tests/e2e/dialogs.spec.ts` — all 7 tests

```
Open: tests/e2e/dialogs.spec.ts
```

**Code highlight:**
```typescript
// Alert: listen before trigger, accept()
page.once('dialog', async (dialog) => {
  dialogMessage = dialog.message();
  await dialog.accept();
});
await page.evaluate(() => window.alert('Test alert message'));

// Confirm: accept() → true, dismiss() → false
page.once('dialog', async (d) => await d.accept());
const result = await page.evaluate(() => window.confirm('Accept?'));
expect(result).toBe(true);

// Prompt: accept('value') passes input
page.once('dialog', async (d) => await d.accept('Naveen'));
const name = await page.evaluate(() => window.prompt('Enter name:'));
expect(name).toBe('Naveen');

// addLocatorHandler — auto-dismiss overlays
await page.addLocatorHandler(
  page.getByTestId('user-onboarding-dialog'),
  async () => { /* dismiss steps */ }
);
```

**Q&A:**

**Q: Why `page.once('dialog')` instead of `page.on('dialog')`?**
A: `once` auto-removes the listener after firing once — clean and prevents stale handlers on a shared page. `on` stays active for all future dialogs, which is useful for the sequential dialogs test (`page.on('dialog', ...)` handles all three alerts). The `beforeEach` calls `page.removeAllListeners('dialog')` to prevent handler stacking from previous tests.

**Q: What is `addLocatorHandler` and when would you use it?**
A: It registers a callback that fires whenever a locator becomes visible — like a "whenever this appears, do this" rule. We use it for the RWA onboarding dialog that pops up unpredictably. Without it, any test could fail randomly when onboarding appears. Alternative: dismiss in `beforeEach`, but that only handles it once. `addLocatorHandler` handles it anytime, anywhere, automatically.

**Q: How would you handle a custom modal (not a native dialog)?**
A: Custom modals are regular DOM elements — use `await expect(modal).toBeVisible()` + `await closeButton.click()`. `page.on('dialog')` only works for native `window.alert/confirm/prompt`. For app-level modals (React portals, MUI Dialogs), treat them as any other element. If they overlay and block clicks, `addLocatorHandler` auto-dismisses them.

---

### Module 14: Iframes & Frames

**What to show:** `tests/e2e/iframes.spec.ts` — all 8 tests

```
Open: tests/e2e/iframes.spec.ts
```

**Code highlight:**
```typescript
// frameLocator — interact with iframe content
const frame = page.frameLocator('#child');
await frame.locator('#input').fill('Hello Playwright');
await frame.locator('#btn').click();

// Nested iframes — chain frameLocator
const outer = page.frameLocator('#outer');
const inner = outer.frameLocator('#inner');
await inner.locator('#deep-btn').click();

// postMessage — cross-frame communication
await frame.locator('#send').click();
await expect(page.locator('#received')).toHaveText('hello from iframe');

// page.route() — serve synthetic test pages when app has no iframes
await page.route('**/test-fl-parent', (r) => r.fulfill({
  contentType: 'text/html',
  body: wrap(`<iframe id="child" src="/test-fl-child"></iframe>`),
}));
```

**Q&A:**

**Q: The RWA has no iframes. How did you test them?**
A: `page.route()` intercepts HTTP requests and serves custom HTML responses. We created synthetic parent+child pages with embedded iframes — served from the same origin as the RWA. No external server needed. This technique works for any feature the target app doesn't have: inject a test page via route interception, test the Playwright API against it, then remove the route. Eight iframe tests, zero changes to the app.

**Q: `frameLocator` vs `page.frame()` — when to use which?**
A: `frameLocator('#id')` returns a FrameLocator that supports chaining (`.locator()`, `.getByRole()`) — use it when you know the iframe by selector. `page.frame({ name: 'my-frame' })` or `page.frame({ url: /pattern/ })` returns the actual Frame object — use it when you need the frame by name or URL. `frameLocator` is more common; `page.frame()` is for dynamic or named frame lookup.

**Q: How do nested iframes work?**
A: Chain `frameLocator` calls: `page.frameLocator('#outer').frameLocator('#inner')`. Each call scopes to the next level. There's no depth limit. The same Playwright locator API works at every level. Caveat: cross-origin nested iframes may have restricted access depending on sandbox attributes.

---

### Module 15: File Upload & Download

**What to show:** `tests/practice/file-operations.spec.ts` — all 3 tests

```
Open: tests/practice/file-operations.spec.ts
```

**Code highlight:**
```typescript
// Upload from buffer (no temp file needed)
await page.locator('#file-upload').setInputFiles({
  name: 'playwright-test.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('Uploaded via Playwright setInputFiles'),
});

// Upload from disk
const tempFile = path.join(os.tmpdir(), 'pw-disk-upload.txt');
fs.writeFileSync(tempFile, 'File content from disk');
await page.locator('#file-upload').setInputFiles(tempFile);

// Download — waitForEvent('download')
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.locator('#test-dl').click(),
]);
expect(download.suggestedFilename()).toBe('playwright-test.txt');
await download.saveAs(savePath);
```

**Q&A:**

**Q: Why use `Buffer.from()` upload instead of a real file?**
A: Buffer upload is self-contained — no file system dependency, no cleanup, no path issues across OS. The test carries its data inline. Use disk upload when testing file-size limits, binary formats, or when the file already exists (e.g., a fixture PDF). Buffer is preferred for text content in CI where the filesystem might be ephemeral.

**Q: How do you handle file dialogs (the native OS file picker)?**
A: You don't interact with the OS dialog at all. `setInputFiles()` programmatically sets the file on the `<input type="file">` element, bypassing the native picker entirely. This is faster, more reliable, and works in headless mode where no OS dialog can open. For non-input upload flows (drag-drop upload zones), use `page.dispatchEvent()` with a DataTransfer object.

**Q: What if the download doesn't trigger a `download` event?**
A: This happens when the server sends the file inline (no `Content-Disposition: attachment` header). In that case, there's no `download` event — the browser just displays the content. You'd need to check the response: `const response = await page.goto('/file-url')` then `await response.body()`. We hit this exact issue with the-internet's download page and solved it with a synthetic download link using the `download` attribute.

---

## PHASE 4: API & Integration (Modules 16-20) — 15 min

---

### Module 16: API Testing with Playwright

**What to show:** `utils/api.client.ts`, then `tests/api/users.api.spec.ts` or `transactions.api.spec.ts`

```
Open: utils/api.client.ts — typed REST client
Open: tests/api/users.api.spec.ts — API test examples
```

**Code highlight:**
```typescript
// api.client.ts — Generic typed REST client
export class ApiClient {
  async get<T>(path: string): Promise<T> {
    const res = await this.request.get(`${this.baseUrl}${path}`);
    if (!res.ok()) throw new ApiError(`GET ${url} -> ${res.status()}`, res.status(), url);
    return (await res.json()) as T;
  }
  async login(username: string, password: string): Promise<void> { ... }
}

// Usage in test (via authedApi fixture)
const data = await authedApi.get<{ results: Array<{ id: string }> }>('/transactions');
expect(data.results.length).toBeGreaterThan(0);
```

**Q&A:**

**Q: Why use Playwright's `request` API instead of Axios or node-fetch?**
A: Playwright's `APIRequestContext` shares cookies and auth state with browser tests. When you use `request` from the same context, API calls carry the session cookie — no separate auth token management. It also integrates with Playwright's test runner: retries, timeouts, and reporting all work automatically. Plus, zero additional dependencies.

**Q: How does the `ApiError` class help?**
A: It extends `Error` with `status` and `url` properties. When an API test fails, the error message includes the HTTP status and endpoint — `GET /transactions -> 401`. Without it, you'd get a generic `expect received undefined` with no clue which endpoint failed or why. It's the minimum viable error context for API debugging.

**Q: How do you test unauthenticated API access?**
A: The `api` fixture (vs `authedApi`) is not logged in. Call `api.getRaw('/users')` — it returns the raw response including status code. Assert `expect(response.status()).toBe(401)`. The `authedApi` fixture calls `client.login()` in its setup, so it's always authenticated. Two fixtures, two auth states.

---

### Module 17: Network Interception & Mocking

**What to show:** `tests/practice/network-mocking.spec.ts` — all 4 tests

```
Open: tests/practice/network-mocking.spec.ts
```

**Code highlight:**
```typescript
// route.abort() — block by resource type
await page.route('**/*', async (route) => {
  if (route.request().resourceType() === 'image') await route.abort();
  else await route.continue();
});

// route.continue() — modify request headers
await page.route('**/todos/2', async (route) => {
  const headers = { ...route.request().headers(), 'x-custom-header': 'added-by-playwright' };
  await route.continue({ headers });
});

// route.fulfill() — mock entire API response
await page.route('**/api/mock-data', (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ items: ['alpha', 'beta'], total: 2 }),
}));

// route.fetch() + modify — intercept real response and alter it
await page.route('**/todos/1', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.title = 'INTERCEPTED BY PLAYWRIGHT';
  await route.fulfill({ response, body: JSON.stringify(json) });
});
```

**Q&A:**

**Q: When would you use `route.fulfill()` vs `route.fetch()` + modify?**
A: `route.fulfill()` is a complete mock — you control the entire response. Use it when the backend doesn't exist, is unreliable, or you need specific edge cases (error responses, empty lists). `route.fetch()` + modify is a transparent proxy — the real request goes through, you just alter the response. Use it when you need real data with one field changed (e.g., test how the UI handles a specific title).

**Q: How does `page.route()` work with the RWA's iframe tests?**
A: `page.route()` intercepts at the network level — any request matching the pattern, regardless of whether it's from the main page, an iframe, or a fetch call, gets intercepted. For iframes, we route `**/test-fl-parent` and `**/test-fl-child` — the browser requests these URLs for the iframe `src`, and Playwright fulfills them with our synthetic HTML. The iframe has no idea it's getting mocked content.

**Q: Can you mock WebSocket connections?**
A: Playwright 1.48+ supports `page.routeWebSocket()` for WebSocket interception. For older versions, you'd need to mock at the application level (inject a fake WebSocket class via `addInitScript`). The RWA doesn't use WebSockets, so we don't demonstrate it, but the API exists.

---

### Module 18: Cookies, Local Storage & Session Storage

**What to show:** `tests/e2e/cookies-storage.spec.ts` — all 16 tests

```
Open: tests/e2e/cookies-storage.spec.ts — cookies, localStorage, sessionStorage, addInitScript
```

**Code highlight:**
```typescript
// Cookies — Playwright API (not document.cookie)
const cookies = await page.context().cookies();
const sessionCookie = cookies.find(c => c.name === 'connect.sid');
expect(sessionCookie!.httpOnly).toBe(true);  // httpOnly = invisible to JS

// Inject a cookie
await page.context().addCookies([{
  name: 'e2e_test_cookie', value: 'playwright_rocks', domain: 'localhost', path: '/',
}]);

// localStorage — via page.evaluate()
const authState = await page.evaluate(() => localStorage.getItem('authState'));
expect(JSON.parse(authState!).value).toBe('authorized');

// sessionStorage isolation across tabs
const tab2 = await sharedContext.newPage();
const value = await tab2.evaluate(() => sessionStorage.getItem('tab1_only'));
expect(value).toBeNull();  // sessionStorage is per-tab

// addInitScript — inject storage BEFORE page loads
await tab.addInitScript(() => {
  localStorage.setItem('injected_by_init_script', 'hello_from_playwright');
});
```

**Q&A:**

**Q: Why `context.cookies()` instead of `document.cookie`?**
A: `context.cookies()` reads ALL cookies including `httpOnly` ones. `document.cookie` in JavaScript can only read non-httpOnly cookies. Session cookies like `connect.sid` are typically `httpOnly` for security — they're invisible to `document.cookie` but Playwright's API can read them. This matters for verifying secure cookie flags.

**Q: What is `addInitScript` and when would you use it?**
A: `addInitScript()` runs JavaScript before any page script executes — even before the app's `<script>` tags. Use it to pre-populate localStorage/sessionStorage so the app boots into a specific state (e.g., skip onboarding, set feature flags, mock `window.fetch`). It runs on every navigation within that page, so the state persists across page loads.

**Q: How does sessionStorage differ from localStorage in testing?**
A: localStorage is shared across all tabs in the same origin. sessionStorage is per-tab — each `context.newPage()` gets its own sessionStorage. We verify this in the test: tab1 sets `tab1_only`, tab2 can't read it. This is browser behavior, not Playwright behavior, but it catches bugs where apps incorrectly assume shared storage.

---

### Module 19: Three-Layer Integration Testing (UI + API + DB)

**What to show:** `tests/integration/transaction.integration.spec.ts`, `utils/db.client.ts`

```
Open: tests/integration/transaction.integration.spec.ts — the 3-layer test
Open: utils/db.client.ts — direct DB access
```

**Code highlight:**
```typescript
// transaction.integration.spec.ts — three layers in one test
await test.step('LAYER 1 — send a payment via UI', async () => {
  await topnav.clickNewTransaction();
  await transactionPage.selectUser(receiver.firstName);
  await transactionPage.pay('5', description);
  await expect(transactionPage.alertSuccess).toBeVisible();
});

await test.step('LAYER 2 — API confirms the transaction', async () => {
  const data = await authedApi.get<{ results: Array<{ description: string }> }>('/transactions');
  const found = data.results.find(t => t.description === description);
  expect(found).toBeDefined();
});

await test.step('LAYER 3 — database persisted the transaction', async () => {
  const txns = db.transactionsForUser(sender.id);
  const match = txns.find(t => t.description === description);
  expect(match!.status).toBe('complete');
  expect(match!.senderId).toBe(sender.id);
});
```

**Q&A:**

**Q: Why validate at all three layers?**
A: Each layer can fail independently. The UI might show "success" but the API didn't persist. The API might return 200 but the DB write failed. Three-layer verification proves the full stack works: user sees success (UI), API returns the data (contract), DB has the correct record (persistence). This is the strongest form of E2E testing — it catches bugs that single-layer tests miss.

**Q: How does `DbClient` access the database directly?**
A: The RWA uses lowdb — a flat JSON file (`rwa-app/data/database.json`). `DbClient` reads the file directly with `fs.readFileSync()`. No database driver, no connection pooling — just `JSON.parse()`. This is specific to the RWA's architecture. For a real app with PostgreSQL/MySQL, you'd use a connection pool or an ORM to query the DB layer.

**Q: How does `test.step()` improve test reporting?**
A: `test.step()` creates named sub-sections in the HTML report. Instead of one monolithic test, you see "LAYER 1 — UI" → "LAYER 2 — API" → "LAYER 3 — DB" as collapsible sections. If Layer 2 fails, you know instantly that UI worked but API didn't — without reading through all assertions. Steps also appear in trace viewer with timing data.

---

### Module 20: Visual Regression Testing

**What to show:** `tests/practice/visual-regression.spec.ts`

```
Open: tests/practice/visual-regression.spec.ts — both tests
Show: the snapshot files in visual-regression.spec.ts-snapshots/ directory
```

**Code highlight:**
```typescript
// Full page screenshot comparison
await page.setContent(`<div style="...">
  <h1>Visual Regression Test</h1>
  <div style="width:200px;height:80px;background:#4CAF50">Green Box</div>
</div>`);
await expect(page).toHaveScreenshot('full-page.png');

// Element-level screenshot
await expect(page.locator('button')).toHaveScreenshot('button-element.png');
```

**First run:** `npx playwright test --project=practice --update-snapshots`

**Q&A:**

**Q: Why use `page.setContent()` instead of a real page for visual tests?**
A: Deterministic content = stable baselines. Real pages have dynamic data (timestamps, user names, avatars) that change between runs, causing false positives. `setContent()` with hardcoded HTML ensures the page looks identical every time. In a real project, you'd use `setContent()` for component visual tests and mock dynamic data for full-page visual tests.

**Q: How does `toHaveScreenshot()` handle pixel differences?**
A: It compares pixel-by-pixel against the baseline PNG in the `-snapshots/` directory. Default threshold is 0.2 (20% per-pixel color difference allowed). You can customize: `toHaveScreenshot('name.png', { maxDiffPixelRatio: 0.01 })` allows 1% of pixels to differ. On first run (no baseline), the test fails — run with `--update-snapshots` to create baselines.

**Q: How do you handle visual regression in CI across different OS?**
A: Screenshots differ between OS (font rendering, anti-aliasing). Solution: run visual tests in Docker with a consistent Linux image, or maintain per-OS baselines (Playwright creates `linux/`, `darwin/`, `win32/` subdirectories). The config can specify `projects` with OS-specific snapshot directories. For this POC, we run on one OS and commit the baselines.

---

## PHASE 5: Advanced Playwright (Modules 21-25) — 10 min

---

### Module 21: Advanced Actions — Hover, Keyboard, Drag-and-Drop, Mouse

**What to show:** `tests/practice/advanced-actions.spec.ts` — all 5 tests

```
Open: tests/practice/advanced-actions.spec.ts
```

**Code highlight:**
```typescript
// Hover — reveal hidden elements
await firstFigure.hover();
await expect(firstFigure.locator('.figcaption')).toBeVisible();

// Keyboard — type with delay, shortcuts
await page.keyboard.type('Hello World', { delay: 30 });
await page.keyboard.press('Control+A');
await page.keyboard.type('Replaced');

// Drag-and-drop — HTML5 native
await page.locator('#column-a').dragTo(page.locator('#column-b'));

// Mouse — click at coordinates
const box = await page.locator('#canvas').boundingBox();
await page.mouse.click(box!.x + 150, box!.y + 100);
```

**Q&A:**

**Q: When would you use `keyboard.press()` vs `keyboard.type()`?**
A: `press()` sends a single key event — use it for shortcuts (`Control+A`, `Enter`, `Tab`) and individual keypresses. `type()` sends a sequence of `keyDown`/`keyPress`/`keyUp` events for each character — use it for typing text. `{ delay: 30 }` adds a per-character delay to simulate human typing speed, which some apps need for debounced search inputs.

**Q: Does `dragTo()` work with all drag-and-drop implementations?**
A: `dragTo()` implements HTML5 native drag-and-drop (DataTransfer events). It works with most libraries (React DnD, SortableJS). For custom implementations that use `mousedown` → `mousemove` → `mouseup`, you'd use `page.mouse.move()` steps manually. We tested against the-internet's drag-and-drop page which uses HTML5 DnD.

**Q: What's `boundingBox()` and when is it useful?**
A: `boundingBox()` returns `{ x, y, width, height }` in viewport pixels — the element's position and size. Use it for coordinate-based interactions: `mouse.click(box.x + 50, box.y + 50)` clicks 50px from the top-left corner. Essential for canvas elements, image maps, or testing click regions within an element.

---

### Module 22: Cross-Browser Testing

**What to show:** `playwright.config.ts` → the three browser projects

```
Open: playwright.config.ts — chromium, firefox, webkit projects
Run: npx playwright test --project=firefox (quick demo)
```

**Code highlight:**
```typescript
// playwright.config.ts — three browser engines
{ name: 'chromium', dependencies: ['setup'], use: { ...devices['Desktop Chrome'] } },
{ name: 'firefox',  dependencies: ['setup'], use: { ...devices['Desktop Firefox'] } },
{ name: 'webkit',   dependencies: ['setup'], use: { ...devices['Desktop Safari'] } },
```

**Commands:**
```bash
npm run test:cross-browser    # All three browsers
npm run test:firefox          # Firefox only
npm run test:webkit           # WebKit only
```

**Q&A:**

**Q: How does Playwright handle cross-browser differently from Selenium?**
A: Playwright bundles its own browser binaries (Chromium, Firefox, WebKit) — no WebDriver, no browser-specific drivers, no version mismatches. `npx playwright install` downloads exact versions tested against the Playwright version. Selenium WebDriver communicates over HTTP to a browser driver; Playwright uses CDP (Chrome DevTools Protocol) for Chromium and similar internal protocols for Firefox/WebKit — direct, faster.

**Q: Does the same test code work across all browsers?**
A: Yes, with rare exceptions. The `testIgnore` pattern excludes browser-specific tests. Cross-browser failures are typically CSS rendering differences (visual regression) or vendor-specific APIs (`window.chrome` only in Chromium). Our 72 E2E tests run identically on all three engines.

**Q: How do you test mobile viewports?**
A: `devices['iPhone 13']` or `devices['Pixel 5']` in the `use` block. These presets set viewport size, user agent, device scale factor, and `isMobile: true`. No emulators — Playwright resizes the desktop browser to match mobile dimensions. For touch events, Playwright emulates tap gestures.

---

### Module 23: Test Configuration & Reporting

**What to show:** `playwright.config.ts` → timeouts, reporters, retries

```
Open: playwright.config.ts — full config review
Run: npm run report (show HTML report)
```

**Q&A:**

**Q: What reporters would you use in CI/CD?**
A: `['list']` for terminal output (stdout), `['html']` for artifact archive, `['junit', { outputFile: 'results.xml' }]` for CI systems (Jenkins, GitLab, Azure DevOps), `['blob']` for sharded report merging. Multiple reporters run simultaneously. Custom reporters implement the Reporter interface — e.g., post results to Slack.

**Q: How do retries work with flaky tests?**
A: `retries: 2` in CI means a failed test runs up to 3 times total. `trace: 'on-first-retry'` captures a trace only when a test needs a retry — this is the trace for debugging, not the passing run. The HTML report shows "flaky" tests (passed on retry) vs "failed" tests (failed all attempts). Retries mask flakiness — the goal is `retries: 0` with stable tests.

**Q: How do you tag tests (smoke, regression)?**
A: Use `@tag` in the test title: `test('should login @smoke', ...)`. Run with `--grep @smoke` or `npm run test:smoke`. Playwright also supports `test.describe.configure({ tag: '@smoke' })` for group-level tagging. Tags can be combined: `--grep '@smoke|@critical'`.

---

### Module 24: Debugging & Trace Viewer

**What to show:** Run a test in debug mode, show trace viewer

```bash
npm run test:debug                    # Opens Playwright Inspector
npx playwright show-trace trace.zip   # Open a trace file
```

**Q&A:**

**Q: What debugging tools does Playwright provide?**
A: (1) `--debug` flag opens the Playwright Inspector with step-through, locator highlighting, and a live DOM explorer. (2) Trace Viewer shows a timeline of every action, network request, console log, and DOM snapshot — like Chrome DevTools but for the entire test run. (3) `page.pause()` in code opens the inspector at that exact point. (4) `--ui` mode gives an interactive test runner with watch mode.

**Q: How do you debug a test that only fails in CI?**
A: `trace: 'on-first-retry'` captures traces on CI failures. Download the trace ZIP from CI artifacts, open with `npx playwright show-trace trace.zip`. The trace shows exactly what the browser saw — DOM state, network responses, screenshots at each step. For video, `video: 'retain-on-failure'` records the entire test as a webm file.

---

### Module 25: Sharding & Parallel Execution

**What to show:** Explain sharding via config + CLI

```bash
# Split across 3 CI machines
npx playwright test --shard=1/3   # Machine 1
npx playwright test --shard=2/3   # Machine 2
npx playwright test --shard=3/3   # Machine 3

# Merge reports from shards
npx playwright merge-reports ./blob-reports --reporter=html
```

**Q&A:**

**Q: How does sharding work?**
A: `--shard=N/M` divides the test file list into M equal chunks and runs chunk N. Shard 1/3 runs the first third of files, shard 2/3 the second third, etc. Each shard is a fully independent Playwright run — different machine, different process. After all shards complete, merge blob reports into a single HTML report. Sharding is orthogonal to workers — each shard can itself use multiple workers.

**Q: How do you configure CI/CD for Playwright?**
A: GitHub Actions matrix strategy: 3 jobs with `shard: [1/3, 2/3, 3/3]`. Each job runs `npx playwright test --shard=${{ matrix.shard }}`, uploads blob report as artifact. A final job downloads all blobs and runs `merge-reports`. Docker: use `mcr.microsoft.com/playwright:v1.50.0-noble` — it has all browser dependencies pre-installed.

**Q: `workers: 1` in config but we want CI speed — how?**
A: Override in CI: `npx playwright test --workers=4`. CLI flags override config. Or use `workers: process.env.CI ? 4 : 1` in config — auto-adjusts based on environment. With parallel workers, each test must be independently isolated (own login, no shared mutable state). The `sharedPage` pattern is for sequential mode only.

---

## PHASE 6: Real-World Patterns (Modules 26-30) — 10 min

---

### Module 26: Auto-Onboarding & Locator Handlers

**What to show:** `utils/onboarding.helper.ts`

```
Open: utils/onboarding.helper.ts — both functions
```

**Code highlight:**
```typescript
// registerOnboardingHandler — auto-dismiss whenever it appears
export async function registerOnboardingHandler(page: Page): Promise<void> {
  await page.addLocatorHandler(
    page.getByTestId('user-onboarding-dialog'),
    async () => {
      await nextBtn.click();                     // Step 1: Welcome → Next
      if (await bankName.isVisible()) {          // Step 2: Fill bank form
        await bankName.fill('Test Bank');
        await routingInput.fill('123456789');
        await accountInput.fill('987654321');
        await submitBtn.click();
      }
      await nextBtn.click();                     // Step 3: Done
    },
  );
}
```

**Q&A:**

**Q: Why not just dismiss onboarding in `beforeEach`?**
A: The onboarding dialog appears only on first login — it may or may not show up depending on user state. If it appears mid-test (after a re-login), `beforeEach` won't catch it. `addLocatorHandler` is event-driven — it fires whenever the locator becomes visible, at any point during any test. Set it once in the fixture, forget about it forever.

**Q: What other overlays would benefit from this pattern?**
A: Cookie consent banners, GDPR popups, chat widgets, announcement modals, session timeout warnings — any overlay that appears unpredictably and blocks test execution. One `addLocatorHandler` per overlay type, registered once in the fixture setup.

---

### Module 27: Smart Login State Management

**What to show:** `utils/login.helper.ts` — already discussed but re-emphasize the pattern

```
Open: utils/login.helper.ts
```

**Q&A:**

**Q: How does `ensureLoggedIn()` avoid redundant logins?**
A: It navigates to `/`, waits for either the sign-in button or sidenav to appear (`.or()` locator), then checks which is visible. If sidenav is visible → already logged in, return immediately. If sign-in button is visible → fill credentials and login. This saves ~2s per test when tests run sequentially in a shared browser.

**Q: What about stale sessions?**
A: If the session expires mid-run, `ensureLoggedIn()` detects it on the next call — the sign-in button appears instead of sidenav. It re-authenticates automatically. No test needs to handle session expiry explicitly.

---

### Module 28: Error Handling & Custom ApiError

**What to show:** `utils/api.client.ts` — ApiError class

```
Open: utils/api.client.ts
```

**Q&A:**

**Q: Why a custom error class instead of generic `throw new Error()`?**
A: `ApiError` carries `status` and `url` metadata. A test failure shows `ApiError: GET /transactions -> 401 at /transactions` instead of `Error: Request failed`. This is the minimum context needed to debug an API test failure without looking at logs. Structured errors can also be caught selectively: `catch (e) { if (e instanceof ApiError && e.status === 404) ... }`.

---

### Module 29: Test Data Management & Factories

**What to show:** `data/test-data.ts` — faker-powered factories + `as const` immutability

```
Open: data/test-data.ts
```

**Code highlight:**
```typescript
// Static data (known values from seed DB)
export const TestUsers = {
  default: { username: ENV.user.username, password: ENV.user.password,
             firstName: 'Ted', lastName: 'Parisian' },
} as const;

// Dynamic data (unique per run via faker)
export const BankAccountData = {
  valid: { bankName: `${faker.company.name()} Bank`, ... },
  invalidRouting: { bankName: faker.company.name(), routingNumber: '123', ... },
} as const;

// Factory function (unique per call)
export const SignupData = {
  newUser: () => ({
    firstName: faker.person.firstName(),
    username: faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    password: faker.internet.password({ length: 12 }),
  }),
} as const;
```

**Q&A:**

**Q: How do you prevent test data collisions in parallel runs?**
A: `SignupData.newUser()` uses `faker.internet.username()` + `faker.person.firstName()` — faker seeds from `Math.random()` so every call produces unique values. `BankAccountData` is evaluated once at import time (unique per worker). `TransactionData` uses `faker.string.nanoid(6)` for unique descriptions. Even if two parallel workers import the module simultaneously, they get different faker outputs.

**Q: Why faker over hardcoded values or `Date.now()` timestamps?**
A: Faker generates **realistic** data — real names, valid routing numbers, plausible bank names — making test output readable and test failures debuggable. `Date.now()` gives `demo_1738000000000`, faker gives `jane_doe` — the second tells you something when you're reading a failure log. Faker also has domain-specific generators (`finance.routingNumber()` produces valid 9-digit ABA numbers) reducing invalid-format false failures.

**Q: What about test data cleanup?**
A: The RWA seeds its database on `yarn dev`. For CI, `yarn db:seed` resets to a known state before each run. Faker-generated unique data prevents collisions with seed data. If cleanup were needed, you'd add an `afterAll` that calls a cleanup API or resets the DB — but for this POC, seed-on-start is sufficient.

---

### Module 30: Project Architecture & Framework Summary

**What to show:** The README.md architecture diagram, then run the full suite

```
Open: README.md — show the architecture diagram
Run: npm test (show 114/114 passing in ~3 minutes)
```

**Q&A:**

**Q: How would you scale this framework for a team?**
A: (1) Add more page objects as new pages are built — each extends `BasePage`. (2) Add new component classes for shared UI widgets. (3) Add new fixture definitions in `fixtures/test.ts`. (4) Add new test data in `data/test-data.ts`. (5) New test categories → new projects in `playwright.config.ts`. The structure is additive — new features don't require modifying existing code.

**Q: What's the total test execution time?**
A: ~3 minutes for 114 tests (API + E2E + Practice + Integration) on a single worker. API tests (~10s) run without a browser. Practice tests (~30s) run against external sites. E2E tests (~2.5 min) run in a single Chromium window. With `workers: 4`, the UI tests drop to ~45s. With 3 shards × 4 workers in CI, under 30 seconds wall-clock.

**Q: How does this compare to Cypress?**
A: Playwright advantages: multi-browser (Chromium + Firefox + WebKit), multi-tab/window, true parallelism (workers), API testing built-in, faster execution, better iframe support, `addLocatorHandler` for overlays. Cypress advantages: time-travel debugging UI, component testing, larger plugin ecosystem. For enterprise E2E automation, Playwright's multi-browser and parallelism capabilities make it the stronger choice.

**Q: What would you add for production readiness?**
A: (1) CI/CD pipeline (GitHub Actions / Jenkins) with sharding. (2) Allure or similar reporting integration. (3) Test data management via API seed endpoints. (4) Environment-specific configs (staging, prod). (5) Slack/Teams notifications on failure. (6) Docker container for consistent cross-OS execution. (7) Performance benchmarks with `page.metrics()`. The framework structure is ready — these are infrastructure additions.

---

## Demo Closing — 5 min

### Summary slide:

| Metric | Value |
|--------|-------|
| Total tests | 114 (22 API + 72 E2E + 20 Practice + 1 Integration) |
| Languages | TypeScript + JavaScript |
| Browsers | Chromium, Firefox, WebKit |
| Architecture | Hybrid: POM + Data-Driven + Keyword-Driven |
| Execution time | ~3 min (single worker) |
| External deps | Playwright + faker + dotenv |
| Framework files | ~30 files (pages, tests, utils, config) |
| Target app | Cypress Real World App (React + Express + lowdb) |

### Key differentiators:
1. **Single browser window** — realistic user simulation
2. **Three-layer integration** — UI + API + DB in one test
3. **Dynamic test data** — `@faker-js/faker` generates unique data per run, zero hardcoded values
4. **Strict lint & type safety** — 0 ESLint errors, 0 TypeScript errors, full type assertions
5. **Auto-onboarding handler** — `addLocatorHandler` pattern
6. **Synthetic test pages** — `page.route()` for missing app features (iframes)
7. **POM discipline** — all locators in page objects, none in test files
8. **Practice suite** — independent tests against public sites for Playwright API demos

---

## Quick Reference — Files per Module

| Module | Files to Open |
|--------|--------------|
| 1. JS/TS Essentials | `config/env.ts`, `data/test-data.ts` |
| 2. Node/npm | `package.json`, `playwright.config.ts` |
| 3. Playwright Fundamentals | `playwright.config.ts`, `fixtures/test.ts` |
| 4. Selectors | `pages/signin.page.ts`, `pages/components/sidenav.component.ts` |
| 5. Assertions | `tests/practice/soft-assertions.spec.ts`, `tests/e2e/auth.spec.ts` |
| 6. POM Design | `pages/base.page.ts`, `fixtures/test.ts` |
| 7. Keyword-Driven | `pages/components/sidenav.component.ts`, `pages/components/topnav.component.ts` |
| 8. Data-Driven | `data/test-data.ts`, `tests/e2e/auth.spec.ts` |
| 9. Fixtures | `fixtures/test.ts` |
| 10. Auth/Sessions | `tests/setup/auth.setup.ts`, `utils/login.helper.ts` |
| 11. Form Handling | `tests/practice/form-controls.spec.ts` |
| 12. Multi-Tab | `tests/e2e/multi-tab.spec.ts` |
| 13. Dialogs | `tests/e2e/dialogs.spec.ts` |
| 14. Iframes | `tests/e2e/iframes.spec.ts` |
| 15. File Upload/Download | `tests/practice/file-operations.spec.ts` |
| 16. API Testing | `utils/api.client.ts`, `tests/api/users.api.spec.ts` |
| 17. Network Mocking | `tests/practice/network-mocking.spec.ts` |
| 18. Cookies/Storage | `tests/e2e/cookies-storage.spec.ts` |
| 19. Integration Testing | `tests/integration/transaction.integration.spec.ts`, `utils/db.client.ts` |
| 20. Visual Regression | `tests/practice/visual-regression.spec.ts` |
| 21. Advanced Actions | `tests/practice/advanced-actions.spec.ts` |
| 22. Cross-Browser | `playwright.config.ts` |
| 23. Config & Reporting | `playwright.config.ts` |
| 24. Debugging | Run `npm run test:debug` |
| 25. Sharding | CLI: `--shard=N/M` |
| 26. Auto-Onboarding | `utils/onboarding.helper.ts` |
| 27. Smart Login | `utils/login.helper.ts` |
| 28. Error Handling | `utils/api.client.ts` |
| 29. Test Data Factories | `data/test-data.ts` |
| 30. Architecture Summary | `README.md` |
