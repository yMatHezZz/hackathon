"""Indexa somente as URLs públicas explicitamente listadas no CSV Pylon."""
import csv
import hashlib
import ipaddress
import json
import re
import socket
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

HOST = "aprova.help.usepylon.com"
def safe_url(value):
    parsed = urlsplit(value)
    return parsed.scheme == "https" and parsed.hostname == HOST and not parsed.username and not parsed.password and parsed.port in (None, 443) and parsed.path.startswith("/articles/")

class SameHostRedirect(HTTPRedirectHandler):
    max_redirections = 3
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not safe_url(newurl):
            raise ValueError("Redirecionamento fora da base autorizada.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class ArticleParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.body_depth = None
        self.parts = []
        self.skip = 0
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "div":
            self.depth += 1
            if self.body_depth is None and "kb-article-body" in attrs.get("class", "").split():
                self.body_depth = self.depth
        if self.body_depth is None:
            return
        if tag in ("script", "style", "iframe", "noscript"):
            self.skip += 1
        if self.skip:
            return
        if tag in ("p", "div", "ul", "ol", "blockquote", "table", "tr"):
            self.parts.append("\n\n")
        elif tag == "li":
            self.parts.append("\n- ")
        elif tag == "br":
            self.parts.append("\n")
        elif tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.parts.append("\n\n**")
        elif tag in ("strong", "b"):
            self.parts.append("**")
        elif tag == "a":
            link = urljoin("https://" + HOST, attrs.get("href", ""))
            self.links.append(link if safe_url(link) else None)
            if self.links[-1]:
                self.parts.append("[")
    def handle_endtag(self, tag):
        if self.body_depth is not None:
            if tag in ("script", "style", "iframe", "noscript"):
                self.skip = max(0, self.skip - 1)
            elif not self.skip:
                if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                    self.parts.append("**\n\n")
                elif tag in ("strong", "b"):
                    self.parts.append("**")
                elif tag in ("p", "li", "div", "ul", "ol", "tr"):
                    self.parts.append("\n\n")
                elif tag == "a" and self.links:
                    link = self.links.pop()
                    if link:
                        self.parts.append("](" + link + ")")
            if tag == "div" and self.depth == self.body_depth:
                self.body_depth = None
        if tag == "div":
            self.depth -= 1
    def handle_data(self, data):
        if self.body_depth is not None and not self.skip:
            self.parts.append(data)
    def markdown(self):
        text = "".join(self.parts).replace("\xa0", " ")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n[ \t]+", "\n", text)
        return re.sub(r"\n{3,}", "\n\n", text).strip()

def prepare(row):
    identifier = row.get("ID do Artigo", "").strip()
    if not re.fullmatch(r"[a-fA-F0-9-]{36}", identifier):
        raise ValueError("Identificador de artigo inválido no CSV.")
    url = row.get("URL Pública", "").strip()
    title = row.get("Artigo", "").strip()
    if len(title) < 2:
        title = "Rascunho sem título · Pylon"
    status = row.get("Status de publicação", "").strip()
    visible = row.get("Visibilidade", "").strip() == "Público"
    allowed = row.get("Acesso do Agente de Suporte", "").strip() in ("Herdar", "Permitir", "Sim", "Permitido")
    article = {"id": "PYLON-" + identifier.upper(), "title": title, "category": row.get("Coleção", "").strip() or "Pylon", "tags": [tag.strip()[:40] for tag in re.split(r"[,;]", row.get("Tags", "")) if tag.strip()][:12], "active": False, "source": "Pylon · Base pública", "sourcePath": identifier, "sourceStatus": status, "sourceUrl": url or None, "content": "Artigo sem conteúdo público indexado.", "fetchState": "not_public"}
    if url and not safe_url(url):
        raise ValueError("URL fora do domínio público autorizado.")
    if not url or not visible or not allowed or status not in ("Publicado", "Tem alterações"):
        return article
    try:
        opener = build_opener(SameHostRedirect())
        with opener.open(Request(url, headers={"User-Agent": "Nolyp-Knowledge-Importer/1.0"}), timeout=20) as response:
            if not safe_url(response.url) or "text/html" not in response.headers.get("Content-Type", ""):
                raise ValueError("Página sem HTML público.")
            body = response.read(2097153)
            if len(body) > 2097152:
                raise ValueError("Página acima de 2 MB.")
        parser = ArticleParser()
        parser.feed(body.decode("utf-8", errors="replace"))
        text = parser.markdown()
        if len(text) < 30 or len(text) > 95000:
            raise ValueError("Conteúdo público não identificado ou acima do limite.")
        article.update({"content": "## Orientação ao cliente\n\n" + text + "\n\nFonte original: " + url, "active": True, "fetchState": "ok", "sourceFetchedAt": datetime.now(timezone.utc).isoformat()})
    except Exception as error:
        article.update({"fetchState": "failed", "fetchError": type(error).__name__, "content": "Não foi possível obter o conteúdo público deste artigo. Consulte a fonte original ou execute a importação novamente."})
    return article

def main():
    source = Path(sys.argv[1]).resolve()
    destination = Path(sys.argv[2] if len(sys.argv) > 2 else "data/pylon").resolve()
    for answer in socket.getaddrinfo(HOST, 443):
        if not ipaddress.ip_address(answer[4][0]).is_global:
            raise ValueError("Destino de rede não público.")
    with source.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not {"ID do Artigo", "URL Pública", "Artigo"}.issubset(reader.fieldnames or []):
            raise ValueError("Colunas obrigatórias ausentes.")
        rows = list(reader)
    if len(rows) > 1000:
        raise ValueError("Limite de 1.000 artigos por importação.")
    with ThreadPoolExecutor(max_workers=4) as pool:
        articles = list(pool.map(prepare, rows))
    if len({article["id"] for article in articles}) != len(articles):
        raise ValueError("IDs duplicados no CSV.")
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "articles.json").write_text(json.dumps(articles, ensure_ascii=False, indent=2), encoding="utf-8")
    report = {"total": len(articles), "indexed": sum(article["active"] for article in articles), "failed": [{"id": article["id"], "url": article["sourceUrl"], "error": article.get("fetchError")} for article in articles if article["fetchState"] == "failed"], "inactive": sum(not article["active"] for article in articles)}
    (destination / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: len(value) if key == "failed" else value for key, value in report.items()}))

if __name__ == "__main__":
    main()
