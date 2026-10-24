import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { importPylon } from "../scripts/import-pylon.mjs";
import { pylonArticleUrl } from "../src/lib/knowledge-links";
import { runAprovaAgent } from "../src/lib/server/aprova-agent";
import { HubRepository } from "../src/lib/server/repository";

const url = "https://aprova.help.usepylon.com/articles/123-conta";
const article = { id: "PYLON-00000000-0000-0000-0000-000000000001", title: "Exclusão de conta", category: "Acesso", tags: [], sourceUrl: url, source: "Pylon", sourceStatus: "Publicado", active: true, fetchState: "ok", content: "## Orientação ao cliente\nPara solicitar a exclusão definitiva da conta, entre em contato com a Prefeitura responsável." };
describe("base Pylon", () => {
  it("valida o domínio público e impede links inseguros", () => {
    expect(pylonArticleUrl(url)).toBe(url);
    for (const value of ["javascript:alert(1)", "http://aprova.help.usepylon.com/articles/a", "https://aprova.help.usepylon.com.evil.example/articles/a", "https://user:pass@aprova.help.usepylon.com/articles/a", "https://127.0.0.1/articles/a"]) expect(pylonArticleUrl(value)).toBeNull();
  });
  it("importa sem duplicar e preserva edições manuais", () => {
    const filename = join(mkdtempSync(join(tmpdir(), "nolyp-pylon-")), "hub.sqlite");
    expect(importPylon(filename, [article]).inserted).toBe(1);
    expect(importPylon(filename, [article]).unchanged).toBe(1);
    const db = new DatabaseSync(filename);
    const saved = JSON.parse(String(db.prepare("SELECT payload FROM knowledge WHERE id=?").get(article.id)!.payload));
    db.prepare("UPDATE knowledge SET payload=? WHERE id=?").run(JSON.stringify({ ...saved, content: "Orientação revisada manualmente.", updatedAt: "2099-01-01" }), article.id); db.close();
    expect(importPylon(filename, [{ ...article, content: "Novo texto público atualizado." }]).preservedManualEdits).toBe(1);
    const repo = new HubRepository(filename);
    expect(repo.snapshot().knowledge[0].content).toBe("Orientação revisada manualmente."); repo.close();
    expect(() => importPylon(filename, [{ ...article, sourceUrl: "http://localhost/segredo" }])).toThrow(/URL/);
  });
  it("o agente consulta conteúdo público e responde com link da fonte", async () => {
    const result = await runAprovaAgent({ query: "Como solicitar exclusão da minha conta no sistema?", text: "Como solicitar exclusão da minha conta no sistema?", author: "Requerente", training: [], articles: [{ ...article, createdAt: "2026-10-24", updatedAt: "2026-10-24" }] });
    expect(result.kind).toBe("solution");
    expect(result.reply).toContain("Prefeitura responsável");
    expect(result.reply).toContain(url);
    expect(result.sources[0].url).toBe(url);
  });
});
