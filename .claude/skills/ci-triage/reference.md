# Failure label rubric

| Label        | Meaning              | Typical evidence                                                                                                                               | Fix owner                                                                                                            |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **APP_BUG**  | the product is wrong | 5xx from the API; wrong value rendered while the locator resolves fine; deterministic across retries and browsers                              | app team — file a bug, keep the test red                                                                             |
| **TEST_BUG** | the test is wrong    | strict-mode violation (locator matched 2 elements); asserting raw cents against a formatted `$45.50`; stale `data-test` id; wrong fixture data | QA — edit the test / page object                                                                                     |
| **FLAKY**    | timing or ordering   | failed on retry 0, passed on retry 1; `waitForResponse` timeout; toast disappeared before assertion; order-dependent tests sharing one page    | QA — replace the race with an auto-waiting assertion (`expect(locator).toBeVisible()`, `expect.poll`), isolate state |
| **ENV**      | infrastructure       | `ECONNREFUSED`, `EADDRINUSE`, missing browser binary, secret not set, disk full, DNS                                                           | platform / CI — fix the runner, not the code                                                                         |

Decision order: **ENV first** (nothing else is trustworthy on a broken runner), then
**FLAKY** (did a retry pass?), then look at _what_ failed — the app's response (APP_BUG) or
the test's expectation/locator (TEST_BUG).

Examples:

- `POST /transactions -> 500` on every attempt → APP_BUG.
- `locator resolved to 2 elements` → TEST_BUG (make the locator unique).
- retry 0 `timedOut`, retry 1 `passed` → FLAKY.
- `browserType.launch: Executable doesn't exist` → ENV (`npx playwright install`).
