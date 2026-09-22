# Ryvan E2E — Playwright framework + Claude certification training repo

![E2E Tests](https://github.com/nkr741/RWAPOC/actions/workflows/e2e.yml/badge.svg)

One repository, three things:

| Area                                                         | What it is                                                                                                                                                                             | Where                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **E2E framework** (system under test for the Claude lessons) | Playwright + TypeScript suite against the Cypress Real World App (RWA): POM + fixtures, UI / API / integration / practice tests, cross-browser                                         | `tests/`, `pages/`, `fixtures/`, `utils/`                  |
| **Claude-powered CI**                                        | PR review, quality gate, release notes, failure root-cause analysis, GitLab MR review                                                                                                  | `.github/workflows/`, `.gitlab-ci.yml`, `scripts/ci/`      |
| **Claude certification sessions** (Python)                   | 10 sessions covering the _Claude Certified Architect – Foundations_ syllabus end to end: 46 runnable Python demos, a real MCP server, hooks/skills/agents, RAG, and practice questions | `sessions/`, `.claude/`, `claude-config/`, `claude-agent/` |

Requires **Node ≥ 22.5** (framework + Claude Code CLI) and **Python 3.12** (sessions).
Everything Claude-related is Python; the only TypeScript is the Playwright framework itself.

---

## 1. Quick start

```bash
# framework
npm ci && npx playwright install --with-deps chromium firefox webkit
cp .env.example .env                 # QA_USER / QA_PASSWORD (RWA default password: s3cret); add VOYAGE_API_KEY for RAG
git clone --depth 1 https://github.com/cypress-io/cypress-realworld-app.git rwa-app
(cd rwa-app && yarn install && yarn dev)          # ports 3000 / 3001, second terminal
npm test                             # every project: api, setup, chromium, practice, firefox, webkit
npm run check                        # typecheck + lint (the CI gate)

# sessions
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
claude --version                     # Claude Code CLI ≥ 2.1 on PATH; export ANTHROPIC_API_KEY
.venv/Scripts/python sessions/01-getting-started/01_first_session.py
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

Conventions enforced by ESLint _and_ by a Claude Code PreToolUse hook: no `any`, no
`waitForTimeout`, no `{ force: true }`, every test asserts, no floating promises. Test-id
attribute is **`data-test`**. See `CLAUDE.md` and `.claude/rules/tests.md`.

117 unique tests; 262 runs once the UI projects replay on Firefox and WebKit. Firefox needs
the RWA app started the CI way (`yarn build && yarn start:ci`) — against the Vite dev server
its `load` event never fires.

---

## 3. Claude-powered CI

Every job runs the Claude Code CLI headless (`claude -p --output-format json`) with
`ANTHROPIC_API_KEY` from the platform's secret store; `scripts/ci/lib.sh` wraps the CLI so a
failed call surfaces its real error.

| What                                                                            | Trigger                  | Where                                                                 |
| ------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| Interactive PR review — comment `@claude …` (repo members only; can push fixes) | comment / review / issue | `.github/workflows/github-actions-review.yml`                         |
| Quality gate — **exit 1 on any HIGH finding**                                   | every PR / MR            | `scripts/ci/quality-gate.sh` via `quality-gate.yml`, `.gitlab-ci.yml` |
| Release notes → GitHub Release                                                  | push a `v*` tag          | `.github/workflows/github-actions-release-notes.yml`                  |
| Root-cause analysis of failed specs (APP_BUG / TEST_BUG / FLAKY / ENV)          | smoke failure; nightly   | `scripts/ci/test-failure-analysis.sh` from `e2e.yml`                  |
| MR review posted as a note                                                      | every merge request      | `scripts/ci/diff-review.sh` via `.gitlab-ci.yml`                      |

Base pipeline (`e2e.yml`): PR gate = typecheck + lint + API + smoke on Chromium; nightly =
full suite, 4 shards, all browsers, merged report, Slack/Teams notify. Secrets:
`ANTHROPIC_API_KEY` on both platforms; GitLab also `GITLAB_API_TOKEN` (`api` scope, unprotected).

---

## 4. Certification sessions (`sessions/`)

Target: **Claude Certified Architect – Foundations** (pass 720/1000). Domain weights: D1
Agentic Architecture & Orchestration 27 % · D2 Tool Design & MCP 18 % · D3 Claude Code Config &
Workflows 20 % · D4 Prompt Engineering & Structured Output 20 % · D5 Context Management &
Reliability 15 %.

Each session folder has runnable Python demos (every one executed on this machine) and a
local `README.md` study page (concept → config → steps → real output → _exam lens_). The
per-session markdown is deliberately **not tracked in git** — this file is the single
committed document; regenerate or ask for the notes locally.

| #   | Folder                    | Session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Domains        | Runnables                                                                                                                        |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `01-getting-started/`     | agentic loop, install, auth, interactive vs `-p` (text/json/stream-json), resume, Desktop/IDE, themes, permission modes, status line                                                                                                                                                                                                                                                                                                                                                                                                                                                 | D3             | `01_first_session.py`                                                                                                            |
| 2   | `02-commands-memory/`     | slash commands, CLAUDE.md hierarchy (root/import/local always; subdir + `.claude/rules` on touch; `--bare` none), context window, permission rules, models/effort/cost, `/rewind`, `/branch` = `--fork-session`                                                                                                                                                                                                                                                                                                                                                                      | D3, D5         | `01_claude_md_hierarchy.py`, `02_branching.py`, `03_models_effort.py`                                                            |
| 3   | `03-workflows-prompting/` | explore/fix/test/refactor, `/review` `/security-review` `/simplify` ultrareview, plan mode, prompting (clear · specific · XML · examples), git (commit/PR/changelog), debugging; **prompt-eval pipeline**: dataset → run → code grading → model grading                                                                                                                                                                                                                                                                                                                              | D3, D4         | `01_prompt_engineering.py`, `02_git_workflow.py`, `eval/01_generate_dataset.py`, `eval/02_run_eval.py`, `eval/03_grade_model.py` |
| 4   | `04-ci-cd/`               | map + exam view of §3 above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | D3, D4         | (existing CI)                                                                                                                    |
| 5   | `05-mcp/`                 | **MCP server** (tools, resources + templates, prompts, logging, progress, **sampling**, roots; stdio + Streamable HTTP), **client** (in-process / stdio / HTTP, callbacks), Inspector, **custom REST-API server** over the live RWA backend, MCP inside the Agent SDK, configs for Postgres/SQLite/GitHub/Slack/browser, scopes, security                                                                                                                                                                                                                                            | D2             | `server.py`, `client.py`, `rest_api_server.py`, `agent_sdk_mcp.py`, `configs/`                                                   |
| 6   | `06-hooks-skills-agents/` | **PreToolUse** guard hook + PostToolUse formatter (proven headless), hook gotchas, skills vs commands vs agents, multi-file skill `ci-triage`, `/loop` `/schedule` routines, subagents (parallel Haiku workers under a Sonnet coordinator), remote control / teleport                                                                                                                                                                                                                                                                                                                | D3, D1, D5     | `01_hooks_demo.py`, `02_subagents_demo.py` + `.claude/hooks`, `.claude/skills`, `.claude/commands`, `.claude/agents`             |
| 7   | `07-advanced-config/`     | map + exam view of `claude-config/` (settings hierarchy, env vars, proxy/TLS, Bedrock/Vertex/Foundry/gateway, cost, dev container, managed policy)                                                                                                                                                                                                                                                                                                                                                                                                                                   | D3, D5         | (existing)                                                                                                                       |
| 8   | `08-agent-sdk/`           | **Agent SDK**: `query()` + message types, `StreamEvent` + `ClaudeSDKClient`, structured output + jsonschema + retry + conflict check, `@tool` + `can_use_tool` gate, in-process hooks, secure deployment (least privilege, budgets, semaphore, logs). **Claude API**: multi-turn, streaming events, `parse()`/json_schema/strict tools, manual tool loop + `tool_choice` + tool runner, text-editor + web-search tools, adaptive thinking/effort, images, PDF + citations, prompt caching (proven 11 632 write → read), code execution + Files API                                   | D1, D2, D4, D5 | `sdk/01`–`06`, `api/01`–`10`                                                                                                     |
| 9   | `09-enterprise-patterns/` | org CLAUDE.md template + path rules, agent teams, GHES/Slack/analytics/ZDR/audit/sandboxing, prompt-injection defence (judged), morning briefing, **workflows** (chaining with gates, parallel reviews, routing with a human queue, environment inspection), **RAG** (chunking strategies, Voyage embeddings, BM25 from scratch, grounded flow with citations, multi-index RRF + rerank)                                                                                                                                                                                             | D1, D5, D3     | `01_morning_briefing.py`, `02_prompt_injection_defense.py`, `workflows/01`–`04`, `rag/01`–`05`                                   |
| 10  | `10-certification/`       | study guide by domain; curriculum examples **`agentic_loop.py`** (every stop_reason, HITL gate), **`coordinator_subagent.py`** (plan → parallel workers → verify citations → synthesise), **`structured_output.py`** (shape-only schema + Pydantic + retry + two-run conflict detection), **`ci-review.yml`** (`--json-schema` gate), **`mcp-config.json`** (scopes + error-response design), `context_management.py` (count, context editing, compaction, summarise-restart, threshold gate); **`exercises/05-exam-scenarios.md`** — 6 scenarios × D1–D5 + rapid-fire, with answers | all            | 4 scripts + 2 configs                                                                                                            |
| —   | `python-concepts/`        | every Python concept the project uses, from scratch (venv, imports, strings, collections, typing, control flow, exceptions, classes/Pydantic, decorators, context managers, generators, pathlib, JSON, subprocess, env, asyncio, stdlib misc, the four SDKs)                                                                                                                                                                                                                                                                                                                         | —              | 21 pages                                                                                                                         |

Shared plumbing: `sessions/_env.py` loads `.env`, fixes Windows console encoding, locates
git-bash for the Agent SDK, and exposes `ROOT`, `MODEL` (`ANTHROPIC_MODEL` or
`claude-opus-5`) and `CHEAP` (`claude-haiku-4-5`).

### Claude Code project assets (committed, used by the sessions)

| Path                    | What                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`             | project memory; `.claude/rules/tests.md` adds path-scoped rules for `tests/**`, `pages/**`, `fixtures/**`                                                                                                                                    |
| `.claude/settings.json` | team permissions (deny `.env`, force-push, `rm -rf`), env, **hooks**: `PreToolUse` → `.claude/hooks/pre_tool_use.py` (blocks dangerous commands and test anti-patterns), `PostToolUse` → `claude-config/hooks/format_on_write.py` (Prettier) |
| `.claude/skills/`       | `ci-triage` (multi-file: SKILL.md + reference.md + scripts/summarize.py), `bug-analyzer`, `locator-auditor`, `self-healer`, `test-generator`, `test-reviewer`                                                                                |
| `.claude/commands/`     | `/heal`, `/generate-tests`, `/audit-locators`                                                                                                                                                                                                |
| `.claude/agents/`       | `test-healer` (sonnet, edits), `results-analyst` (haiku, read-only, MCP tools)                                                                                                                                                               |
| `.mcp.json`             | project-scoped MCP servers: `playwright` (browser) and `ryvan-results` (`sessions/05-mcp/server.py`)                                                                                                                                         |

### `claude-config/` — advanced configuration demos (Lesson 7)

`show_settings.py` (merged settings with winning source), `env_audit.py` (40 env vars,
`--live`, `--claude`), `proxy_demo.py` + `proxy_addon.py` (mitmproxy TLS inspection),
`cost_report.py`, `statusline.py`, `providers_sdk.py` (Anthropic / Bedrock / Vertex clients),
`hooks/format_on_write.py`, `managed-settings.example.json`, `keybindings.example.json`.
Settings hierarchy: managed > `--settings` > `.claude/settings.local.json` > `.claude/settings.json`

> `~/.claude/settings.json`; `permissions` merge with deny winning; `ANTHROPIC_MODEL` beats
> `model`, `--model` beats both. Windows managed path `C:\Program Files\ClaudeCode\managed-settings.json`.

### `claude-agent/` — the raw agent loop (Lesson: tool use)

`01_basic_claude.py` (one call) → `02_tool_call.py` (Claude asks for a tool) →
`03_agent_loop.py` (think → act → observe → check, fixing a deliberately indirect bug in `demo/`).

### `.devcontainer/` — runs on Docker or Podman

Claude Code via the official feature, `CLAUDE_CONFIG_DIR` on a named volume, team
`containerEnv`, `managed-settings.json` baked into `/etc/claude-code/`, `ryvan-firewall.sh`
default-deny egress. `npx @devcontainers/cli up --workspace-folder . [--docker-path podman]`.

---

## 5. Dependencies

| Package                                                                                                | Purpose                                                    |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `@playwright/test`, `@faker-js/faker`, `dotenv`                                                        | test runner, data, `.env` (TypeScript framework)           |
| `eslint` + `eslint-plugin-playwright` + `typescript-eslint`, `prettier`                                | lint/format (Prettier is also run by the PostToolUse hook) |
| `anthropic` 1.x, `claude-agent-sdk`, `mcp[cli]` 2.x, `pydantic`, `jsonschema`, `voyageai`, `mitmproxy` | Python sessions — `requirements.txt`                       |

Environment variables: `ANTHROPIC_API_KEY` (shell / CI secret store), optional
`ANTHROPIC_MODEL`; in `.env`: `BASE_URL`, `API_URL`, `QA_USER`, `QA_PASSWORD`, `VOYAGE_API_KEY`
(RAG demos; free tier is 3 RPM / 10K TPM, the demos cache embeddings and back off).
