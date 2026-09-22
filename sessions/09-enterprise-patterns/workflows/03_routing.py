"""Workflow: ROUTING — a cheap classifier picks the handler (prompt + model) for each request.

Support-desk style: trivial questions go to Haiku with a FAQ prompt; code questions to Opus
with the repo docs; anything about money or account changes goes to a human queue. Routing is
how you spend Opus only where it matters (cost) and keep risky intents out of the model's hands
(human-in-the-loop gate).

    python sessions/09-enterprise-patterns/workflows/03_routing.py
"""

import sys
from pathlib import Path

import anthropic
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import CHEAP, MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
ROUTES = {
    "faq": dict(
        model=CHEAP,
        system="Answer from this FAQ only, one sentence: RWA default password is s3cret; "
        "ports 3000 (web) and 3001 (api); tests run with `npm test`.",
    ),
    "code": dict(
        model=MODEL,
        system="You are a senior engineer on this repo. Cite files.\n\n" + (ROOT / "CLAUDE.md").read_text(),
    ),
    "human": None,  # never answered by a model
}


class Route(BaseModel):
    route: str  # faq | code | human
    reason: str


def route(request: str) -> Route:
    return client.messages.parse(
        model=CHEAP,
        max_tokens=200,
        output_format=Route,
        messages=[
            {
                "role": "user",
                "content": (
                    "Route this request. faq = simple factual question about the app/tests; code = needs reading or changing "
                    "code; human = anything about payments, refunds, deleting data, credentials, or legal.\n\n"
                    f"<request>{request}</request>"
                ),
            }
        ],
    ).parsed_output


REQUESTS = [
    "What's the default password for the seeded users?",
    "Why does the shared page fixture exist and where is it defined?",
    "Please refund transaction J5Fd3dlBEBu to the customer.",
]
for req in REQUESTS:
    r = route(req)
    print(f"\n> {req}\n  route={r.route:<6} ({r.reason[:60]})")
    handler = ROUTES[r.route]
    if handler is None:
        print("  -> queued for a human agent (HITL gate); no model call made")
        continue
    ans = client.messages.create(max_tokens=600, messages=[{"role": "user", "content": req}], **handler)
    print(
        f"  -> [{handler['model']}] {''.join(b.text for b in ans.content if b.type == 'text').strip()[:220]}"
    )
