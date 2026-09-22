---
name: ci-triage
description: Triage a Playwright CI run — summarise the results JSON, classify every failure as APP_BUG / TEST_BUG / FLAKY / ENV, and propose the fix. Use when the user mentions a failed run, a results.json, "why did CI fail", or asks to triage test failures.
allowed-tools: Read, Grep, Glob, Bash(python *), mcp__ryvan-results__*
---

# CI triage

Multi-file skill: this file is the instructions; `reference.md` holds the label rubric with
examples; `scripts/summarize.py` turns a Playwright results JSON into the compact table you
work from. Claude Code loads only this file's frontmatter until the skill is invoked, then the
body, and reads the other files on demand — keep the body short and point to the rest.

## Steps

1. Get the results. Prefer the `ryvan-results` MCP server (`summarize_run`, `failures`); else
   run `python .claude/skills/ci-triage/scripts/summarize.py <results.json>` (default
   `test-results/results.json`).
2. For every failed or flaky spec, open the spec file and the page objects it uses.
3. Classify each with the rubric in [reference.md](reference.md). Cite the exact locator,
   assertion, status code, or timing that decides the label.
4. Report a table: `file:line | title | label | evidence | fix`. APP_BUG rows get a bug-report
   paragraph; TEST_BUG rows get the concrete edit; FLAKY rows get the race and the wait to
   replace it (never `waitForTimeout`); ENV rows name the missing piece.
5. Offer to apply TEST_BUG fixes. Never edit tests to hide an APP_BUG.
