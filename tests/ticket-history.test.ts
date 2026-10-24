import { describe, expect, it } from "vitest";
import { citizenHistory } from "../src/lib/requester-history";
import { demoHistory } from "../src/lib/demo-data";
import { HubRepository } from "../src/lib/server/repository";
import { defaultFormDefinition } from "../src/lib/form-schema";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("histórico e escalonamento", () => {
  it("requerente vê apenas sua origem, email e conta; sem perfil não lista dados", () => {
    const base = { ...demoHistory[0], origin: "requerente" as const };
    expect(citizenHistory([base, { ...base, id: "other", email: "outra@example.com" }, { ...base, id: "municipal", origin: "prefeitura" }], { email: base.email.toUpperCase(), account: base.account })).toEqual([base]);
    expect(citizenHistory([base], null)).toEqual([]);
  });
  it("reabre tentativas e anexa cópia imutável ao ticket municipal", () => {
    const filename = join(mkdtempSync(join(tmpdir(), "nolyp-ai-history-")), "hub.sqlite");
    const first = new HubRepository(filename);
    const result = first.adjustForm("001", { definition: defaultFormDefinition, prompt: 'Adicionar campo "Referência"', sectionId: "property" });
    first.setFormAttemptOutcome("001", result.attempt.id, "applied");
    first.close();
    const repo = new HubRepository(filename);
    try {
      expect(repo.formAssistantHistory("001")[0].outcome).toBe("applied");
      const form = { name: "Camila Analista", email: "camila@example.com", account: "Prefeitura Modelo", origin: "prefeitura", channel: "Formulário", subject: "Não consegui ajustar o formulário", description: "Tentei incluir um campo, mas preciso de apoio técnico.", processId: "001", attemptedAi: true, aiAttemptNotes: "Não obtive o resultado esperado.", aiAttemptIds: [result.attempt.id] };
      expect(() => repo.createTicket({ ...form, processId: "002", aiAttemptIds: [] })).toThrow(/primeiro um pedido/);
      const ticket = repo.createTicket(form);
      expect(ticket.aiContext?.attempts[0].prompt).toContain("Referência");
      repo.setFormAttemptOutcome("001", result.attempt.id, "undone");
      expect(repo.snapshot().tickets[0].aiContext?.attempts[0].outcome).toBe("applied");
      expect(() => repo.createTicket({ ...form, processId: "002" })).toThrow(/processo/);
      expect(() => repo.createTicket({ ...form, aiAttemptIds: ["inexistente"] })).toThrow();
      expect(() => repo.createTicket({ ...form, aiAttemptIds: Array(21).fill(result.attempt.id) })).toThrow();
      expect(() => repo.setFormAttemptOutcome("002", result.attempt.id, "applied")).toThrow();
    } finally { repo.close(); }
  });
});
