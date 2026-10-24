"""Prepara exportação de playbook local; nunca executa arquivos do ZIP."""
import argparse
import hashlib
import json
import re
import zipfile
from collections import Counter
from pathlib import Path, PurePosixPath
from urllib.parse import unquote
import posixpath

parser = argparse.ArgumentParser()
parser.add_argument("archive", type=Path)
parser.add_argument("--output", type=Path, default=Path("data/playbook"))
parser.add_argument("--inspect", action="store_true")
args = parser.parse_args()
redactions = Counter()
redacted_pages = []

def sanitize(text):
    patterns = [
        ("private-key", r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"),
        ("token", r"\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b"),
        ("credential", r"(?im)(\b(?:api[_ -]?key|access[_ -]?token|authorization|senha|password|secret|service_role|token)\b\s*(?:[:=]|Bearer)\s*)[^\s<>]{8,}"),
        ("url-secret", r"(?i)([?&](?:token|api[_-]?key|secret|password)=)[^\s&#)]+"),
        ("bearer", r"(?i)\bBearer\s+[A-Za-z0-9._-]{16,}"),
        ("database-url", r"(?i)(?:postgres(?:ql)?|mysql|mongodb|redis)://[^\s<>)]+"),
        ("quoted-credential", r'''(?im)(["']?(?:api[_ -]?key|access[_ -]?token|secretAccessKey|aws_secret_access_key|client_secret|password|senha|token)["']?\s*[:=]\s*["']?)(?!\[CREDENCIAL)[A-Za-z0-9_/.+=-]{8,}'''),
    ]
    for name, pattern in patterns:
        def redact(match):
            redactions[name] += 1
            return (match.group(1) if match.lastindex else "") + "[CREDENCIAL OCULTADA]"
        text = re.sub(pattern, redact, text)
    return text

with zipfile.ZipFile(args.archive) as archive:
    entries = archive.infolist()
    if sum(entry.file_size for entry in entries) > 500_000_000:
        raise ValueError("Exportação acima do limite local de 500 MB descompactados.")
    for entry in entries:
        path = PurePosixPath(entry.filename.replace("\\", "/"))
        if path.is_absolute() or ".." in path.parts or ":" in entry.filename:
            raise ValueError("Exportação contém caminho não permitido.")
    markdown = [entry for entry in entries if entry.filename.lower().endswith(".md")]
    images = {entry.filename: entry for entry in entries if PurePosixPath(entry.filename).suffix.lower() in {".png", ".jpg", ".jpeg"} and entry.file_size <= 10_000_000}
    ids = {entry.filename: "PB-" + hashlib.sha256(entry.filename.encode()).hexdigest()[:16].upper() for entry in markdown}
    assets = {}
    articles = []
    statuses = Counter()
    for entry in markdown:
        if entry.file_size > 1_000_000:
            raise ValueError("Página Markdown acima de 1 MB.")
        original = archive.read(entry).decode("utf-8-sig", errors="replace")
        title_match = re.search(r"(?m)^#\s+(.+)$", original)
        title = title_match.group(1).strip() if title_match else re.sub(r" [a-f0-9]{32}$", "", PurePosixPath(entry.filename).stem)
        category_match = re.search(r"(?im)^Categoria:\s*(.*)$", original)
        status_match = re.search(r"(?im)^Status:\s*(.*)$", original)
        status = status_match.group(1).strip() if status_match else "Não informado"
        statuses[status] += 1
        previous_redactions = sum(redactions.values())
        body = sanitize(original)
        if sum(redactions.values()) > previous_redactions:
            redacted_pages.append({"sourcePath": entry.filename, "id": ids[entry.filename], "redactions": sum(redactions.values()) - previous_redactions})
        parent = PurePosixPath(entry.filename).parent
        def rewrite(match):
            alt, target = match.group(1), match.group(2)
            decoded = unquote(target.strip().strip("<>"))
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", decoded) or decoded.startswith("//"):
                return f"[Referência: {alt}]" if match.group(0).startswith("!") else match.group(0)
            relative = posixpath.normpath(str(parent / decoded).replace("\\", "/"))
            if relative in images:
                asset = images[relative]
                data = archive.read(asset)
                suffix = PurePosixPath(relative).suffix.lower()
                if not ((suffix == ".png" and data.startswith(b"\x89PNG\r\n\x1a\n")) or (suffix in {".jpg", ".jpeg"} and data.startswith(b"\xff\xd8\xff"))):
                    return f"[Imagem não importada: {alt}]"
                filename = hashlib.sha256(data).hexdigest() + suffix
                assets[filename] = data
                return f"![{alt}](/api/knowledge/assets/{filename})"
            if relative in ids:
                return f"[{alt}](/support/conhecimento#{ids[relative]})"
            if match.group(0).startswith("!"):
                return f"[Imagem de referência: {alt}]"
            return match.group(0)
        body = re.sub(r"!?\[([^\]]*)\]\(([^)]+)\)", rewrite, body)
        active = status.casefold() in {"válido", "valido", "validado", "aprovado", "não informado"} and len(body.strip()) >= 30
        articles.append({"id": ids[entry.filename], "title": title[:240], "category": (category_match.group(1).strip() if category_match else "Playbook")[:100], "content": body, "tags": ["playbook"], "active": active, "source": "Playbook importado", "sourcePath": entry.filename, "sourceStatus": status, "contentHash": hashlib.sha256(body.encode()).hexdigest()})
    report = {"markdownPages": len(articles), "active": sum(article["active"] for article in articles), "images": len(assets), "statuses": dict(statuses), "credentialRedactions": dict(redactions), "maxArticleCharacters": max((len(article["content"]) for article in articles), default=0), "ignoredBinaryEntries": len(entries) - len(markdown) - len(images)}
    if not args.inspect:
        output = args.output.resolve()
        expected = Path("data").resolve()
        if not output.is_relative_to(expected):
            raise ValueError("A saída deve permanecer dentro de data/.")
        output.mkdir(parents=True, exist_ok=True)
        asset_dir = output / "assets"
        asset_dir.mkdir(exist_ok=True)
        for filename, data in assets.items():
            (asset_dir / filename).write_bytes(data)
        (output / "articles.json").write_text(json.dumps(articles, ensure_ascii=False), encoding="utf-8")
        (output / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        (output / "redactions.json").write_text(json.dumps(redacted_pages, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))
