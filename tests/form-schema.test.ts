import { describe, expect, it } from "vitest";
import { defaultFormDefinition, parseFormDefinition, validateCustomFields } from "../src/lib/form-schema";
import { HubRepository } from "../src/lib/server/repository";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("formulários configuráveis", () => {
  it("valida o modelo padrão e recusa IDs duplicados e propriedades executáveis", () => {
    expect(parseFormDefinition(defaultFormDefinition).sections).toHaveLength(5);
    const copy = structuredClone(defaultFormDefinition);
    copy.sections[0].fields.push(copy.sections[0].fields[0]);
    expect(() => parseFormDefinition(copy)).toThrow(/duplicado/);
    expect(() => parseFormDefinition({ ...defaultFormDefinition, script: "alert(1)" })).toThrow();
  });
  it("valida campos obrigatórios, opções e IDs inseguros", () => {
    const schema = structuredClone(defaultFormDefinition);
    schema.sections[0].fields.push({ id: "custom_zone", label: "Zona", type: "select", required: true, options: ["Urbana", "Rural"] });
    expect(() => validateCustomFields(schema, {})).toThrow(/Zona/);
    expect(() => validateCustomFields(schema, { custom_zone: "Outra" })).toThrow(/Zona/);
    expect(validateCustomFields(schema, { custom_zone: "Urbana" })).toEqual({ custom_zone: "Urbana" });
    schema.sections[0].fields[4].id = "__proto__";
    expect(() => parseFormDefinition(schema)).toThrow();
  });
  it("recusa campos essenciais removidos, valores desconhecidos e respostas de tipo incorreto", () => {
    const schema = structuredClone(defaultFormDefinition);
    schema.sections[0].fields.push({ id: "custom_confirm", label: "Confirmação", type: "checkbox", required: true });
    expect(() => validateCustomFields(schema, { custom_confirm: "true" })).toThrow(/Confirmação/);
    expect(() => validateCustomFields(schema, { custom_confirm: true, unknown: "x" })).toThrow(/desconhecido/);
    schema.sections[0].fields.shift();
    expect(() => parseFormDefinition(schema)).toThrow(/Preserve/);
  });
  it("recupera configuração e valores depois de reabrir o arquivo SQLite", () => {
    const filename = join(mkdtempSync(join(tmpdir(), "nolyp-schema-")), "hub.sqlite");
    const repo = new HubRepository(filename);
    const model = repo.snapshot().processes[0];
    const schema = structuredClone(defaultFormDefinition);
    schema.sections[0].fields.push({ id: "custom_reference", label: "Referência", type: "text" });
    repo.saveFormDefinition(model.id, { definition: schema, expectedRevision: 1 });
    repo.saveProcess(model.id, { ...model.information, customFields: { custom_reference: "Praça" } });
    repo.close();
    const restored = new HubRepository(filename);
    try {
      expect(restored.snapshot().processes[0]).toMatchObject({ formRevision: 2, information: { customFields: { custom_reference: "Praça" } } });
      expect(restored.snapshot().processes[0].formDefinition).toEqual(schema);
    } finally { restored.close(); }
  });
  it("persiste configuração e respostas, congela protocolo e impede publicação concorrente", () => {
    const repo = new HubRepository(":memory:");
    try {
      const model = repo.snapshot().processes[0];
      const schema = structuredClone(defaultFormDefinition);
      schema.sections[0].fields.push({ id: "custom_reference", label: "Referência adicional", type: "text", required: true });
      repo.saveFormDefinition(model.id, { definition: schema, expectedRevision: 1 });
      expect(() => repo.saveProcess(model.id, model.information)).toThrow(/Referência/);
      const info = { ...model.information, customFields: { custom_reference: "Praça central" } };
      repo.saveProcess(model.id, info);
      const filed = repo.submitProcess(model.id, info);
      expect(filed.information.customFields?.custom_reference).toBe("Praça central");
      expect(() => repo.saveFormDefinition(model.id, { definition: schema, expectedRevision: 1 })).toThrow(/atualizada/);
      repo.saveFormDefinition(model.id, { definition: defaultFormDefinition, expectedRevision: 2 });
      repo.saveProcess(model.id, { ...info, customFields: {} });
      const snapshot = repo.snapshot();
      expect(snapshot.processes.find(p => p.id === model.id)?.information.customFields?.custom_reference).toBe("Praça central");
      expect(snapshot.processes.find(p => p.id === filed.id)?.formDefinition?.sections[0].fields).toHaveLength(5);
      expect(snapshot.processes[1].formDefinition).toBeUndefined();
      expect(() => repo.saveFormDefinition(filed.id, { definition: schema, expectedRevision: 2 })).toThrow(/protocolado/);
    } finally { repo.close(); }
  });
});
