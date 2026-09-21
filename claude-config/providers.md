# Claude Code on Bedrock, Vertex, Foundry, or an LLM gateway — configuration reference

**Status: config only.** We have no AWS or GCP account, so none of this was executed. Every
variable below is taken verbatim from the docs (Bedrock, Vertex, LLM gateway pages, 2026-09-17).
`providers_sdk.py` is the Python-SDK equivalent for the API side.

The one idea: **Claude Code's provider is chosen by environment variables, not by code.** Put them
in the `env` block of `~/.claude/settings.json` (per person) or `managed-settings.json` (whole org).

## Amazon Bedrock

```json
// ~/.claude/settings.json  (or run `/setup-bedrock` — the wizard writes exactly this)
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "us-east-1",
    "AWS_PROFILE": "myprofile",

    "ANTHROPIC_DEFAULT_OPUS_MODEL": "us.anthropic.claude-opus-4-8",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "us.anthropic.claude-sonnet-4-6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "us.anthropic.claude-haiku-4-5-20251001-v1:0"
  },
  "awsAuthRefresh": "aws sso login --profile myprofile"
}
```

| Variable                            | Meaning                                                                                                                                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_CODE_USE_BEDROCK=1`         | The switch. Model traffic and auth go to Bedrock; `api.anthropic.com` is only used for WebFetch's safety check                                                                                                          |
| `AWS_REGION`                        | Resolved as `AWS_REGION` → `AWS_DEFAULT_REGION` → profile region → `us-east-1`                                                                                                                                          |
| Credentials                         | Standard AWS chain: `aws configure`, `AWS_ACCESS_KEY_ID`/`SECRET`, `AWS_PROFILE` + SSO, or `AWS_BEARER_TOKEN_BEDROCK` (a Bedrock API key — no IAM setup)                                                                |
| `ANTHROPIC_DEFAULT_*_MODEL`         | **Pin these.** Without pins, `opus`/`sonnet` aliases resolve to Claude Code's built-in default, which may not be enabled in your account. Bedrock IDs carry the cross-region prefix `us.` / `eu.` / `apac.` / `global.` |
| `ANTHROPIC_BEDROCK_REGION_PREFIX`   | Keep built-in defaults but change their prefix (`global`) instead of pinning                                                                                                                                            |
| `CLAUDE_CODE_USE_MANTLE=1`          | Bedrock's newer endpoint that speaks the native Anthropic API shape; model IDs are `anthropic.claude-sonnet-5` (no prefix, no version)                                                                                  |
| `awsAuthRefresh` (setting, not env) | Command Claude Code runs when it detects expired credentials — the SSO re-login                                                                                                                                         |
| `ANTHROPIC_CUSTOM_HEADERS`          | `X-Amzn-Bedrock-GuardrailIdentifier: id\nX-Amzn-Bedrock-GuardrailVersion: 1` for Bedrock Guardrails                                                                                                                     |

IAM: `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, `bedrock:ListInferenceProfiles`,
`bedrock:GetInferenceProfile` on `arn:aws:bedrock:*:*:inference-profile/*` and `foundation-model/*`.
Not available on Bedrock: `/logout`, WebSearch tool.

## Google Cloud Agent Platform (Vertex AI)

```json
{
  "env": {
    "CLAUDE_CODE_USE_VERTEX": "1",
    "CLOUD_ML_REGION": "global",
    "ANTHROPIC_VERTEX_PROJECT_ID": "my-gcp-project",

    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-8",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5@20251001"
  },
  "gcpAuthRefresh": "gcloud auth application-default login"
}
```

| Variable                              | Meaning                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `CLAUDE_CODE_USE_VERTEX=1`            | The switch (login prompt still calls it "Google Vertex AI"; `/setup-vertex` wizard)                 |
| `CLOUD_ML_REGION`                     | `global` (recommended), a multi-region `us`/`eu`, or a region like `us-east5`                       |
| `ANTHROPIC_VERTEX_PROJECT_ID`         | Wins over `GOOGLE_CLOUD_PROJECT` / the ADC file's project                                           |
| Credentials                           | `gcloud auth application-default login`, or `GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>` |
| `VERTEX_REGION_CLAUDE_HAIKU_4_5` etc. | Per-model region override when `global` doesn't serve that model                                    |
| `gcpAuthRefresh` (setting)            | Re-auth command on expiry                                                                           |

IAM: `roles/aiplatform.user` (needs `aiplatform.endpoints.predict`). Enable `aiplatform.googleapis.com`
and request each Claude model in Model Garden (24–48 h approval).

## Microsoft Foundry

```json
{
  "env": {
    "CLAUDE_CODE_USE_FOUNDRY": "1",
    "ANTHROPIC_FOUNDRY_RESOURCE": "my-resource",
    "ANTHROPIC_FOUNDRY_API_KEY": "..."
  }
}
```

`ANTHROPIC_FOUNDRY_AUTH_TOKEN` (Entra bearer) takes precedence over the API key. Billed via Azure Marketplace at Anthropic list rates.

## LLM gateway (LiteLLM, Portkey, your own)

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://llm-gateway.corp.example.com",
    "ANTHROPIC_AUTH_TOKEN": "gateway-virtual-key"
  }
}
```

The gateway speaks the Anthropic Messages API and forwards to whichever provider it's configured
for; Claude Code doesn't know or care. Why an org does this: **one place** for per-team virtual
keys, spend caps, audit logs, and NTLM/Kerberos proxy auth that Claude Code itself can't do.
Gotcha: `ANTHROPIC_BASE_URL` disables MCP tool search by default on non-first-party hosts, and the
fast-mode check still calls `api.anthropic.com` directly.

## Verify any of the above

Inside Claude Code: **`/status`** → the `API provider` line reads `Amazon Bedrock`, `Google Vertex AI`,
`Microsoft Foundry`, or shows the gateway base URL; region/project lines follow. If the provider line
is missing, the variables didn't reach the process — they were exported in a different shell, or
set after `claude` started (env is read once at startup).

## Cost visibility changes with the provider

| Provider                    | Where spend shows                                                | Per-user attribution                                              |
| --------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Anthropic API               | platform.claude.com/usage; Claude Code Analytics API (Admin key) | Console dashboard                                                 |
| Bedrock / Vertex / Foundry  | Your cloud billing console — Anthropic sees nothing              | OpenTelemetry export, or an LLM gateway that tracks spend per key |
| Subscription (Pro/Max/Team) | claude.ai usage page; Team/Enterprise admin spend report         | Enterprise Analytics API                                          |

`claude-config/cost_report.py` works on every provider because it reads the local transcripts, not the bill.
