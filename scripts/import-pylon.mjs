import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function importPylon(filename, articles) {
  if (!Array.isArray(articles) || articles.length > 1000) throw new Error("Índice Pylon inválido.");
  mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
  db.exec(readFileSync("migrations/001_local_hub.sql", "utf8"));
  const result = { inserted: 0, updated: 0, unchanged: 0, preservedManualEdits: 0, total: articles.length };
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const input of articles) {
      if (!/^PYLON-[A-F0-9-]{36}$/.test(input.id) || typeof input.title !== "string" || input.title.length > 240 || typeof input.content !== "string" || input.content.length > 100000 || typeof input.active !== "boolean" || !Array.isArray(input.tags)) throw new Error("Artigo Pylon inválido.");
      if (input.sourceUrl) { const url = new URL(input.sourceUrl); if (url.protocol !== "https:" || url.hostname !== "aprova.help.usepylon.com" || url.username || url.password || (url.port && url.port !== "443") || !url.pathname.startsWith("/articles/")) throw new Error("URL Pylon inválida."); }
      if (input.active && (input.fetchState !== "ok" || !input.sourceUrl)) throw new Error("Conteúdo ativo sem origem pública confirmada.");
      const contentHash = createHash("sha256").update(input.content).digest("hex");
      const sourceHash = createHash("sha256").update(JSON.stringify([input.title, input.category, input.tags, input.active, input.content, input.sourceUrl, input.sourceStatus])).digest("hex");
      const row = db.prepare("SELECT payload FROM knowledge WHERE id=?").get(input.id);
      const previous = row ? JSON.parse(row.payload) : undefined;
      if (previous?.sourceHash === sourceHash) { result.unchanged++; continue; }
      if (previous && (previous.updatedAt !== previous.importedAt || createHash("sha256").update(previous.content).digest("hex") !== previous.contentHash)) { result.preservedManualEdits++; continue; }
      const now = new Date().toISOString();
      const article = { ...input, createdAt: previous?.createdAt ?? now, updatedAt: now, importedAt: now, contentHash, sourceHash };
      if (previous && input.fetchState === "failed") { article.content = previous.content; article.contentHash = previous.contentHash; }
      db.prepare("INSERT INTO knowledge(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(article.id, JSON.stringify(article));
      if (previous) result.updated++; else result.inserted++;
    }
    if (result.inserted || result.updated) db.prepare("UPDATE hub_meta SET revision=revision+1 WHERE id=1").run();
    db.exec("COMMIT");
    return result;
  } catch (error) { db.exec("ROLLBACK"); throw error; } finally { db.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  console.log(JSON.stringify(importPylon(process.env.ZENITH_DB_PATH || "data/zenith.sqlite", JSON.parse(readFileSync(process.argv[2] || "data/pylon/articles.json", "utf8")))));
}
