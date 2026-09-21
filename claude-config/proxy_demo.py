"""Corporate proxy + TLS inspection, simulated on one laptop with mitmproxy.

    python claude-config/proxy_demo.py            # full demo: fail without CA, succeed with it
    python claude-config/proxy_demo.py --hosts    # phase 2 only, list every host Claude Code touched

What a TLS-inspecting corporate proxy does: it terminates your HTTPS, re-signs it with the
company's own CA, and forwards. Any client that doesn't trust that CA fails the handshake.
mitmproxy is exactly that, in Python, with its own CA - so we can reproduce the failure and
the fix without a corporate network:

  phase 1  HTTPS_PROXY=http://127.0.0.1:8080                       -> claude fails (untrusted CA)
  phase 2  + NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem -> claude works, every request logged

Notes from https://code.claude.com/docs/en/network-config :
  - Claude Code honours HTTPS_PROXY / HTTP_PROXY / NO_PROXY (no SOCKS). Lowercase works too.
  - It trusts the bundled Mozilla CAs + the OS trust store (Node >= 22.15 / native installer).
    So a corporate CA installed in Windows' store usually just works; NODE_EXTRA_CA_CERTS is for
    when it isn't, or on older Node. CLAUDE_CODE_CERT_STORE=bundled|system narrows the sources.
  - Verify inside Claude Code with /status (Proxy, Additional CA cert rows) or `claude --debug`.
  - For background agents put these in settings.json `env`, not a shell export.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PORT = 8080
PROXY = f"http://127.0.0.1:{PORT}"
CA = Path.home() / ".mitmproxy" / "mitmproxy-ca-cert.pem"
VENV_BIN = ROOT / ".venv" / ("Scripts" if sys.platform == "win32" else "bin")
MITMDUMP = VENV_BIN / ("mitmdump.exe" if sys.platform == "win32" else "mitmdump")
WIN = sys.platform == "win32"


def start_proxy(log: Path) -> subprocess.Popen:
    if not MITMDUMP.exists():
        sys.exit(f"mitmdump not found at {MITMDUMP} - run: .venv/Scripts/python -m pip install mitmproxy")
    fh = log.open("w", encoding="utf-8")
    p = subprocess.Popen(
        [str(MITMDUMP), "-p", str(PORT), "-q", "-s", str(HERE / "proxy_addon.py")],
        stdout=fh, stderr=subprocess.STDOUT, text=True,
    )
    for _ in range(60):  # first start generates the CA; wait for it
        if CA.exists() and p.poll() is None:
            time.sleep(1.5)  # let the listener come up
            return p
        time.sleep(0.5)
    p.kill()
    sys.exit(f"proxy did not start; see {log}")


def run_claude(extra_env: dict[str, str], timeout: int) -> tuple[int | None, str]:
    env = {**os.environ, **extra_env}
    env.pop("CLAUDECODE", None)  # we're often launched from inside Claude Code; don't confuse the child
    cmd = ["claude", "-p", "Reply with exactly: proxied ok", "--output-format", "json", "--model", "claude-sonnet-5"]
    try:
        r = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=timeout, shell=WIN)
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired as e:
        out = ((e.stdout or b"") if isinstance(e.stdout, bytes) else (e.stdout or ""))
        return None, f"(timed out after {timeout}s - retrying a TLS failure is what Claude Code does)"


def tail(log: Path, marker: int) -> str:
    return log.read_text(encoding="utf-8", errors="replace")[marker:]


def main() -> int:
    # mitmproxy's log and Claude's output contain non-cp1252 characters; don't let a print crash us.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    hosts_only = "--hosts" in sys.argv
    log = HERE / "proxy_demo.log"
    print(f"Starting mitmproxy on {PROXY}  (log: {log})")
    proxy = start_proxy(log)
    print(f"CA certificate: {CA}\n")
    try:
        if not hosts_only:
            print("=" * 78)
            print("PHASE 1  HTTPS_PROXY set, CA NOT trusted   -> expect a certificate failure")
            print("=" * 78)
            mark = log.stat().st_size
            code, out = run_claude({"HTTPS_PROXY": PROXY, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"}, timeout=45)
            print(f"claude exit: {code}")
            print("claude said: " + (out[-400:] if out else "(nothing)"))
            time.sleep(1)
            print("proxy saw:\n" + (tail(log, mark) or "  (nothing logged)"))
            print()

        print("=" * 78)
        print("PHASE 2  HTTPS_PROXY set + NODE_EXTRA_CA_CERTS -> expect success, every request visible")
        print("=" * 78)
        mark = log.stat().st_size
        code, out = run_claude({"HTTPS_PROXY": PROXY, "NODE_EXTRA_CA_CERTS": str(CA)}, timeout=120)
        print(f"claude exit: {code}")
        if code == 0:
            import json
            try:
                d = json.loads(out)
                print(f"claude said: {d.get('result','').strip()!r}   cost ${d.get('total_cost_usd')}")
            except json.JSONDecodeError:
                print("claude said: " + out[-300:])
        else:
            print("claude said: " + out[-400:])
        time.sleep(1)
        print("proxy saw:\n" + (tail(log, mark) or "  (nothing logged)"))
        print("\nEvery host above is one you would allowlist on a corporate firewall for Claude Code.")
        print("Set DISABLE_TELEMETRY=1 / CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 and re-run --hosts to see the Datadog lines vanish.")
    finally:
        proxy.terminate()
        try:
            proxy.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proxy.kill()
    return 0


if __name__ == "__main__":
    sys.exit(main())
