"""Session 5 — an MCP CLIENT that exercises everything server.py exposes.

Three ways to connect, same code afterwards:

    python sessions/05-mcp/client.py                 # in-process (no transport; fastest to debug)
    python sessions/05-mcp/client.py stdio           # spawn `python server.py`, talk over stdin/stdout
    python sessions/05-mcp/client.py http            # needs `python server.py --http` running

The client also SERVES three things the server may ask for: sampling (a model completion —
answered here with the Anthropic API), roots (which directories matter), and a log sink.
"""

import asyncio
import logging
import sys
from pathlib import Path

import anthropic
from mcp import Client, StdioServerParameters
from mcp.types import (
    CreateMessageRequestParams,
    CreateMessageResult,
    ListRootsResult,
    LoggingMessageNotificationParams,
    Root,
    TextContent,
)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _env import CHEAP, ROOT  # noqa: E402

HERE = Path(__file__).parent
MODE = sys.argv[1] if len(sys.argv) > 1 else "inprocess"
logging.basicConfig(level=logging.WARNING)  # hide httpx/mcp INFO chatter


# ── what the client offers the server ───────────────────────────────────────────────────
async def sampling(_ctx, params: CreateMessageRequestParams) -> CreateMessageResult:
    """Server asked for a completion. The CLIENT owns the key, the model choice and the veto."""
    msg = anthropic.Anthropic().messages.create(
        model=CHEAP,
        max_tokens=params.max_tokens,
        system=params.system_prompt or "",
        messages=[{"role": m.role, "content": m.content.text} for m in params.messages],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    return CreateMessageResult(
        role="assistant", model=msg.model, stopReason="endTurn", content=TextContent(type="text", text=text)
    )


async def roots(_ctx) -> ListRootsResult:
    return ListRootsResult(roots=[Root(uri=ROOT.as_uri(), name="ryvan-e2e")])


async def on_log(p: LoggingMessageNotificationParams) -> None:
    print(f"   [server log {p.level}] {p.data}")


async def on_progress(progress: float, total: float | None, message: str | None) -> None:
    print(f"   [progress] {progress:.0f}/{total:.0f} {message or ''}")


def connect() -> Client:
    kw = dict(sampling_callback=sampling, list_roots_callback=roots, logging_callback=on_log)
    if MODE == "stdio":
        return Client(
            StdioServerParameters(command=sys.executable, args=[str(HERE / "server.py")]), mode="legacy", **kw
        )
    if MODE == "http":
        return Client("http://127.0.0.1:8765/mcp", mode="legacy", **kw)
    from server import mcp  # in-process: pass the MCPServer object itself

    # "auto" picks the direct in-memory dispatcher, which has no back-channel for server→client
    # requests (roots, sampling); "legacy" runs a full session pair in memory and does.
    return Client(mcp, mode="legacy", **kw)


async def main() -> None:
    async with connect() as c:
        print(f"connected ({MODE}) to {c.server_info.name} — instructions: {c.instructions[:60]}…")

        print("\n== discovery: what does the server offer? ==")
        tools = await c.list_tools()
        print("  tools:    ", [t.name for t in tools.tools])
        print("  resources:", [str(r.uri) for r in (await c.list_resources()).resources])
        print(
            "  templates:", [t.uri_template for t in (await c.list_resource_templates()).resource_templates]
        )
        print("  prompts:  ", [p.name for p in (await c.list_prompts()).prompts])
        print("  schema of failures:", tools.tools[1].input_schema)

        print("\n== tools ==")
        r = await c.call_tool("summarize_run")
        print(
            "  summarize_run ->",
            r.content[0].text,
            "(plain dict return = text content; structured_content is for typed returns)",
        )
        r = await c.call_tool("failures", {"include_flaky": True})
        print(
            "  failures(include_flaky) ->",
            [f"{s['file']}:{s['line']} {s['status']}" for s in r.structured_content["result"]],
        )

        print("\n== resources ==")
        raw = await c.read_resource("results://latest")
        print("  results://latest ->", len(raw.contents[0].text), "bytes of", raw.contents[0].mime_type)
        one = await c.read_resource("results://spec/transactions.api.spec.ts/23")
        print("  results://spec/…/23 ->", one.contents[0].text[:80], "…")

        print("\n== prompts ==")
        p = await c.get_prompt("triage_failure", {"basename": "bank-accounts.spec.ts", "line": "41"})
        print("  triage_failure ->", p.messages[0].content.text[:90].replace("\n", " "), "…")

        print("\n== roots (server asks us) ==")
        print("  workspace_roots ->", (await c.call_tool("workspace_roots")).structured_content)

        print("\n== sampling + notifications (server asks our model, streams progress/logs) ==")
        r = await c.call_tool("classify_failures", progress_callback=on_progress)
        for s in r.structured_content["result"]:
            print(f"  {s['label']:<9} {s['file']}:{s['line']}")

        print("\n== error path: a bad tool argument comes back as is_error, not an exception ==")
        r = await c.call_tool("failures", {"include_flaky": "yes please"})
        print("  is_error:", r.is_error, "->", r.content[0].text[:100])


asyncio.run(main())
