"""API 10 — code execution and the Files API.

  1. Files API: upload once, reference by file_id in any number of requests (no re-upload).
  2. Code execution: a server-side sandbox where Claude runs Python/bash; results come back as
     bash_code_execution_tool_result blocks; files it creates can be downloaded via the Files API.

We upload this repo's sample results.json, ask Claude to analyse it in the sandbox and produce
a CSV, then download that CSV.

    python sessions/08-agent-sdk/api/10_code_execution_files.py
"""

import sys
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
OUT = ROOT / ".scratch" / "code-exec"
OUT.mkdir(parents=True, exist_ok=True)

# ── 1. Files API ──────────────────────────────────────────────────────────────────────────
uploaded = client.beta.files.upload(file=ROOT / "sessions/05-mcp/data/results.json")
print(f"uploaded {uploaded.filename} -> {uploaded.id} ({uploaded.size_bytes} bytes)")

# ── 2. code execution with the file mounted in the container ──────────────────────────────
r = client.beta.messages.create(
    model=MODEL,
    max_tokens=8000,
    betas=["code-execution-2025-08-25", "files-api-2025-04-14"],
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "This is a Playwright JSON report. Using Python, count specs by status "
                    "(passed / flaky = passed on retry / failed), print the counts, and write "
                    "failures.csv with columns file,line,title,status. Then tell me the counts.",
                },
                {"type": "container_upload", "file_id": uploaded.id},
            ],
        }
    ],
)
for b in r.content:
    if b.type == "server_tool_use":
        print(f"  ran code ({len(str(b.input))} chars)")
    elif b.type == "bash_code_execution_tool_result":
        res = b.content
        if res.type == "bash_code_execution_result":
            print(f"  stdout: {res.stdout.strip()[:200]!r}  rc={res.return_code}")
            for f in res.content or []:  # files created in the sandbox
                if f.type == "bash_code_execution_output":
                    meta = client.beta.files.retrieve_metadata(f.file_id)
                    client.beta.files.download(f.file_id).write_to_file(OUT / Path(meta.filename).name)
                    print(f"  downloaded {meta.filename} -> {OUT / Path(meta.filename).name}")
        else:
            print(f"  tool error: {res.error_code}")
    elif b.type == "text":
        print("  answer:", b.text.strip()[:300])
print(f"  container id (reusable across requests): {r.container.id if r.container else None}")

# ── 3. clean up storage ───────────────────────────────────────────────────────────────────
client.beta.files.delete(uploaded.id)
print(
    "deleted the upload; files persist until deleted (100 GB/org), uploads are free, tokens are billed when read"
)
