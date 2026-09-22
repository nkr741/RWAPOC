"""mitmproxy addon: one line per request Claude Code makes through the proxy.

Loaded by proxy_demo.py via `mitmdump -s claude-config/proxy_addon.py`. Also usable on its own:

    mitmdump -s claude-config/proxy_addon.py --set termlog_verbosity=warn
    HTTPS_PROXY=http://127.0.0.1:8080 NODE_EXTRA_CA_CERTS=~/.mitmproxy/mitmproxy-ca-cert.pem claude

What you see is the complete outbound surface of Claude Code - the hosts you'd allowlist
on a corporate firewall (https://code.claude.com/docs/en/network-config#network-access-requirements).
"""

from mitmproxy import http, tls


def response(flow: http.HTTPFlow) -> None:
    req, res = flow.request, flow.response
    size = len(res.raw_content or b"")
    print(
        f"[proxy] {req.method:4} {req.pretty_host:34} {req.path[:48]:48} -> {res.status_code} {size:>7}B",
        flush=True,
    )


def tls_failed_client(data: tls.TlsData) -> None:
    # Fires when the CLIENT (Claude Code / Node) rejects our certificate: the exact failure a
    # TLS-inspecting corporate proxy produces before its root CA is trusted.
    sni = data.context.client.sni or "?"
    print(f"[proxy] TLS handshake REJECTED by client for {sni} - client does not trust this CA", flush=True)
