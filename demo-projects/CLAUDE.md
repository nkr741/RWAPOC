# CLAUDE.md — Demo Projects

This file is automatically loaded by Claude Code when working in this directory. It provides project context, conventions, and instructions.

## What This Is

Standalone demo sub-project showcasing self-healing locator strategies and Claude AI platform concepts. Built on a mock banking app served via `npx serve` on port 4200.

## Commands

```bash
# Serve the demo app
npm run demo:serve              # http://localhost:4200

# Self-healing tests (no API key needed)
npm run test:without-ai         # 7 specs, 29 tests
npx playwright test self-healing/without-ai/01-fallback-locators.spec.ts --headed

# AI-powered self-healing (requires ANTHROPIC_API_KEY in .env)
npm run test:with-ai            # 5 specs

# Claude platform concept scripts (11 scripts: 00-10)
npx tsx claude-platform/00-first-api-call.ts   # Hello World
npx tsx claude-platform/01-agent-loop.ts
npx tsx claude-platform/04-mcp.ts              # no API key needed
npx tsx claude-platform/08-built-in-tools.ts   # no API key needed

# All tests
npm test
```

## Architecture

### Demo App (`demo-app/index.html`)
Single-page banking app with hash routing. Login: `demo` / `password123`.

**Break Locators toggle** (bottom-right, or `?broken` URL param):
- Renames `data-test` → `data-qa` with `_v2` suffix
- Changes element IDs (appends `-redesigned`)
- Swaps CSS classes (`btn` → `button-primary`, `card` → `panel`)
- Rewrites button text (`Sign In` → `Log In`, `Save` → `Update Profile`)

### Self-Healing Without AI (`self-healing/without-ai/`)
7 pure Playwright strategies that find elements after the "break" — no external APIs.

### Self-Healing With AI (`self-healing/with-ai/`)
5 specs using `@anthropic-ai/sdk` to call Claude for DOM analysis, screenshot vision, semantic locator generation, test auto-fix, and page object regeneration. Shared helper: `claude-healer.ts`.

### Claude Platform Demos (`claude-platform/`)
17 standalone TypeScript scripts (00-16) covering two certification courses:

**Claude Platform 101 (00-10):** first API call, agent loop, tool use, extended thinking, MCP, skills, Claude Code integration, choosing models, built-in tools, context management, and managed agents.

**AI Fluency: Framework & Foundations (11-16):** generative AI basics (capabilities & limitations), delegation (task classification), prompting techniques (5 methods), discernment & the description-discernment loop, diligence (responsible AI use), and model-based code/data generation + evaluation pipeline.

## Key Conventions

- **Test ID attribute**: `data-test` (set in `playwright.config.ts`)
- **No hardcoded waits**: use Playwright auto-waiting
- **Semantic locators preferred**: `getByRole` > `getByLabel` > `getByTestId` > CSS
- **TypeScript strict mode**: all files

## Environment

- `ANTHROPIC_API_KEY` — required only for with-AI specs and platform demos (except `04-mcp.ts`)
- Demo app runs on port 4200 via `npx serve`
- Playwright auto-starts the server via `webServer` config
