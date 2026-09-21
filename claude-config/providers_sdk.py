"""Same prompt, three back-ends: Anthropic API, Amazon Bedrock, Google Cloud (Vertex).

    python claude-config/providers_sdk.py               # runs whichever back-ends have credentials
    python claude-config/providers_sdk.py --only bedrock

NOT EXECUTED in our environment - we have no AWS or GCP account. The code is the documented SDK
shape (anthropic >= 0.116): one prompt, three client classes, identical `messages.create` call.
The point for the session: switching provider is a CLIENT CONSTRUCTOR change, not a code change.
Claude Code does the same thing with environment variables (see providers.md).

  Back-end          Python client                                 Auth
  ----------------  --------------------------------------------  --------------------------------
  Anthropic API     anthropic.Anthropic()                         ANTHROPIC_API_KEY
  Amazon Bedrock    anthropic.AnthropicBedrockMantle(aws_region)  AWS default credential chain
  Google Cloud      anthropic.AnthropicVertex(project_id, region) gcloud Application Default Creds

Model IDs differ per back-end:
  Anthropic: claude-opus-5 | claude-sonnet-5
  Bedrock (Mantle): anthropic.claude-sonnet-5  (Invoke API instead: us.anthropic.claude-sonnet-4-6)
  Vertex:   claude-sonnet-5  (dated snapshots use '@', e.g. claude-haiku-4-5@20251001)
"""

from __future__ import annotations

import os
import sys

import anthropic

PROMPT = "In one sentence: which cloud are you being served from, if you can tell?"


def ask(client, model: str, label: str) -> None:
    print(f"\n[{label}] model={model}")
    try:
        r = client.messages.create(model=model, max_tokens=120, messages=[{"role": "user", "content": PROMPT}])
        text = "".join(b.text for b in r.content if b.type == "text")
        print(f"[{label}] {r.model}: {text.strip()}")
        print(f"[{label}] tokens in={r.usage.input_tokens} out={r.usage.output_tokens}")
    except anthropic.AuthenticationError as e:
        print(f"[{label}] auth failed: {e.message}")
    except anthropic.APIStatusError as e:
        print(f"[{label}] API error {e.status_code}: {e.message}")
    except anthropic.APIConnectionError as e:
        print(f"[{label}] connection error: {e}")


def main() -> int:
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    ran = 0

    if only in (None, "anthropic") and os.environ.get("ANTHROPIC_API_KEY"):
        ask(anthropic.Anthropic(), "claude-sonnet-5", "anthropic")
        ran += 1

    if only in (None, "bedrock") and (os.environ.get("AWS_PROFILE") or os.environ.get("AWS_ACCESS_KEY_ID") or os.environ.get("AWS_BEARER_TOKEN_BEDROCK")):
        region = os.environ.get("AWS_REGION", "us-east-1")
        # Mantle = Bedrock endpoint that speaks the native Anthropic API shape. Preferred for new code.
        ask(anthropic.AnthropicBedrockMantle(aws_region=region), "anthropic.claude-sonnet-5", "bedrock")
        ran += 1

    if only in (None, "vertex") and os.environ.get("ANTHROPIC_VERTEX_PROJECT_ID"):
        region = os.environ.get("CLOUD_ML_REGION", "global")
        ask(anthropic.AnthropicVertex(project_id=os.environ["ANTHROPIC_VERTEX_PROJECT_ID"], region=region),
            "claude-sonnet-5", "vertex")
        ran += 1

    if ran == 0:
        print("No back-end has credentials in this environment. Set one of:\n"
              "  ANTHROPIC_API_KEY                                  -> Anthropic API\n"
              "  AWS_PROFILE / AWS_ACCESS_KEY_ID / AWS_BEARER_TOKEN_BEDROCK (+AWS_REGION) -> Bedrock\n"
              "  ANTHROPIC_VERTEX_PROJECT_ID (+CLOUD_ML_REGION, gcloud auth application-default login) -> Vertex")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
