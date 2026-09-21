#!/usr/bin/env bash
# Default-deny egress for the dev container. Only the hosts Claude Code and this project need.
#
# Runs at container start (postStartCommand, via sudo). Needs NET_ADMIN + NET_RAW (runArgs).
# Modeled on anthropics/claude-code/.devcontainer/init-firewall.sh. Named ryvan-firewall.sh because the
# Claude Code devcontainer FEATURE installs its own /usr/local/bin/init-firewall.sh (whose allowlist
# includes a dead statsig.anthropic.com entry) and would overwrite a file of that name; the allowlist below is what
# we observed on the wire with claude-config/proxy_demo.py plus the docs' network-config table.
#
# Not executed in our environment (no Docker). Verify inside a container with:
#   curl -sS https://api.anthropic.com/v1/models -o /dev/null -w "%{http_code}\n"   # 401 = reachable
#   curl -sS https://example.com -m 5 || echo "blocked as intended"
set -euo pipefail

ALLOWED_DOMAINS=(
  # --- Claude Code (https://code.claude.com/docs/en/network-config#network-access-requirements) ---
  api.anthropic.com            # model calls, feature flags, event logging, MCP registry
  claude.ai                    # claude.ai sign-in
  claude.com                   # sign-in redirect + doc lookups
  platform.claude.com          # Console auth + OAuth token exchange
  mcp-proxy.anthropic.com      # claude.ai connectors (set ENABLE_CLAUDEAI_MCP_SERVERS=false to drop)
  downloads.claude.ai          # native installer / updater / plugin binaries
  code.claude.com              # docs lookups
  # telemetry hosts intentionally omitted: CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 in containerEnv
  # --- this project ---
  registry.npmjs.org           # npm ci, npx MCP servers
  github.com                   # git, gh
  api.github.com
  objects.githubusercontent.com
  playwright.azureedge.net     # Playwright browser downloads
  cdn.playwright.dev
)

# Reset, keep loopback and established flows, allow DNS so we can resolve the allowlist.
iptables -F OUTPUT
iptables -P OUTPUT DROP
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Docker's host gateway (so forwarded ports / host services on the bridge keep working).
GATEWAY=$(ip route | awk '/default/ {print $3; exit}')
[ -n "${GATEWAY:-}" ] && iptables -A OUTPUT -d "$GATEWAY" -j ACCEPT

ipset destroy allowed 2>/dev/null || true
ipset create allowed hash:net

for domain in "${ALLOWED_DOMAINS[@]}"; do
  # resolve now; CDNs rotate IPs, so re-run this script (container restart) if a host stops working
  for ip in $(dig +short A "$domain" | grep -E '^[0-9.]+$'); do
    ipset add allowed "$ip" -exist
  done
done

iptables -A OUTPUT -m set --match-set allowed dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-port-unreachable

echo "firewall: default-deny egress, ${#ALLOWED_DOMAINS[@]} domains allowed, $(ipset list allowed | grep -c '^[0-9]') IPs"
