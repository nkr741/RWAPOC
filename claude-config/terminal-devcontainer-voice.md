# Terminal configuration · Dev containers · Voice dictation

The three "small" pages from the Lesson 5 doc list. Verified against code.claude.com on
2026-09-21. Each section says what it is, what we built, what ran, and the one-liner to say.

---

## 1. Terminal configuration — RAN

**What it is.** Claude Code works in any terminal; this page is the fix-list for when a key or a
notification doesn't behave. Five things matter to a team; the rest is cosmetics.

| Symptom / want                                                | Fix                                                                                                                                                                        | Where it lives                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Shift+Enter submits instead of newline (VS Code, Cursor, Zed) | `/terminal-setup` once — writes a keybinding into the editor's config. Windows Terminal, iTerm2, Ghostty, Kitty, WezTerm already work. Always: `Ctrl+J`, or `\` then Enter | editor keybindings file        |
| No alert when Claude finishes / needs input                   | `"preferredNotifChannel": "terminal_bell"` (desktop notifications are only automatic in Ghostty/Kitty/iTerm2); or a `Notification` hook that plays a sound                 | `~/.claude/settings.json`      |
| Want model / cost / context always visible                    | **status line** — `"statusLine": {"type":"command","command":"…"}`; Claude Code pipes session JSON to your script after every response and shows what it prints            | `~/.claude/settings.json`      |
| Remap Claude Code's own keys (submit, newline, voice key)     | `~/.claude/keybindings.json` — `chat:submit`, `chat:newline`, `voice:pushToTalk`                                                                                           | see `keybindings.example.json` |
| Vim keys in the prompt                                        | `/config` → Editor mode, or `"editorMode": "vim"`                                                                                                                          | `~/.claude/settings.json`      |
| Backspace deletes a whole word (Windows, some terminals)      | `CLAUDE_CODE_BS_AS_CTRL_BACKSPACE=0`                                                                                                                                       | env                            |
| Flicker / scrollback jumps                                    | `/tui fullscreen`, or `CLAUDE_CODE_NO_FLICKER=1`                                                                                                                           | env                            |
| Theme                                                         | `/theme` (auto follows OS light/dark); custom themes in `~/.claude/themes/*.json`                                                                                          | —                              |

