# Demo Projects — Self-Healing Locators & Claude Platform

Standalone demo sub-project for demonstrating self-healing locator strategies
and Claude AI platform concepts. Fully independent from the main E2E suite.

---

## Quick Start

```bash
cd demo-projects
npm install
npx playwright install chromium
```

---

## 1. Demo App

A mock banking app at `demo-app/index.html` with login, dashboard, transactions,
accounts, and profile pages. All elements have `data-test` attributes.

**Break Locators toggle:** Click the bottom-right toggle (or add `?broken` to URL)
to simulate a frontend redesign — renames `data-test` → `data-qa`, changes IDs,
swaps classes, and modifies button text.

```bash
npm run demo:serve          # http://localhost:4200
# Login: demo / password123
```

---

## 2. Self-Healing WITHOUT AI (7 specs, 29 tests)

Pure Playwright strategies — no external APIs needed.

```bash
npm run test:without-ai                    # run all 7
npx playwright test self-healing/without-ai/01-fallback-locators.spec.ts --headed  # single spec
```

| # | Spec | Strategy | What It Demonstrates |
|---|------|----------|---------------------|
| 01 | Fallback Locators | Cascading locator list | Try `data-test` → `id` → `role` → `type`, first visible wins |
| 02 | Attribute Cascade | Multi-convention matching | Try `data-test` → `data-qa` → `data-testid` → `data-cy` |
| 03 | Text Content Matching | Semantic locators | `getByRole`, `getByLabel`, `getByPlaceholder` survive any redesign |
| 04 | Structural Locators | DOM relationships | `nav > a`, `.filter()`, parent traversal — layout survives attribute changes |
| 05 | CSS + XPath Fallback | Dual strategy | CSS for speed, XPath text predicates as fallback |
| 06 | Custom LocatorResolver | Production pattern | Centralized resolver class with named strategies + logging |
| 07 | Dynamic Locator Builder | Element fingerprinting | Capture fingerprint (tag, placeholder, aria-label), rebuild selector |

---

## 3. Self-Healing WITH AI (5 specs)

Uses the Claude API (`@anthropic-ai/sdk`). Requires `ANTHROPIC_API_KEY` in `.env`.

```bash
cp .env.example .env       # Add your sk-ant-... key
npm run test:with-ai
```

| # | Spec | Strategy | What It Demonstrates |
|---|------|----------|---------------------|
| 01 | DOM Diff Analysis | HTML → Claude → selector | Send broken page HTML + old selector, get working replacement |
| 02 | Screenshot Analysis | Vision API | Send page screenshot, Claude visually identifies the element |
| 03 | Semantic Locator Gen | Intent → selector | Describe element in English, Claude generates the locator |
| 04 | Test Code Auto-Fix | Code rewriting | Claude rewrites entire broken test with working selectors |
| 05 | Page Object Regen | Full POM generation | Claude generates complete Page Object class from DOM |

**Shared helper:** `self-healing/with-ai/claude-healer.ts` — wraps `@anthropic-ai/sdk` with `healLocator()`, `analyzeScreenshot()`, and `generatePageObject()`.

---

## 4. Claude Platform Concepts (6 demos)

Standalone TypeScript scripts demonstrating Claude API capabilities.

```bash
npx tsx claude-platform/01-agent-loop.ts   # requires ANTHROPIC_API_KEY
npx tsx claude-platform/04-mcp.ts          # no API key needed (simulated)
```

| # | Script | Concept | What It Demonstrates |
|---|--------|---------|---------------------|
| 01 | `01-agent-loop.ts` | **Agent Loop** | Autonomous cycle: read failure → diagnose → fix → re-run → repeat until green. Checks `stop_reason` to know when Claude wants to act vs. is done. |
| 02 | `02-tool-use.ts` | **Tool Use** | Define tools as JSON Schema, Claude decides when/which to call. You execute the tool and return results. Core building block of agents. |
| 03 | `03-thinking.ts` | **Extended Thinking** | `thinking: { type: 'enabled', budget_tokens: N }` — Claude shows internal chain-of-thought reasoning before answering. Ideal for root cause analysis. |
| 04 | `04-mcp.ts` | **MCP** | Model Context Protocol — JSON-RPC standard for connecting AI to tools. Shows tool listing, tool calls, and resource reads. No API key needed. |
| 05 | `05-skills.ts` | **Skills** | System prompts that shape Claude into specialists. Same model + different skill = test reviewer, locator auditor, test generator, bug analyzer. |
| 06 | `06-claude-code.ts` | **Claude Code** | Natural language → production-ready Playwright tests. Claude reads page HTML and generates complete spec files with semantic locators. |

---

## 5. Claude Code Configuration Files

These files demonstrate how Claude Code is configured in real projects.

