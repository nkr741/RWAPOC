"""API 8 — PDF support and citations.

  * a PDF goes in as a `document` block (base64, or a Files API file_id); Claude reads text AND
    renders pages as images, so charts and tables count;
  * `citations: {enabled: true}` on a document makes the answer come back as several text
    blocks, each carrying the exact cited span (page_location for PDFs, char_location for text).

We build a small PDF from scratch with stdlib so the demo needs no external file.

    python sessions/08-agent-sdk/api/08_pdf_citations.py
"""

import base64
import sys
import zlib
from pathlib import Path

import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from _env import MODEL, ROOT  # noqa: E402

client = anthropic.Anthropic()
PAGES = [
    "RYVAN E2E TEST POLICY - PAGE 1\nSection 1. Every UI test must assert at least once.\nSection 2. waitForTimeout is forbidden.",
    "RYVAN E2E TEST POLICY - PAGE 2\nSection 3. Firefox runs against the CI build, not the Vite dev server.\nSection 4. Retries: 2 in CI, 0 locally.",
]


def make_pdf(pages: list[str]) -> bytes:
    """Minimal but valid multi-page PDF (Helvetica, one text object per page)."""
    objs = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        None,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    kids = []
    for text in pages:
        lines = text.split("\n")
        stream = (
            "BT /F1 12 Tf 50 750 Td 16 TL "
            + " ".join(f"({ln.replace('(', '[').replace(')', ']')}) Tj T*" for ln in lines)
            + " ET"
        )
        data = zlib.compress(stream.encode())
        objs.append(
            f"<< /Length {len(data)} /Filter /FlateDecode >>\nstream\n".encode() + data + b"\nendstream"
        )
        content_id = len(objs)
        objs.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {content_id} 0 R /Resources << /Font << /F1 3 0 R >> >> >>"
        )
        kids.append(f"{len(objs)} 0 R")
    objs[1] = f"<< /Type /Pages /Kids [{' '.join(kids)}] /Count {len(kids)} >>"
    out, offsets = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + (o if isinstance(o, bytes) else o.encode()) + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode() + b"".join(
        f"{o:010d} 00000 n \n".encode() for o in offsets
    )
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


pdf = make_pdf(PAGES)
(ROOT / ".scratch").mkdir(exist_ok=True)
(ROOT / ".scratch" / "policy.pdf").write_bytes(pdf)

r = client.messages.create(
    model=MODEL,
    max_tokens=2000,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": base64.standard_b64encode(pdf).decode(),
                    },
                    "title": "Ryvan E2E test policy",
                    "citations": {"enabled": True},
                },
                {
                    "type": "text",
                    "text": "Which browser needs the CI build, and how many retries run in CI? Cite the policy.",
                },
            ],
        }
    ],
)
for b in r.content:
    if b.type == "text":
        cites = [f"p.{c.start_page_number} «{c.cited_text.strip()[:50]}…»" for c in (b.citations or [])]
        print(f"{b.text.strip()}   {cites if cites else ''}")
assert any(b.citations for b in r.content if b.type == "text"), "expected at least one citation"
print(
    "\nPDF limits: 32 MB / 600 pages per request (100 on 200K-context models); text + rendered pages are both billed."
)
