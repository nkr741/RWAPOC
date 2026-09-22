"""Show the Claude Code settings hierarchy for this machine + project, and the effective result.

    python claude-config/show_settings.py            # from the repo root
    python claude-config/show_settings.py --json     # machine-readable merged view

Reads every file in Claude Code's precedence order, prints what each one contains, then
prints the MERGED effective settings with the winning source next to every key.

Precedence (highest first) — https://code.claude.com/docs/en/settings :
  1. managed-settings.json   (org policy; nothing below can override it)
  2. claude --settings <file> (this session only; not shown here)
  3. .claude/settings.local.json   (you, this project — gitignored)
  4. .claude/settings.json         (everyone, this project — committed)
  5. ~/.claude/settings.json       (you, every project)

Merge rules used here mirror Claude Code's:
  - scalar keys (model, ...): highest-precedence file wins
  - permissions.allow / deny: UNION of every file (a rule is a rule wherever it came from)
  - env: per-key, highest-precedence file wins
  - hooks: per-event, lists are concatenated
Two env vars override the settings value regardless of file: ANTHROPIC_MODEL beats `model`,
and `--model` on the CLI beats both.
"""

from __future__ import annotations

import json
import os
import platform
import sys
from pathlib import Path

HOME = Path.home()
PROJECT = Path.cwd()

if platform.system() == "Windows":
    MANAGED = (
        Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "ClaudeCode" / "managed-settings.json"
    )
elif platform.system() == "Darwin":
    MANAGED = Path("/Library/Application Support/ClaudeCode/managed-settings.json")
else:
    MANAGED = Path("/etc/claude-code/managed-settings.json")

CONFIG_DIR = Path(os.environ.get("CLAUDE_CONFIG_DIR", HOME / ".claude"))

# Highest precedence first.
LEVELS = [
    ("managed", "Managed (org policy)", MANAGED),
    ("local", "Project local (you)", PROJECT / ".claude" / "settings.local.json"),
    ("project", "Project shared (team)", PROJECT / ".claude" / "settings.json"),
    ("user", "User (global)", CONFIG_DIR / "settings.json"),
]

SECRET_HINT = ("KEY", "TOKEN", "SECRET", "PASSWORD")


def load(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"  !! {path} is not valid JSON ({e}) — Claude Code would skip it", file=sys.stderr)
        return None


def mask(key: str, value):
    if isinstance(value, str) and any(h in key.upper() for h in SECRET_HINT) and len(value) > 8:
        return value[:6] + "..." + value[-3:]
    return value


def merge(files: list[tuple[str, dict]]) -> tuple[dict, dict]:
    """files: (level_id, settings) in precedence order, highest first.
    Returns (effective_settings, source_of_each_key)."""
    eff: dict = {}
    src: dict = {}
    # Walk lowest precedence -> highest so later (higher) writes win.
    for level, s in reversed(files):
        for key, value in s.items():
            if key.startswith("$"):
                continue  # $comment etc.
            if key == "permissions":
                p = eff.setdefault("permissions", {})
                for kind in ("allow", "deny", "ask"):
                    for rule in value.get(kind, []):
                        p.setdefault(kind, [])
                        if rule not in p[kind]:
                            p[kind].append(rule)
                            src[f"permissions.{kind}[{rule}]"] = level
                for k2, v2 in value.items():
                    if k2 not in ("allow", "deny", "ask"):
                        p[k2] = v2
                        src[f"permissions.{k2}"] = level
            elif key == "env":
                e = eff.setdefault("env", {})
                for k2, v2 in value.items():
                    if k2.startswith("$"):
                        continue
                    e[k2] = v2
                    src[f"env.{k2}"] = level
            elif key == "hooks":
                h = eff.setdefault("hooks", {})
                for event, entries in value.items():
                    h.setdefault(event, []).extend(entries)
                    src[f"hooks.{event}"] = src.get(f"hooks.{event}", "") + f"+{level}"
            else:
                eff[key] = value
                src[key] = level
    return eff, src


def main() -> int:
    as_json = "--json" in sys.argv
    present: list[tuple[str, dict]] = []

    if not as_json:
        print(f"Project: {PROJECT}")
        print(
            f"Config dir: {CONFIG_DIR}  (CLAUDE_CONFIG_DIR {'set' if 'CLAUDE_CONFIG_DIR' in os.environ else 'not set'})\n"
        )
        print("Settings files, highest precedence first")
        print("=" * 72)

    for level, label, path in LEVELS:
        data = load(path)
        if data is not None:
            present.append((level, data))
        if as_json:
            continue
        status = "FOUND" if data is not None else "absent"
        print(f"[{level:8}] {label:24} {status:7} {path}")
        if data is not None:
            keys = [k for k in data if not k.startswith("$")]
            for k in keys:
                v = data[k]
                if k == "permissions":
                    n_allow = len(v.get("allow", []))
                    n_deny = len(v.get("deny", []))
                    print(f"           permissions: {n_allow} allow, {n_deny} deny")
                elif isinstance(v, dict):
                    shown = {kk: mask(kk, vv) for kk, vv in v.items() if not kk.startswith("$")}
                    print(f"           {k}: {json.dumps(shown)}")
                else:
                    print(f"           {k}: {json.dumps(v)}")
        print()

    eff, src = merge(present)

    # CLI / env overrides that beat every file for `model`.
    override_note = None
    if os.environ.get("ANTHROPIC_MODEL"):
        override_note = (
            f"ANTHROPIC_MODEL={os.environ['ANTHROPIC_MODEL']} (env var overrides `model` from any file)"
        )

    if as_json:
        print(json.dumps({"effective": eff, "source": src, "model_override": override_note}, indent=2))
        return 0

    print("Effective settings (what Claude Code actually uses)")
    print("=" * 72)
    for key, value in eff.items():
        if key == "permissions":
            cap = 8  # per (kind, source); the local file accumulates hundreds of one-off approvals
            for kind in ("allow", "deny", "ask"):
                shown: dict[str, int] = {}
                for rule in value.get(kind, []):
                    origin = src[f"permissions.{kind}[{rule}]"]
                    shown[origin] = shown.get(origin, 0) + 1
                    if shown[origin] <= cap:
                        print(f"  permissions.{kind:5} {rule[:60]:60} <- {origin}")
                for origin, n in shown.items():
                    if n > cap:
                        print(f"  permissions.{kind:5} {'... +' + str(n - cap) + ' more':60} <- {origin}")
        elif key == "env":
            for k2, v2 in value.items():
                print(f"  env.{k2:26} = {mask(k2, v2)!s:28} <- {src[f'env.{k2}']}")
        elif key == "hooks":
            for event, entries in value.items():
                print(
                    f"  hooks.{event:22} {len(entries)} entr{'y' if len(entries) == 1 else 'ies'}{'':22} <- {src[f'hooks.{event}'].lstrip('+')}"
                )
        else:
            print(f"  {key:30} = {json.dumps(value):28} <- {src[key]}")
    if override_note:
        print(f"\n  ! {override_note}")

    print("\nVerify inside Claude Code: /status  (the 'Setting sources' line lists the files it loaded)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
