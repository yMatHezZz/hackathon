import { describe, expect, it } from "vitest";
import { HubRepository } from "../src/lib/server/repository";
import { runAprovaAgent } from "../src/lib/server/aprova-agent";
import type { AgentDecision } from "../src/lib/agent-types";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const form = { name: "Ana Exemplo", email: "ana@example.com", account: "Prefeitura Modelo", origin: "requerente", channel: "Chat", description: "Onde encontro minha caixa e os processos protocolados do processo 001?", processId: "001" };
const solution: AgentDecision = { engine: "aprova-test", bucket: "DUVIDA", confidence: 0.9, kind: "solution", reply: "Abra Minha caixa para consultar suas solicitações.", triageNote: null, sources: [] };
describe("agente de respostas", () => {
  it("publica no chat uma única vez e exige aprovação para a prefeitura", () => {
    const repo = new HubRepository(":memory:");
    try {
      const article = repo.saveArticle({ title: "Consultar Minha caixa", category: "Ajuda", tags: ["caixa"], active: true, content: "## Orientação ao cliente\nAbra Minha caixa para consultar as solicitações protocoladas." });
      const decision = { ...solution, sources: [{ id: article.id, title: article.title }] };
      const citizen = repo.createTicket(form);
      const job = repo.claimAgentRun()!;
      expect(repo.claimAgentRun()).toBeNull();
      repo.completeAgentRun(job, decision);
      repo.completeAgentRun(job, decision);
      expect(repo.snapshot().tickets.find(ticket => ticket.id === citizen.id)!.messages.filter(message => message.content === solution.reply)).toHaveLength(1);
      const municipal = repo.createTicket({ ...form, origin: "prefeitura", channel: "Formulário", subject: "Consultar solicitações protocoladas" });
      repo.completeAgentRun(repo.claimAgentRun()!, decision);
      const draft = repo.snapshot().tickets.find(ticket => ticket.id === municipal.id)!;
      expect(draft.agentRuns?.[0].status).toBe("pending_approval");
      expect(draft.messages.some(message => message.content === solution.reply)).toBe(false);
      repo.approveAgentReply(municipal.id, draft.agentRuns![0].id, solution.reply);
      expect(repo.snapshot().tickets.find(ticket => ticket.id === municipal.id)!.messages.some(message => message.content === solution.reply)).toBe(true);
      expect(() => repo.approveAgentReply(municipal.id, draft.agentRuns![0].id, solution.reply)).toThrow();
    } finally { repo.close(); }
  });
  it("envia pergunta de complemento ao analista e invalida proposta com nova mensagem", () => {
    const repo = new HubRepository(":memory:");
    try {
      const ticket = repo.createTicket({ ...form, origin: "prefeitura", channel: "Formulário", subject: "Preciso de apoio técnico" });
      repo.completeAgentRun(repo.claimAgentRun()!, { ...solution, kind: "clarification", reply: "Qual mensagem de erro aparece?" });
      expect(repo.snapshot().tickets[0].messages.some(message => message.content === "Qual mensagem de erro aparece?")).toBe(true);
      repo.reply(ticket.id, "Aparece erro 500 ao salvar o processo.", "customer");
      const current = repo.claimAgentRun()!;
      repo.reply(ticket.id, "A equipe já está verificando os detalhes.", "support");
      repo.completeAgentRun(current, solution);
      expect(repo.snapshot().tickets[0].messages.some(message => message.content === solution.reply)).toBe(false);
      expect(repo.snapshot().tickets[0].status).toBe("Aberto");
    } finally { repo.close(); }
  });
  it("executa o Agent Python original e fundamenta em orientação pública da base", async () => {
    const result = await runAprovaAgent({ text: form.description, query: form.description, author: "Requerente", training: [], articles: [{ id: "KB-TEST", title: "Minha caixa e processos protocolados", category: "Ajuda", content: "## Orientação ao cliente\nAbra Minha caixa para consultar as solicitações protocoladas e seu número de protocolo.", tags: ["caixa"], active: true, createdAt: "2026-10-24", updatedAt: "2026-10-24" }] });
    expect(result.engine).toContain("aprova-agent-mvp");
    expect(result.kind).toBe("solution");
    expect(result.reply).toContain("Abra Minha caixa");
    expect(result.sources[0].id).toBe("KB-TEST");
  });
  it("preserva fila e treinamento ao reabrir e retira fontes desativadas", () => {
    const filename = join(mkdtempSync(join(tmpdir(), "nolyp-agent-")), "hub.sqlite");
    const first = new HubRepository(filename);
    const article = first.saveArticle({ title: "Minha caixa e protocolos", category: "Ajuda", tags: [], active: true, content: "## Orientação ao cliente\nAbra Minha caixa para consultar seus protocolos." });
    first.saveAgentTraining({ text: form.description, bucket: "DUVIDA", kind: "solution", reply: solution.reply, articleIds: [article.id], active: true });
    first.setAgentEnabled(false); const ticket = first.createTicket(form); expect(first.claimAgentRun()).toBeNull();
    first.setAgentEnabled(true); first.enqueueEligibleAgentTickets(); first.close();
    const second = new HubRepository(filename);
    try {
      expect(second.agentTraining()).toHaveLength(1);
      const job = second.claimAgentRun()!; expect(job.ticketId).toBe(ticket.id);
      second.failAgentRun(job, "Falha controlada do runtime.");
      expect(second.snapshot().tickets[0].agentRuns?.[0].status).toBe("failed");
      second.retryAgentRun(ticket.id, job.id);
      const retried = second.claimAgentRun()!;
      second.completeAgentRun(retried, { ...solution, sources: [{ id: article.id, title: article.title }] });
      expect(second.snapshot().tickets[0].messages.filter(message => message.content === solution.reply)).toHaveLength(1);
      second.saveArticle({ title: article.title, category: article.category, tags: [], active: false, content: article.content }, article.id);
      expect(second.agentInput(form.description).training).toHaveLength(0);
      const example = second.agentTraining()[0];
      expect(second.saveAgentTraining({ ...example, active: false }, example.id).active).toBe(false);
      expect(() => second.saveAgentTraining({ text: form.description, bucket: "DUVIDA", kind: "solution", reply: solution.reply, articleIds: [], active: true })).toThrow(/artigo ativo/);
    } finally { second.close(); }
  });
  it("não copia procedimento interno da base para uma resposta pública", async () => {
    const result = await runAprovaAgent({ text: form.description, query: form.description, author: "Requerente", training: [], articles: [{ id: "KB-PRIVATE", title: "Minha caixa e processos protocolados", category: "Operação interna", content: "## Procedimento interno\nORIENTACAO-INTERNA-DEMO: consultar a tabela administrativa e revisar os logs internos.", tags: ["caixa"], active: true, createdAt: "2026-10-24", updatedAt: "2026-10-24" }] });
    expect(result.kind).toBe("handoff");
    expect(result.reply).not.toContain("ORIENTACAO-INTERNA-DEMO");
  });
  it("bloqueia aprovação obsoleta, resolução e pausa antes do envio", () => {
    const repo = new HubRepository(":memory:");
    try {
      const ticket = repo.createTicket({ ...form, origin: "prefeitura", channel: "Formulário", subject: "Consultar processos protocolados" });
      const job = repo.claimAgentRun()!;
      repo.completeAgentRun(job, { ...solution, kind: "handoff" });
      repo.reply(ticket.id, "Tenho outro protocolo e mais dados para informar.", "customer");
      expect(() => repo.approveAgentReply(ticket.id, job.id, solution.reply)).toThrow();
      const latest = repo.claimAgentRun()!; repo.setAgentEnabled(false);
      repo.completeAgentRun(latest, { ...solution, kind: "clarification" });
      expect(repo.snapshot().tickets[0].agentRuns?.[0].status).toBe("queued");
      repo.setStatus(ticket.id, "Resolvido"); repo.setAgentEnabled(true);
      expect(repo.claimAgentRun()).toBeNull();
      expect(repo.snapshot().tickets[0].messages.some(message => message.content === solution.reply)).toBe(false);
    } finally { repo.close(); }
  });
});
