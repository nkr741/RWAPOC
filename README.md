# Ryvan E2E — Playwright framework + Claude Code training repo

![E2E Tests](https://github.com/nkr741/RWAPOC/actions/workflows/e2e.yml/badge.svg)

One repository, four things:

| Area | What it is | Where |
|---|---|---|
| **E2E framework** | Playwright + TypeScript suite against the Cypress Real World App (RWA): POM + fixtures, UI / API / integration / practice tests, cross-browser | `tests/`, `pages/`, `fixtures/`, `utils/` |
| **Claude-powered CI** | PR review, quality gate, release notes, failure root-cause analysis, GitLab MR review | `.github/workflows/`, `.gitlab-ci.yml`, `scripts/ci/` |
| **Claude Code configuration** | Settings hierarchy, env vars, proxy/TLS, providers, cost, dev container, policy | `.claude/`, `claude-config/`, `.devcontainer/` |
| **Training demos** | Self-healing locators, Claude Platform concepts, Python agent loop | `demo-projects/`, `claude-agent/` |

Requires **Node ≥ 22.5**, and **Python 3.12** for the Claude Code demos.

---

## 1. Quick start

```bash
npm ci
npx playwright install --with-deps chromium firefox webkit
cp .env.example .env                 # QA_USER / QA_PASSWORD (RWA default password: s3cret)

# RWA app in a second terminal (ports 3000 / 3001)
git clone --depth 1 https://github.com/cypress-io/cypress-realworld-app.git rwa-app
cd rwa-app && yarn install && yarn dev

npm test                             # every project: api, setup, chromium, practice, firefox, webkit
npm run test:e2e                     # UI, Chromium only
npm run test:api                     # API, no browser
npm run test:integration             # UI -> API -> DB
npm run test:smoke                   # @smoke tests
npm run check                        # typecheck + lint (the CI gate)
```

Config is loaded and validated in `config/env.ts` — it fails fast on a missing variable.

---

## 2. E2E framework

**Hybrid model:** Page Object Model + keyword-driven components + data-driven tests, with all
page objects, components, API and DB clients injected as Playwright fixtures.

```
tests/          e2e/ (UI)  api/  integration/ (UI+API+DB)  practice/ (feature demos)  setup/ (auth)
fixtures/       test.ts — the single DI hub; tests never `new` a page object
pages/          *.page.ts extend BasePage (open = goto + waitForLoaded); components/ = SideNav, TopNav
utils/          api.client.ts (typed REST, ApiError)  db.client.ts (reads RWA's lowdb JSON)
                login.helper.ts (ensureLoggedIn/Out)  onboarding.helper.ts (auto-dismiss welcome dialog)
data/           test-data.ts — faker-generated, `as const`
config/         env.ts
playwright.config.ts   projects: api, setup, chromium, practice, firefox, webkit; 1 worker; data-test ids
```

Conventions enforced by ESLint: no `any`, no `waitForTimeout`, no `{ force: true }`, every test
asserts, no floating promises. Test-id attribute is **`data-test`**. See `CLAUDE.md` for the
full conventions Claude Code follows in this repo.

117 unique tests; 262 runs once the UI projects replay on Firefox and WebKit. Firefox needs the
RWA app started the CI way (`yarn build && yarn start:ci`) — against the Vite dev server its
`load` event never fires.

---

## 3. Claude-powered CI

Every job runs the Claude Code CLI headless (`claude -p --output-format json`) with
`ANTHROPIC_API_KEY` from the platform's secret store. Claude reads the repo for context but
cannot edit in that mode. Shared scripts in `scripts/ci/`; `lib.sh` wraps the CLI so a failed
call surfaces its real error instead of an empty log.

| What | Trigger | Where |
|---|---|---|
| Interactive PR review — comment `@claude …` (repo members only; can push fixes) | comment / review / issue | `.github/workflows/github-actions-review.yml` |
| Quality gate — **exit 1 on any HIGH finding** | every PR / MR | `scripts/ci/quality-gate.sh` via `quality-gate.yml`, `.gitlab-ci.yml` |
| Release notes → GitHub Release | push a `v*` tag | `.github/workflows/github-actions-release-notes.yml` |
| Root-cause analysis of failed specs (APP_BUG / TEST_BUG / FLAKY / ENV) → PR comment | smoke failure; nightly summary | `scripts/ci/test-failure-analysis.sh` from `e2e.yml` |
| MR review posted as a note | every merge request | `scripts/ci/diff-review.sh` via `.gitlab-ci.yml` |

The base pipeline (`e2e.yml`): PR gate = typecheck + lint + API + smoke on Chromium; nightly =
full suite, 4 shards, all browsers, merged report, Slack/Teams notify.

Secrets: `ANTHROPIC_API_KEY` on both platforms; GitLab also needs `GITLAB_API_TOKEN` (`api`
scope) to post notes, and its variables must be **unprotected** (MR pipelines run on feature
branches). GitHub needs the Claude GitHub App installed for the `@claude` job.

---

## 4. Claude Code configuration

### Settings hierarchy

```
1. managed-settings.json / MDM / claude.ai console   org       nothing below overrides it
2. claude --settings <file>                          session
3. .claude/settings.local.json                       you + project     (gitignored)
4. .claude/settings.json                             team + project    (committed — this repo)
5. ~/.claude/settings.json                           you, everywhere
```

Scalars: highest wins. `permissions`: union of every file, deny wins. `env`: per key.
`ANTHROPIC_MODEL` overrides `model` from any file; `--model` overrides both.

**`.claude/settings.json`** (committed) denies reading `.env` files, force-push and `rm -rf`,
raises the Bash timeout for Playwright runs, and runs Prettier after every Edit/Write via
`claude-config/hooks/format_on_write.py`. Personal approvals stay in `settings.local.json`.

Windows managed path: `C:\Program Files\ClaudeCode\managed-settings.json` (macOS
`/Library/Application Support/ClaudeCode/`, Linux `/etc/claude-code/`).

### `claude-config/` — runnable demos (Python)

```bash
python -m venv .venv && .venv/Scripts/pip install -r claude-config/requirements.txt
```

| Script | Shows |
|---|---|
| `show_settings.py` | Every settings file, then the merged result with the winning source per key |
| `env_audit.py` | 40 documented env vars (auth, model routing, providers, network, flags). `--live`: SDK call proving the key. `--claude`: headless CLI proving `ANTHROPIC_MODEL` routing from `modelUsage` |
| `proxy_demo.py` + `proxy_addon.py` | mitmproxy as a TLS-inspecting corporate proxy: handshake rejected without the CA, works with `NODE_EXTRA_CA_CERTS`, every host Claude Code contacts logged. `--hosts` for phase 2 only |
| `cost_report.py` | Spend at list price from `~/.claude/projects/**/*.jsonl` by day / session / model / project; dedups streamed messages, prices cache tokens correctly |
| `statusline.py` | Status bar: model · context % · $ · cache · plan window · branch. Wire with `"statusLine": {"type":"command","command":"python .../statusline.py"}` |
| `providers_sdk.py` | Same prompt through `Anthropic()`, `AnthropicBedrockMantle()`, `AnthropicVertex()` — runs whichever has credentials |
| `hooks/format_on_write.py` | The PostToolUse hook |
| `managed-settings.example.json`, `keybindings.example.json` | Org policy and key remap examples |

### Environment variables that matter

| Job | Variables |
|---|---|
| Auth (first wins) | `ANTHROPIC_API_KEY` → `ANTHROPIC_AUTH_TOKEN` → subscription login. In `-p`/CI the key always wins |
| Model routing | `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL` / `_SONNET_MODEL` / `_HAIKU_MODEL` (pin these on Bedrock/Vertex) |
| Providers | `CLAUDE_CODE_USE_BEDROCK=1` + `AWS_REGION` + AWS credential chain · `CLAUDE_CODE_USE_VERTEX=1` + `CLOUD_ML_REGION` + `ANTHROPIC_VERTEX_PROJECT_ID` + gcloud ADC · `CLAUDE_CODE_USE_FOUNDRY=1` · gateway: `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` |
| Network | `HTTPS_PROXY` / `NO_PROXY` (no SOCKS); `NODE_EXTRA_CA_CERTS` for a corporate CA not in the OS store; `CLAUDE_CODE_CERT_STORE` |
| Privacy | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` (telemetry, error reports, changelog, flags), `DISABLE_TELEMETRY` |
| Where | Project-wide → `.claude/settings.json` `env`; personal → `~/.claude/settings.json` `env`; org → managed. Shell exports are read once at `claude` startup |

Hosts Claude Code needs through a firewall: `api.anthropic.com`, `claude.ai`, `claude.com`,
`platform.claude.com`, `mcp-proxy.anthropic.com`, `downloads.claude.ai`, `registry.npmjs.org`,
plus the two Datadog intake hosts unless telemetry is disabled.

### Cost

`/usage` in a session (cost, per-model tokens, cache hit rate, plan bars); `claude -p … --output-format json`
returns `total_cost_usd`; `--max-budget-usd` hard-stops a headless run; `cost_report.py` aggregates
history. Cost is dominated by context (system prompt + tool schemas on every call) — prompt caching
makes repeat calls ~10× cheaper until a session idles past the TTL (1 h subscription, 5 min API key).

### Dev container (`.devcontainer/`) — runs on Docker or Podman

Claude Code installed by the official feature, `CLAUDE_CONFIG_DIR` on a named volume so login
survives rebuilds, `containerEnv` for team-wide variables, `managed-settings.json` baked into
`/etc/claude-code/` (top of the hierarchy inside the container), and `ryvan-firewall.sh` — default-deny
egress from the host list above. Verified: `example.com` and telemetry blocked, API reachable, and
Claude inside the container refused a `*.pem` read by a rule that exists only in the managed file.

```powershell
npx @devcontainers/cli up   --workspace-folder . --docker-path podman     # or omit --docker-path for Docker
npx @devcontainers/cli exec --workspace-folder . --docker-path podman claude --version
```

Gotchas: the base image's user is `vscode` (not `node`); the Claude Code feature installs its own
`/usr/local/bin/init-firewall.sh`, so ours has a different name; on Podman 6 + WSL, netavark's nftables
rules are rejected by the Microsoft kernel — set `firewall_driver = "none"` in the machine's
`containers.conf.d` and add one `masquerade` rule for `10.88.0.0/16`. `--dangerously-skip-permissions`
inside the container can still exfiltrate `~/.claude` credentials: trusted repos only, never mount `~/.ssh`.

### Terminal & voice

`/terminal-setup` (Shift+Enter in VS Code), `"preferredNotifChannel": "terminal_bell"`,
`~/.claude/keybindings.json` (`chat:submit`, `chat:newline`, `voice:pushToTalk`), `/theme`, `"editorMode": "vim"`.
Voice dictation (`/voice`) streams audio to Anthropic, needs a claude.ai login and a local microphone —
unavailable on API-key auth, Bedrock/Vertex, SSH, and dev containers; org admins can disable it.

---

## 5. Training demos

### `demo-projects/` — self-healing locators and Claude Platform

Standalone sub-project (own `package.json`, `playwright.config.ts`, demo app on port 4200,
login `demo` / `password123`).

```bash
cd demo-projects && npm ci && npx playwright install chromium
npm run demo:serve               # http://localhost:4200
npm run test:without-ai          # 7 specs: fallback locators, attribute cascade, text/role, structural, CSS+XPath, resolver class, fingerprinting
npm run test:with-ai             # 5 specs: DOM-diff repair, screenshot repair, semantic locator, test auto-fix, page-object regeneration (needs ANTHROPIC_API_KEY)
npm run demo:platform            # claude-platform/00–20: agent loop, tool use, thinking, MCP, skills, model choice, context, delegation, prompting, evals (score- and model-based), temperature
```

`demo-projects/.claude/` holds the Claude Code files those sessions teach: skills (bug-analyzer,
locator-auditor, self-healer, test-generator, test-reviewer), commands (`/audit-locators`,
`/generate-tests`, `/heal`), a `test-healer` agent, and a settings file with an anti-pattern hook.

### `claude-agent/` — the agent loop in Python

```bash
pip install anthropic && set ANTHROPIC_API_KEY=...
python claude-agent/01_basic_claude.py    # one call
python claude-agent/02_tool_call.py       # Claude asks for a tool, you run it
python claude-agent/03_agent_loop.py      # think → act → observe → check → repeat, fixing a deliberately indirect bug in demo/
```

---

## 6. Dependencies

| Package | Purpose |
|---|---|
| `@playwright/test` | Runner, browsers, assertions |
| `@faker-js/faker` | Test data |
| `dotenv` | `.env` loading |
| `eslint` + `eslint-plugin-playwright` + `typescript-eslint` | Lint, typed rules |
| `prettier` | Formatting (also run by the Claude Code hook) |
| `anthropic`, `mitmproxy` (Python) | `claude-config/` demos |
