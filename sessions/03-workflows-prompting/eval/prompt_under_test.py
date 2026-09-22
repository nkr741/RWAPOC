"""The thing being evaluated. Change PROMPT, re-run 02 and 03, compare scores. That loop IS
prompt engineering with evidence.
"""

LABELS = ("APP_BUG", "TEST_BUG", "FLAKY", "ENV")

PROMPT = """You triage Playwright CI failures for a banking web app.

Classify the failure below as exactly one of:
- APP_BUG  — the product behaves wrongly (bad status code, wrong data, broken UI)
- TEST_BUG — the test is wrong (stale locator, wrong assertion, bad test data)
- FLAKY    — timing/race; would likely pass on retry
- ENV      — infrastructure: network, ports, missing browser, secrets, disk

<failure>
{failure}
</failure>

Answer in exactly two lines, no blank line between them: line 1 the label, line 2 one sentence of reasoning."""
