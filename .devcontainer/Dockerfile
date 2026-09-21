# Dev container for ryvan-e2e with Claude Code.
#
# Not built in our environment (no Docker on the presenter laptop) - written against
# https://code.claude.com/docs/en/devcontainer and the reference container in anthropics/claude-code.
#
# What this gives the team:
#   - identical toolchain (Node 22, Playwright deps, git, gh) on every machine
#   - Claude Code runs INSIDE the container: every command it executes is confined here
#   - org policy baked in at the highest precedence via /etc/claude-code/managed-settings.json
#   - egress firewall (ryvan-firewall.sh) so a --dangerously-skip-permissions session can only
#     reach the hosts Claude Code and this project actually need

FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Firewall tooling + Playwright's browser dependencies. Node and Claude Code come from
# devcontainer features (see devcontainer.json), which also installs the VS Code extension.
RUN apt-get update && apt-get install -y --no-install-recommends \
      iptables ipset dnsutils jq \
      libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2t64 \
    && rm -rf /var/lib/apt/lists/*

# Managed settings: highest precedence, cannot be overridden from ~/.claude or the repo's .claude/.
# NOTE: anyone with write access to this repo can edit this file - for policy engineers must not
# be able to bypass, deliver it server-managed from the claude.ai console or via MDM instead.
RUN mkdir -p /etc/claude-code
COPY managed-settings.json /etc/claude-code/managed-settings.json

COPY ryvan-firewall.sh /usr/local/bin/ryvan-firewall.sh
RUN chmod +x /usr/local/bin/ryvan-firewall.sh \
    && echo "vscode ALL=(root) NOPASSWD: /usr/local/bin/ryvan-firewall.sh" > /etc/sudoers.d/vscode-firewall \
    && chmod 0440 /etc/sudoers.d/vscode-firewall

# `claude --dangerously-skip-permissions` refuses to run as root; the feature-installed CLI runs
# as remoteUser=vscode (devcontainer.json).
