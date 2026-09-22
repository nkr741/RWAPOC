"""Session 5 — a custom MCP server wrapping a REST API from scratch (the RWA backend on :3001).

    python sessions/05-mcp/rest_api_server.py            # stdio; needs the RWA app running
    claude mcp add rwa -- python sessions/05-mcp/rest_api_server.py

Design rules this file demonstrates (they are exam material, D2):
  * credentials come from the environment, never from tool arguments — the model must not
    be able to choose who it logs in as;
  * one tool per intent, small typed inputs, clear docstrings (the docstring IS the prompt);
  * read tools are annotated readOnlyHint; the one write tool is destructiveHint + confirmation
    text, so a client in `auto` permission mode can treat them differently;
  * errors return structured, actionable text — not stack traces — so the model can recover.
"""

import json
import os
import sys
from pathlib import Path

import httpx2 as httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import _env  # noqa: E402,F401  (.env -> API_URL, QA_USER, QA_PASSWORD)

API = os.environ.get("API_URL", "http://localhost:3001")
# RWA reseeds random users on start; like utils/db.client.ts, fall back to the first seeded one.
_DB = Path(__file__).resolve().parents[2] / "rwa-app" / "data" / "database.json"
USER = os.environ.get("QA_USER") if not _DB.exists() else json.loads(_DB.read_text())["users"][0]["username"]
PASSWORD = os.environ.get("QA_PASSWORD", "s3cret")
mcp = MCPServer("rwa", instructions="Cypress Real World App banking API. Amounts are in cents.")
_http = httpx.Client(base_url=API, timeout=10)
READ = ToolAnnotations(readOnlyHint=True)


def _session() -> httpx.Client:
    """Log in once with the QA user from the environment; the cookie jar keeps the session."""
    if "connect.sid" not in _http.cookies:
        r = _http.post("/login", json={"username": USER, "password": PASSWORD})
        r.raise_for_status()
    return _http


def _get(path: str, **params) -> dict:
    try:
        r = _session().get(path, params=params)
        r.raise_for_status()
        return r.json()
    # ToolError's message reaches the model verbatim (is_error=true); any other exception is
    # masked as "Error executing tool X" — useless to the model, so it can't recover.
    except httpx.ConnectError:
        raise ToolError(f"RWA API not reachable at {API}. Start it: cd rwa-app && yarn start:api") from None
    except httpx.HTTPStatusError as e:
        raise ToolError(
            f"{e.request.method} {e.request.url.path} -> {e.response.status_code}: {e.response.text[:200]}"
        ) from None


@mcp.tool(annotations=READ)
def my_profile() -> dict:
    """The logged-in QA user's profile (id, username, balance in cents)."""
    u = _get("/checkAuth")["user"]
    return {k: u.get(k) for k in ("id", "username", "firstName", "lastName", "balance")}


@mcp.tool(annotations=READ)
def search_users(q: str) -> list[dict]:
    """Search users by name, username or email substring. Returns at most 20."""
    return [
        {k: u[k] for k in ("id", "username", "firstName", "lastName")}
        for u in _get("/users/search", q=q)["results"][:20]
    ]


@mcp.tool(annotations=READ)
def bank_accounts() -> list[dict]:
    """Bank accounts of the logged-in user (deleted ones excluded)."""
    return [a for a in _get("/bankAccounts")["results"] if not a.get("isDeleted")]


@mcp.tool(annotations=READ)
def recent_transactions(limit: int = 10) -> list[dict]:
    """The user's most recent transactions: id, amount (cents), status, description."""
    rows = _get("/transactions")["results"][:limit]
    return [{k: t.get(k) for k in ("id", "amount", "status", "description", "createdAt")} for t in rows]


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True))
def pay_user(receiver_id: str, amount_cents: int, description: str) -> dict:
    """Send a payment. IRREVERSIBLE — moves real (seeded) money; confirm with the user first."""
    if amount_cents <= 0:
        raise ToolError("amount_cents must be a positive integer number of cents")
    me = my_profile()
    r = _session().post(
        "/transactions",
        json={
            "transactionType": "payment",
            "senderId": me["id"],
            "receiverId": receiver_id,
            "amount": amount_cents,
            "description": description,
        },
    )
    r.raise_for_status()
    return r.json()["transaction"]


if __name__ == "__main__":
    mcp.run("stdio")
