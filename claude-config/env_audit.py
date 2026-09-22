"""Audit the Claude Code environment variables on this machine, and prove model routing live.

    python claude-config/env_audit.py              # table: every documented var, set or not
    python claude-config/env_audit.py --live       # + one real API call showing which model answered
    ANTHROPIC_MODEL=claude-sonnet-5 python claude-config/env_audit.py --claude
                                                   # + run `claude -p` and show the model IT used

Names and meanings come from https://code.claude.com/docs/en/env-vars and
https://code.claude.com/docs/en/network-config (checked 2026-09-17). Secrets are masked.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

# (name, category, one-line meaning)
VARS = [
    # --- authentication: first match wins ---
    (
        "ANTHROPIC_API_KEY",
        "auth",
        "Console API key, sent as X-Api-Key. Pay-per-token. Beats a subscription login in -p mode",
    ),
    ("ANTHROPIC_AUTH_TOKEN", "auth", "Raw Bearer token for the Authorization header (gateways, OAuth)"),
    (
        "CLAUDE_CODE_OAUTH_TOKEN",
        "auth",
        "Long-lived token from `claude setup-token` (Pro/Max subscription) for CI",
    ),
    ("ANTHROPIC_CUSTOM_HEADERS", "auth", "Extra headers, 'Name: Value' per line (e.g. Bedrock guardrails)"),
    # --- model routing ---
    (
        "ANTHROPIC_MODEL",
        "model",
        "Model for this session. Overrides `model` in every settings file; --model overrides this",
    ),
    ("ANTHROPIC_DEFAULT_MODEL", "model", "Model for NEW sessions when nothing else picks one"),
    (
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "model",
        "What the `opus` alias resolves to (pin versions on Bedrock/Vertex)",
    ),
    ("ANTHROPIC_DEFAULT_SONNET_MODEL", "model", "What the `sonnet` alias resolves to"),
    (
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
        "model",
        "What `haiku` resolves to; also used for background tasks (titles, summaries)",
    ),
    ("ANTHROPIC_SMALL_FAST_MODEL", "model", "[deprecated] old name for the Haiku-class background model"),
    (
        "MAX_THINKING_TOKENS",
        "model",
        "Cap thinking budget on fixed-budget models (adaptive models use /effort instead)",
    ),
    # --- provider switches ---
    (
        "CLAUDE_CODE_USE_BEDROCK",
        "provider",
        "=1 routes model traffic to Amazon Bedrock (AWS creds via default chain)",
    ),
    ("AWS_REGION", "provider", "Bedrock region (falls back to AWS_DEFAULT_REGION, profile, then us-east-1)"),
    ("AWS_PROFILE", "provider", "AWS SSO/CLI profile to use"),
    ("AWS_BEARER_TOKEN_BEDROCK", "provider", "Bedrock API key — auth without full IAM credentials"),
    (
        "CLAUDE_CODE_USE_VERTEX",
        "provider",
        "=1 routes to Google Cloud Agent Platform (Vertex); auth via gcloud ADC",
    ),
    ("CLOUD_ML_REGION", "provider", "Vertex location: global | us | eu | us-east5 ..."),
    ("ANTHROPIC_VERTEX_PROJECT_ID", "provider", "GCP project for Vertex requests"),
    ("CLAUDE_CODE_USE_FOUNDRY", "provider", "=1 routes to Microsoft Foundry"),
    ("ANTHROPIC_FOUNDRY_RESOURCE", "provider", "Foundry resource name"),
    (
        "ANTHROPIC_BASE_URL",
        "network",
        "Point the Anthropic API at an LLM gateway (LiteLLM etc.) instead of api.anthropic.com",
    ),
    # --- network ---
    (
        "HTTPS_PROXY",
        "network",
        "Corporate proxy for outbound HTTPS (https_proxy lowercase also honoured; no SOCKS)",
    ),
    ("HTTP_PROXY", "network", "Proxy when HTTPS proxy isn't available"),
    ("NO_PROXY", "network", "Hosts that bypass the proxy, comma- or space-separated; loopback never proxied"),
    (
        "NODE_EXTRA_CA_CERTS",
        "network",
        "PEM bundle of extra CAs — the fix for TLS-inspecting proxies when the root isn't in the OS store",
    ),
    (
        "CLAUDE_CODE_CERT_STORE",
        "network",
        "Which trust stores to use: bundled,system (default) | bundled | system",
    ),
    ("CLAUDE_CODE_CLIENT_CERT", "network", "mTLS client certificate (PEM)"),
    ("CLAUDE_CODE_CLIENT_KEY", "network", "mTLS client key (PEM)"),
    ("API_TIMEOUT_MS", "network", "Per-request timeout, default 600000"),
    # --- privacy / feature flags ---
    ("DISABLE_TELEMETRY", "flags", "Any non-empty value stops operational telemetry to Datadog"),
    ("DISABLE_ERROR_REPORTING", "flags", "Any non-empty value stops error reports"),
    (
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
        "flags",
        "One switch for telemetry + error reports + changelog fetch + other non-model traffic",
    ),
    (
        "BASH_DEFAULT_TIMEOUT_MS",
        "flags",
        "Default Bash tool timeout (120000). This repo sets 300000 in .claude/settings.json",
    ),
    ("BASH_MAX_TIMEOUT_MS", "flags", "Ceiling the model may request (600000)"),
    ("BASH_MAX_OUTPUT_LENGTH", "flags", "Chars of tool output kept (30000, max 150000)"),
    (
        "ENABLE_CLAUDEAI_MCP_SERVERS",
        "flags",
        "=false stops fetching claude.ai connectors via mcp-proxy.anthropic.com",
    ),
    ("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", "flags", "=1 enables agent teams (~7x tokens)"),
    # --- location ---
    (
        "CLAUDE_CONFIG_DIR",
        "config",
        "Move ~/.claude somewhere else (settings, sessions, credentials all follow)",
    ),
    # --- set BY Claude Code in subprocesses (read-only signals) ---
    (
        "CLAUDECODE",
        "signal",
        "=1 inside any process Claude Code spawned — scripts can detect they're under Claude",
    ),
    ("CLAUDE_CODE_SESSION_ID", "signal", "Current session id (useful for hook logs)"),
]

SECRET = ("KEY", "TOKEN", "SECRET", "PASSPHRASE")


def masked(name: str, value: str) -> str:
    if any(s in name for s in SECRET) and len(value) > 10:
        return f"{value[:7]}...{value[-3:]}  ({len(value)} chars)"
    return value


def table() -> None:
    print(f"{'variable':44} {'cat':9} {'value':32} meaning")
    print("-" * 140)
    n_set = 0
    for name, cat, meaning in VARS:
        value = os.environ.get(name)
        if value is not None:
            n_set += 1
        shown = masked(name, value) if value is not None else "-"
        print(f"{name:44} {cat:9} {shown[:32]:32} {meaning}")
    print("-" * 140)
    print(
        f"{n_set} of {len(VARS)} set. Precedence for auth: ANTHROPIC_API_KEY > ANTHROPIC_AUTH_TOKEN > subscription login."
    )
    print(
        "Set project-wide ones in .claude/settings.json `env`; personal ones in ~/.claude/settings.json `env`;"
    )
    print("shell exports are read ONCE at startup — restart `claude` after changing them.\n")


def live_api() -> None:
    """One real Messages API call. Shows the model that answered and the token accounting."""
    try:
        import anthropic
    except ImportError:
        print("--live needs the SDK:  pip install anthropic")
        return
    model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")
    print(f"[live] Messages API call with model={model!r} (from ANTHROPIC_MODEL or default)")
    client = anthropic.Anthropic()  # ANTHROPIC_API_KEY from env; ANTHROPIC_BASE_URL honoured too
    r = client.messages.create(
        model=model,
        max_tokens=40,
        messages=[{"role": "user", "content": "Reply with exactly: routed ok"}],
    )
    text = "".join(b.text for b in r.content if b.type == "text")
    print(f"[live] response.model = {r.model}")
    print(f"[live] text          = {text.strip()!r}")
    print(
        f"[live] usage         = in {r.usage.input_tokens}, out {r.usage.output_tokens}, "
        f"cache_read {r.usage.cache_read_input_tokens or 0}, cache_write {r.usage.cache_creation_input_tokens or 0}\n"
    )


def live_claude() -> None:
    """Run the Claude Code CLI headless and read back which model it billed. Proves ANTHROPIC_MODEL routing."""
    model = os.environ.get("ANTHROPIC_MODEL")
    print(f"[claude] claude -p with ANTHROPIC_MODEL={model or '<unset>'} in the environment")
    cmd = ["claude", "-p", "Reply with exactly: ok", "--output-format", "json"]
    r = subprocess.run(cmd, capture_output=True, text=True, shell=sys.platform == "win32")
    if r.returncode != 0:
        print(f"[claude] failed (exit {r.returncode}):\n{r.stderr or r.stdout}")
        return
    data = json.loads(r.stdout)
    used = list(data.get("modelUsage", {}).keys())
    print(f"[claude] modelUsage keys = {used}")
    print(f"[claude] total_cost_usd  = {data.get('total_cost_usd')}")
    print(f"[claude] result          = {data.get('result', '').strip()!r}\n")


if __name__ == "__main__":
    table()
    if "--live" in sys.argv:
        live_api()
    if "--claude" in sys.argv:
        live_claude()
