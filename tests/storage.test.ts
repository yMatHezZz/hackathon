import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HubRepository } from "../src/lib/server/repository";

const form = { name: "Camila Analista", email: "camila@example.com", account: "Prefeitura Modelo", origin: "prefeitura" as const, channel: "Formulário" as const, subject: "Alvará bloqueado", description: "Alvará 001 bloqueado ao enviar documentos.", processId: "001", priority: "Alta" as const };

describe("persistência SQLite", () => {
  it("protocola um modelo como processo separado e mantém o catálogo", () => {
    const repo = new HubRepository(":memory:");
    const model = repo.snapshot().processes[0];
    const submitted = repo.submitProcess(model.id, model.information);
    expect(submitted.protocol).toMatch(/^NLP-\d{4}-\d{6}$/);
    expect(submitted.templateId).toBe(model.id);
    expect(repo.snapshot().processes.filter(process => !process.protocol)).toHaveLength(4);
    expect(repo.snapshot().processes.filter(process => process.protocol)).toHaveLength(1);
    expect(repo.submitProcess(submitted.id, submitted.information).id).toBe(submitted.id);
    repo.close();
  });
  it("sugere resposta fundamentada sem responder automaticamente", () => {
    const repo = new HubRepository(":memory:");
    const article = repo.saveArticle({ title: "Alvará bloqueado no envio", category: "Ajuda", content: "# Orientação ao cliente\n\nConfira o cadastro e solicite à prefeitura a revisão do acesso ao envio de documentos.", tags: ["alvará", "bloqueado"], active: true });
    const ticket = repo.createTicket(form);
    const draft = repo.suggestReply(ticket.id);
    expect(draft.sources[0].id).toBe(article.id);
    expect(draft.content).toContain("Confira o cadastro");
    expect(repo.snapshot().tickets[0].messages.filter(message => message.kind === "support")).toHaveLength(1);
    repo.close();
  });
  it("persiste o formulário de alvará com requerente, imóvel, documentos e taxas", () => {
    const repo = new HubRepository(":memory:");
    const current = repo.snapshot().processes[0];
    repo.saveProcess(current.id, { ...current.information, applicantEmail: "ana@example.com", requestType: "Renovação", propertyRegistration: "IMOVEL-DEMO-001", propertyArea: "120", documents: "Referência da planta sintética", feeAmount: "85.50", feeReference: "GUIA-DEMO" });
    expect(repo.snapshot().processes[0].information).toMatchObject({ applicantEmail: "ana@example.com", requestType: "Renovação", propertyRegistration: "IMOVEL-DEMO-001", documents: "Referência da planta sintética", feeAmount: "85.50" });
    repo.close();
  });
  it("reabre arquivo com ticket, dados, resposta e prioridade preservados", () => {
    const filename = join(mkdtempSync(join(tmpdir(), "zenith-test-")), "hub.sqlite");
    const first = new HubRepository(filename);
    const ticket = first.createTicket(form);
    first.reply(ticket.id, "Atendimento registrado.", "support");
    first.setPriority(ticket.id, "Urgente");
    first.close();
    const second = new HubRepository(filename);
    const restored = second.snapshot().tickets.find(item => item.id === ticket.id)!;
    expect(restored).toMatchObject({ email: "camila@example.com", priority: "Urgente", origin: "prefeitura", channel: "Formulário", processId: "001" });
    expect(restored.messages.some(message => message.content === "Atendimento registrado.")).toBe(true);
    second.close();
  });
  it("triagem usa artigo ativo e grava uma única nota sem alterar status", () => {
    const repo = new HubRepository(":memory:");
    const article = repo.saveArticle({ title: "Alvará bloqueado e documentos", category: "Processos", content: "Verificar o cadastro do estabelecimento antes da liberação. Orientação técnica fictícia.", tags: ["alvará", "bloqueado", "documentos"], active: true });
    const ticket = repo.createTicket(form);
    repo.settleTriage([], 0);
    repo.settleTriage([], 0);
    const current = repo.snapshot().tickets.find(item => item.id === ticket.id)!;
    expect(current.status).toBe("Aberto");
    expect(current.messages.filter(message => message.kind === "internal")).toHaveLength(1);
    expect(current.messages.find(message => message.kind === "internal")!.content).toContain(article.title);
    expect(current.messages.filter(message => message.kind === "support")).toHaveLength(1);
    repo.close();
  });
  it("comando persiste processo e log juntos e é idempotente", () => {
    const repo = new HubRepository(":memory:");
    const ticket = repo.createTicket(form);
    repo.command(ticket.id, "Desbloquear Alvará 001");
    repo.command(ticket.id, "Desbloquear Alvará 001");
    const snapshot = repo.snapshot();
    expect(snapshot.processes[0].status).toBe("Em Análise");
    expect(snapshot.tickets[0].messages.filter(message => message.content === "Ação executada: Alvará 001 desbloqueado pela IA")).toHaveLength(1);
    expect(snapshot.tickets[0].status).toBe("Aberto");
    repo.close();
  });
  it("rejeita payloads inválidos e não grava alterações parciais", () => {
    const repo = new HubRepository(":memory:");
    expect(() => repo.createTicket({ ...form, email: "inválido" })).toThrow();
    expect(() => repo.createTicket({ ...form, priority: "inventada" })).toThrow();
    expect(() => repo.createTicket({ ...form, processId: "999" })).toThrow();
    expect(() => repo.saveArticle({ title: "", content: "", category: "", tags: [], active: true })).toThrow();
    expect(repo.snapshot().tickets).toHaveLength(0);
    repo.close();
  });
  it("artigo inativo não orienta triagens novas", () => {
    const repo = new HubRepository(":memory:");
    const article = repo.saveArticle({ title: "Procedimento interno de alvará", category: "Processos", content: "Referência EXCLUSIVA-INATIVA para validar documentos de um alvará bloqueado.", tags: ["alvará"], active: true });
    repo.saveArticle({ ...article, active: false }, article.id);
    const ticket = repo.createTicket(form);
    repo.settleTriage([], 0);
    expect(repo.snapshot().tickets.find(item => item.id === ticket.id)!.messages.find(message => message.kind === "internal")!.content).not.toContain("EXCLUSIVA-INATIVA");
    repo.close();
  });
});
