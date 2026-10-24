import { describe, expect, it } from "vitest";
import { readJson, respond } from "../src/lib/server/http";

describe("limites das APIs locais", () => {
  it("bloqueia origem cruzada e hosts externos sem executar mutação", async () => {
    let changed = false;
    const result = await respond(new Request("http://localhost:3000/api/tickets", { method: "POST", headers: { origin: "https://externo.example" } }), () => { changed = true; });
    expect(result.status).toBe(403);
    expect(changed).toBe(false);
    expect((await respond(new Request("https://externo.example/api/hub"), () => ({}))).status).toBe(403);
  });
  it("rejeita corpos inválidos e maiores que o limite", async () => {
    await expect(readJson(new Request("http://localhost/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).rejects.toThrow("JSON inválido");
    await expect(readJson(new Request("http://localhost/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "x".repeat(66000) }) }))).rejects.toThrow("64 KB");
  });
});