**What we built.** `claude-config/statusline.py` — Python so it's identical on Windows and Linux
(the docs' examples are bash + jq). Reads the JSON on stdin, prints one line:

```
Opus 5 | ctx [##--------] 24% | $1.23 | cache 91% warm | 5h 41% | git:main
```

Fields it uses: `model.display_name`, `context_window.used_percentage`, `cost.total_cost_usd`,
`prompt_cache.hit_ratio` / `.warm`, `rate_limits.five_hour.used_percentage` (Pro/Max only),
`workspace.current_dir` → `git branch --show-current`. Test without Claude:

```powershell
python claude-config\statusline.py < claude-config\statusline.sample.json
```

Wired into `~/.claude/settings.json` on the presenter machine along with `preferredNotifChannel`.
**Why it belongs in this session:** the status line is the cost topic made permanent — `$` and
context-% in the corner of your eye, the same numbers `/usage` shows on demand.

**Say:** "Terminal config is personal — it goes in the user file, never the project file. The
status line is the one piece worth copying: cost and context always visible."

---

## 2. Dev containers — BUILT AND RUN (Podman 6 on WSL)

**What it is.** A `.devcontainer/` folder that VS Code, Codespaces, or JetBrains turns into an
identical Linux container for every engineer. Claude Code runs _inside_ it, so every command it
executes is confined to the container, while file edits land in your local checkout.

**What we built** — `.devcontainer/`:

| File                    | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `devcontainer.json`     | Node 22 + the official `ghcr.io/anthropics/devcontainer-features/claude-code:1.0` feature (installs CLI + VS Code extension); `remoteUser: vscode`; a named volume at `/home/vscode/.claude` **plus `CLAUDE_CONFIG_DIR` pointing at it** so login survives rebuilds; `containerEnv` with `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `DISABLE_AUTOUPDATER=1`, the RWA URLs; `NET_ADMIN`/`NET_RAW` for the firewall; `postCreateCommand` = `npm ci` + Playwright Chromium; ports 3000/3001 forwarded |
| `Dockerfile`            | Ubuntu 24.04 base, iptables/ipset/dnsutils, Playwright browser libs, copies `managed-settings.json` to `/etc/claude-code/` (highest precedence inside the container), installs the firewall script with a sudoers rule for `node`                                                                                                                                                                                                                                                                 |
| `managed-settings.json` | The container's org policy: deny `.env`/`.pem`/`id_rsa`, `curl \| sh`, force-push; `permissions.disableBypassPermissionsMode: "disable"`; non-essential traffic off; Playwright the only allowed MCP server                                                                                                                                                                                                                                                                                       |
| `ryvan-firewall.sh`      | **Default-deny egress.** Resolves an allowlist into an ipset and drops everything else. The allowlist is the host list we captured on the wire in Part 3 (`api.anthropic.com`, `claude.ai`, `platform.claude.com`, `mcp-proxy.anthropic.com`, `downloads.claude.ai`, …) plus this project's needs (npm, GitHub, Playwright CDN). Telemetry hosts deliberately absent                                                                                                                              |


**What ran (2026-09-21, `podman 6.0.2`, `@devcontainers/cli 0.89`):**

```
npx @devcontainers/cli up --workspace-folder . --docker-path podman
  -> firewall: default-deny egress, 13 domains allowed, 22 IPs
  -> {"outcome":"success", "remoteUser":"vscode", "remoteWorkspaceFolder":"/workspaces/ryvan-e2e"}

inside the container:
  user=vscode  claude=2.1.278  CLAUDE_CONFIG_DIR=/home/vscode/.claude  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
  api.anthropic.com  -> HTTP 401   (reachable; no key on that curl)
  registry.npmjs.org -> HTTP 200
  example.com        -> BLOCKED    (curl exit 7 - REJECT rule)
  datadog telemetry  -> BLOCKED

  claude -p "read demo-projects/.env"      -> permission_denials: Read(.../demo-projects/.env)   $0.045, Sonnet
  claude -p "read claude-config/demo-cert.pem" -> permission_denials: Read(.../demo-cert.pem)    $0.036
      *.pem is denied ONLY by /etc/claude-code/managed-settings.json (project file: 0 mentions)
      => the managed tier is enforced inside the container. Result text: DENIED - "File is in a
         directory that is denied by your permission settings."
```

Three things that bit us, so you don't hit them:

1. **`devcontainers/base:ubuntu` has user `vscode`, not `node`.** (`node` is the `javascript-node`
   image.) `remoteUser`, the volume target, `CLAUDE_CONFIG_DIR` and the sudoers line all changed.
2. **The Claude Code feature installs its own `/usr/local/bin/init-firewall.sh`** (Anthropic's
   reference script) *after* your Dockerfile runs, overwriting a file of that name - and its
   allowlist includes `statsig.anthropic.com`, which no longer resolves, so it exits 1. Ours is
   `ryvan-firewall.sh` for that reason.
3. **Podman 6 on WSL: netavark 2.0's nftables ruleset is rejected by the Microsoft WSL kernel**
   (`nft did not return successfully while applying ruleset`), so *every* container fails to
   start, and the `iptables` backend no longer exists in podman 6. Workaround inside the machine
   (`podman machine ssh`):
   ```
   printf '[network]
firewall_driver = "none"
' | sudo tee /etc/containers/containers.conf.d/10-firewall.conf
   sudo sysctl -w net.ipv4.ip_forward=1
   sudo nft add table ip podman_nat
   sudo nft 'add chain ip podman_nat postrouting { type nat hook postrouting priority 100; }'
   sudo nft add rule ip podman_nat postrouting ip saddr 10.88.0.0/16 oifname != podman0 masquerade
   ```
   then `podman machine stop && podman machine start`. Netavark stops managing the firewall; the
   one masquerade rule gives containers outbound NAT. Docker Desktop users don't need any of this.

Also: `devcontainer exec` does not forward stdin, and Git Bash rewrites `/workspaces/...` paths -
run scripts by path from the bind-mounted workspace with `MSYS_NO_PATHCONV=1`.

This is the same three-file shape as Anthropic's reference container
(`anthropics/claude-code/.devcontainer`), adapted to this repo.

**Why it belongs in this session.** It's where three earlier topics land in one place:

- _Settings hierarchy_ — managed settings baked into the image, above everything.
- _Network_ — the allowlist from the proxy demo becomes an enforced firewall.
- _Env vars_ — `containerEnv` is the fourth "where variables go" row, for a whole team.

**The caveat from the docs, verbatim in spirit:** with `--dangerously-skip-permissions` a
malicious repo can exfiltrate anything inside the container, _including the Claude credentials
in `~/.claude`_. Only for trusted repos; never mount `~/.ssh` or cloud credential files; use the
firewall. And policy in a Dockerfile can be edited by anyone with write access — for policy
engineers can't bypass, use server-managed settings or MDM.

**How to run it** — Docker Desktop _or_ Podman. With Podman, use the devcontainer CLI and point it at podman (VS Code's Dev Containers extension also works: set `dev.containers.dockerPath` to `podman`):

```powershell
podman machine start
npx @devcontainers/cli up   --workspace-folder . --docker-path podman
npx @devcontainers/cli exec --workspace-folder . --docker-path podman claude --version
```

Then:

1. Open the repo in VS Code → _Dev Containers: Reopen in Container_ (first build ~5 min).
2. In the container terminal: `claude` → sign in (paste the code if the browser callback
   doesn't reach the container). Bedrock/Vertex users: pass cloud creds via `containerEnv` or
   a Codespaces secret, never by mounting files.
3. `/status` → `Setting sources: Enterprise managed settings (file)` — the baked policy applied.
4. Prove the firewall: `curl -m 5 https://example.com` → blocked; `curl https://api.anthropic.com/v1/models` → 401 (reachable).
5. Codespaces: store `ANTHROPIC_API_KEY` or a `claude setup-token` value as a Codespaces secret.

**Say:** "This ran, on Podman, on this laptop. The firewall blocked example.com and the
telemetry host; Claude inside the container was refused a .pem file by a rule that exists only
in the managed settings baked into the image. That is the enterprise policy topic, executed."

---

## 3. Voice dictation — EXPLAIN ONLY (nothing to build)

**What it is.** `/voice` in the CLI (and the VS Code extension). Hold `Space` to talk
(push-to-talk) or `/voice tap` to tap-start / tap-send. Transcript appears live in the prompt;
you can mix typing and speech. Tuned for code vocabulary; project name and branch are added as
recognition hints. Twenty languages via the `language` setting.

**The facts that matter to a policy conversation** — these are the reason it's on the list:

| Fact                                                                                         | Consequence                                                                                                    |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Audio is streamed to **Anthropic's servers** for transcription. Nothing is processed locally | Data-handling question for security; see the data-usage page                                                   |
| Requires a **claude.ai account** login                                                       | Not available on API-key auth, Bedrock, Vertex, or Foundry — so most enterprise setups don't have it           |
| Needs a **local microphone**                                                                 | Not in cloud sessions, SSH, Dev Containers, or Codespaces (the mic is on your laptop, Claude is on the remote) |
| Transcription doesn't consume tokens or count in `/usage`                                    | Free on the plan                                                                                               |
| An org can turn it off                                                                       | Users see `Voice mode is disabled by your organization's policy` — set from server-managed settings            |

**Settings:**

```json
{ "voice": { "enabled": true, "mode": "tap", "autoSubmit": false }, "language": "en" }
```

Rebind the key in `keybindings.json`: `"meta+k": "voice:pushToTalk"` (avoid bare letters in hold
mode — they type during the key-repeat warmup).

**Windows notes:** works natively; in WSL needs WSLg (WSL2 from the Store) and
`sudo apt install sox libsox-fmt-pulse`. Grant mic access under Settings → Privacy → Microphone.

**Say:** "Voice is a personal productivity feature with one enterprise-relevant property: the
audio leaves the machine and it only works on a claude.ai login. If your org is on Bedrock or
API keys, the question answers itself — it's off. If you're on Team, the admin decides."

---

## Coverage after this file

| Doc page               | Status                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Terminal Configuration | ✅ status line built + wired + tested; `/terminal-setup`, bell, keybindings documented |
| Dev Container Support  | ⚠️ built and validated (JSON, bash syntax, LF), not run — no Docker                    |
| Voice Dictation        | ✅ explained; nothing to build                                                         |
