import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const source = resolve(process.argv[2] || "data/playbook/articles.json");
const filename = process.env.ZENITH_DB_PATH || "data/zenith.sqlite";
const articles = JSON.parse(readFileSync(source, "utf8"));
if (!Array.isArray(articles) || articles.length > 10000) throw new Error("Índice de artigos inválido.");
mkdirSync(dirname(resolve(filename)), { recursive: true });
const db = new DatabaseSync(filename);
db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
db.exec(readFileSync("migrations/001_local_hub.sql", "utf8"));
db.exec(readFileSync("migrations/002_process_protocols.sql", "utf8"));
let inserted = 0;
let updated = 0;
db.exec("BEGIN IMMEDIATE");
try {
  const insert = db.prepare("INSERT OR IGNORE INTO knowledge(id,payload) VALUES (?,?)");
  for (const article of articles) {
    if (!/^PB-[A-F0-9]{16}$/.test(article.id) || typeof article.content !== "string" || article.content.length > 100000 || typeof article.title !== "string") throw new Error("Artigo fora do formato esperado.");
    const now = new Date().toISOString();
    const created = Number(insert.run(article.id, JSON.stringify({ ...article, createdAt: now, updatedAt: now })).changes);
    inserted += created;
    if (!created) {
      const previous = JSON.parse(db.prepare("SELECT payload FROM knowledge WHERE id=?").get(article.id).payload);
      const unchangedByUser = previous.updatedAt === previous.createdAt && createHash("sha256").update(previous.content).digest("hex") === previous.contentHash;
      if (unchangedByUser && previous.contentHash !== article.contentHash) {
        db.prepare("UPDATE knowledge SET payload=? WHERE id=?").run(JSON.stringify({ ...previous, content: article.content, contentHash: article.contentHash }), article.id);
        updated++;
      }
    }
  }
  if (inserted || updated) db.prepare("UPDATE hub_meta SET revision=revision+1 WHERE id=1").run();
  db.exec("COMMIT");
  console.log(JSON.stringify({ imported: inserted, updated, alreadyPresent: articles.length - inserted, totalArticles: db.prepare("SELECT COUNT(*) AS total FROM knowledge").get().total }));
} catch (error) { db.exec("ROLLBACK"); throw error; }
finally { db.close(); }
