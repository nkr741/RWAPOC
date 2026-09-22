"""Session 5 — a complete MCP server: tools, resources, prompts, logging, progress, sampling, roots.

Domain: Playwright test results (data/results.json by default). The same server runs over
either transport:

    python sessions/05-mcp/server.py                     # stdio  (Claude Code / Desktop spawn it)
    python sessions/05-mcp/server.py --http              # Streamable HTTP on http://127.0.0.1:8765/mcp
    npx @modelcontextprotocol/inspector python sessions/05-mcp/server.py     # the Inspector UI

Every capability below is exercised by client.py; Claude Code uses it via .mcp.json (root).
"""

import argparse
import json
import sys
import warnings
from pathlib import Path

from mcp import MCPDeprecationWarning, SamplingMessage
from mcp.server.mcpserver import Context, MCPServer
from mcp.types import TextContent

DATA = Path(__file__).parent / "data" / "results.json"
# mcp 2.2 marks the roots and logging capabilities deprecated (SEP-2577, 2026-07-28). They still
# work, every client supports them, and the exam syllabus names them — so we demo them quietly.
warnings.filterwarnings("ignore", category=MCPDeprecationWarning)

mcp = MCPServer(
    "ryvan-results",
    instructions="Playwright CI results for the ryvan-e2e repo. Use summarize_run first, then "
    "failures for details. triage_failure classifies one failure.",
)


# ── helpers ───────────────────────────────────────────────────────────────────────────────
def _specs(path: Path = DATA) -> list[dict]:
    """Flatten Playwright's JSON reporter into one dict per spec."""
    out = []
    for suite in json.loads(path.read_text())["suites"]:
        for spec in suite["specs"]:
            attempts = [(t["projectName"], r) for t in spec["tests"] for r in t["results"]]
            failed = [r for _, r in attempts if r["status"] in ("failed", "timedOut")]
            out.append(
                {
                    "file": spec["file"],
                    "line": spec["line"],
                    "title": spec["title"],
                    "projects": sorted({p for p, _ in attempts}),
                    "status": "passed" if not failed else ("flaky" if spec["ok"] else "failed"),
                    "error": failed[0]["error"]["message"] if failed else None,
                }
            )
    return out


# ── TOOLS: model-controlled actions; typed signature => JSON schema for free ─────────────
@mcp.tool()
def summarize_run() -> dict:
    """Counts of passed / flaky / failed specs in the latest Playwright run."""
    specs = _specs()
    return {k: sum(s["status"] == k for s in specs) for k in ("passed", "flaky", "failed")} | {
        "total": len(specs)
    }


@mcp.tool()
def failures(include_flaky: bool = False) -> list[dict]:
    """Failed specs with their first error. include_flaky adds specs that passed on retry."""
    wanted = {"failed", "flaky"} if include_flaky else {"failed"}
    return [s for s in _specs() if s["status"] in wanted]


@mcp.tool()
async def classify_failures(ctx: Context) -> list[dict]:
    """Ask the CLIENT's model to label every failure APP_BUG/TEST_BUG/FLAKY/ENV (MCP sampling).

    The server has no API key and no model: it sends a sampling request back over the same
    connection and the client decides which model answers (and whether to allow it at all).
    Progress and log notifications stream while it works.
    """
    fails = [s for s in _specs() if s["status"] != "passed"]
    labelled = []
    for i, spec in enumerate(fails, 1):
        await ctx.info(f"classifying {spec['file']}:{spec['line']}")
        result = await ctx.session.create_message(
            messages=[
                SamplingMessage(
                    role="user",
                    content=TextContent(
                        type="text",
                        text=(
                            "Classify this Playwright failure as exactly one of APP_BUG, TEST_BUG, FLAKY, ENV. "
                            f"Reply with the label only.\n\nstatus={spec['status']}\n{spec['error']}"
                        ),
                    ),
                )
            ],
            max_tokens=20,
            system_prompt="You triage CI failures for a Playwright suite.",
        )
        label = result.content.text.strip() if result.content.type == "text" else "?"
        labelled.append({**spec, "label": label})
        await ctx.report_progress(i, len(fails), f"{i}/{len(fails)} done")
    return labelled


@mcp.tool()
async def workspace_roots(ctx: Context) -> list[str]:
    """Which directories the client says this server may care about (MCP roots)."""
    roots = await ctx.session.list_roots()
    return [str(r.uri) for r in roots.roots]


# ── RESOURCES: application-controlled context; addressed by URI, read-only ───────────────
@mcp.resource("results://latest", mime_type="application/json")
def latest_results() -> str:
    """The raw Playwright JSON report."""
    return DATA.read_text()


@mcp.resource("results://spec/{basename}/{line}", mime_type="application/json")
def spec_by_location(basename: str, line: str) -> str:
    """One spec by file basename and line — a resource TEMPLATE; each {param} matches ONE path segment."""
    for s in _specs():
        if s["file"].endswith("/" + basename) and str(s["line"]) == line:
            return json.dumps(s)
    raise ValueError(f"no spec at {basename}:{line}")


# ── PROMPTS: user-controlled templates the client can list and fill in ───────────────────
@mcp.prompt()
def triage_failure(basename: str, line: str) -> str:
    """Root-cause a single failing spec (fill from results://spec/{basename}/{line})."""
    spec = json.loads(spec_by_location(basename, line))
    return (
        f"Triage this Playwright failure. Classify APP_BUG / TEST_BUG / FLAKY / ENV, cite the "
        f"evidence, propose the fix.\n\n<failure>\n{json.dumps(spec, indent=2)}\n</failure>"
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--http", action="store_true", help="Streamable HTTP instead of stdio")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    if args.http:
        import anyio

        anyio.run(lambda: mcp.run_streamable_http_async(host="127.0.0.1", port=args.port))
    else:
        # stdio: NEVER print() to stdout in this mode — stdout is the JSON-RPC channel.
        print("ryvan-results MCP server on stdio", file=sys.stderr)
        mcp.run("stdio")