### CLAUDE.md — Project Instructions
**File:** `CLAUDE.md` (this project's root)

```
CLAUDE.md is automatically loaded by Claude Code when you open a project.
It provides context, conventions, and instructions that shape every response.
```

**What it does:** Tells Claude about the project structure, coding conventions,
available commands, and key patterns. Claude reads this before every interaction.

**Workflow:** Open any project → Claude reads CLAUDE.md → knows your conventions automatically.

---

### Skills — Reusable Specialist Prompts
**Directory:** `.claude/skills/`

| Skill | File | What It Does |
|-------|------|-------------|
| Test Reviewer | `test-reviewer.md` | Reviews test code for flaky patterns, missing assertions, banned anti-patterns |
| Locator Auditor | `locator-auditor.md` | Rates every locator S→F tier, suggests upgrades to semantic selectors |
| Test Generator | `test-generator.md` | Generates complete test files from natural language descriptions |
| Self-Healer | `self-healer.md` | Analyzes broken locators and suggests resilient replacements |
| Bug Analyzer | `bug-analyzer.md` | Classifies failures as test bug / app bug / environment issue |

**Workflow:** Claude Code loads skills when relevant. You can also invoke them explicitly:
```
"Use the locator-auditor skill to audit my test files"
"Review this test with the test-reviewer skill"
```

**Key concept:** Same AI model + different skill = different specialist. The skill is just a
system prompt that shapes Claude's behavior for a specific task.

---

### Commands — Custom Slash Commands
**Directory:** `.claude/commands/`

| Command | File | What It Does |
|---------|------|-------------|
| `/heal` | `heal.md` | Analyzes a failing test, finds broken locators, suggests healed replacements |
| `/audit-locators` | `audit-locators.md` | Scans test files, rates locator resilience, generates tier report |
| `/generate-tests` | `generate-tests.md` | Takes a feature description, generates a complete spec file |

**Workflow:** Type the command in Claude Code:
```
/heal self-healing/without-ai/01-fallback-locators.spec.ts
/audit-locators self-healing/
/generate-tests "Test the profile update form"
```

---

### Custom Agents — Specialized Autonomous Workers
**Directory:** `.claude/agents/`

| Agent | File | What It Does |
|-------|------|-------------|
| Test Healer | `test-healer.md` | Autonomous agent that loops: run test → diagnose → fix → re-run until green |

**Workflow:** Claude Code spawns agents for complex tasks that need autonomous iteration.
The agent has its own tool access, model selection, and behavior instructions.

**Key concept:** Agents are like skills but with autonomy — they decide what to do next
based on results, rather than following a fixed checklist.

---

### MCP — Model Context Protocol
**File:** `.mcp.json` (project root, one level up)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp", "--caps", "vision"]
    }
  }
}
```

**What it does:** Connects Claude Code to external tools via a standard protocol.
The Playwright MCP server gives Claude direct browser control — navigate, click,
fill forms, take screenshots, read page snapshots.

**Workflow:** After configuring `.mcp.json`, Claude Code can:
```
"Navigate to localhost:4200 and take a screenshot"
"Click the login button and fill the username field"
"Get the page accessibility snapshot"
```

**Key concept:** MCP is an open protocol. Any tool (Playwright, GitHub, Slack, databases)
can become an MCP server that Claude connects to.

---

### Hooks — Pre/Post Tool Execution
**File:** `.claude/settings.json`

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit",
      "command": "echo '[Hook] File edited: check for anti-patterns'"
    }]
  }
}
```

**What it does:** Hooks run shell commands before/after Claude uses tools.
Use them to enforce rules, run linters, or trigger notifications.

**Workflow:** Every time Claude edits a file, the hook fires. You can use hooks to:
- Run ESLint after every edit
- Block commits to protected branches
- Log all file changes for audit

---

## File Structure

```
demo-projects/
├── CLAUDE.md                          # Project instructions (loaded by Claude Code)
├── .mcp.json                          # MCP server config (Playwright browser control)
├── .claude/
│   ├── settings.json                  # Hooks configuration
│   ├── skills/
│   │   ├── test-reviewer.md           # Test review specialist
│   │   ├── locator-auditor.md         # Locator resilience auditor
│   │   ├── test-generator.md          # Test generation from natural language
│   │   ├── self-healer.md             # Broken locator healing
│   │   └── bug-analyzer.md            # Test failure root cause analysis
│   ├── commands/
│   │   ├── heal.md                    # /heal — fix broken locators
│   │   ├── audit-locators.md          # /audit-locators — resilience report
│   │   └── generate-tests.md          # /generate-tests — AI test generation
│   └── agents/
│       └── test-healer.md             # Autonomous test healing agent
├── demo-app/
│   └── index.html                     # Mock banking app with Break Locators toggle
├── self-healing/
│   ├── without-ai/                    # 7 specs — pure Playwright strategies
│   │   ├── 01-fallback-locators.spec.ts
│   │   ├── 02-attribute-cascade.spec.ts
│   │   ├── 03-text-content-matching.spec.ts
│   │   ├── 04-structural-locators.spec.ts
│   │   ├── 05-css-xpath-fallback.spec.ts
│   │   ├── 06-custom-locator-resolver.spec.ts
│   │   └── 07-dynamic-locator-builder.spec.ts
│   └── with-ai/                       # 5 specs — Claude API powered
│       ├── claude-healer.ts           # Shared Anthropic SDK wrapper
│       ├── 01-dom-diff-analysis.spec.ts
│       ├── 02-screenshot-analysis.spec.ts
│       ├── 03-semantic-locator-gen.spec.ts
│       ├── 04-test-code-autofix.spec.ts
│       └── 05-page-object-regen.spec.ts
├── claude-platform/                   # 6 standalone API concept demos
│   ├── 01-agent-loop.ts
│   ├── 02-tool-use.ts
│   ├── 03-thinking.ts
│   ├── 04-mcp.ts
│   ├── 05-skills.ts
│   └── 06-claude-code.ts
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```
