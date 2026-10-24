import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ArticleInput, FormAiAttempt, HubSnapshot, KnowledgeArticle, Message, Process, Ticket, TicketAiContext } from "../types";
import { buildReplyDraft } from "../knowledge";
import { initialProcesses } from "../demo-data";
import { executeCommand, updateProcessInformation } from "../domain";
import { investigateTicket } from "../ai-triage";
import { AppError, articleInput, priority, processInformation, status, text, ticketForm } from "./validation";
import { defaultFormDefinition, parseFormDefinition, validateConfiguredInformation, validateCustomFields } from "../form-schema";
import { object } from "./validation";
import { adjustForm } from "../form-assistant";
import type { AgentDecision, AgentRun, AgentSettings, AgentTrainingExample, AgentTrainingInput } from "../agent-types";
import { findKnowledgeArticles } from "../knowledge";
import { normalize } from "../domain";

export class HubRepository {
  private db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    this.db.exec(readFileSync(join(process.cwd(), "migrations/001_local_hub.sql"), "utf8"));
    this.db.exec(readFileSync(join(process.cwd(), "migrations/002_process_protocols.sql"), "utf8"));
    this.db.exec(readFileSync(join(process.cwd(), "migrations/003_form_ai_attempts.sql"), "utf8"));
    this.db.exec(readFileSync(join(process.cwd(), "migrations/004_response_agent.sql"), "utf8"));
    for (const process of initialProcesses) this.db.prepare("INSERT OR IGNORE INTO processes(id,payload) VALUES (?,?)").run(process.id, JSON.stringify(process));
  }
  close() { this.db.close(); }
  getRevision() { return Number(this.db.prepare("SELECT revision FROM hub_meta WHERE id=1").get()!.revision); }
  private transaction<T>(action: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = action(); this.db.prepare("UPDATE hub_meta SET revision=revision+1 WHERE id=1").run(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  private append(id: string, kind: Message["kind"], content: string, messageId: string = randomUUID()) {
    this.db.prepare("INSERT OR IGNORE INTO messages(id,ticket_id,kind,content,created_at) VALUES (?,?,?,?,?)").run(messageId, id, kind, content, new Date().toISOString());
  }
  private readTicket(id: string): Ticket {
    const row = this.db.prepare("SELECT payload FROM tickets WHERE id=?").get(id);
    if (!row) throw new AppError("Chamado não encontrado.", 404);
    const ticket = JSON.parse(String(row.payload)) as Ticket;
    ticket.messages = this.db.prepare("SELECT id,kind,content,created_at AS createdAt FROM messages WHERE ticket_id=? ORDER BY sequence").all(id) as unknown as Message[];
    ticket.agentRuns = this.db.prepare("SELECT payload FROM agent_runs WHERE ticket_id=? ORDER BY rowid DESC").all(id).map(row => JSON.parse(String(row.payload)) as AgentRun);
    return ticket;
  }
  private writeTicket(ticket: Ticket) {
    const payload = { ...ticket, messages: [], agentRuns: undefined, updatedAt: new Date().toISOString() };
    this.db.prepare("UPDATE tickets SET payload=?,priority=?,updated_at=? WHERE id=?").run(JSON.stringify(payload), payload.priority ?? "Média", payload.updatedAt, ticket.id);
  }
  snapshot(): HubSnapshot {
    this.db.exec("BEGIN");
    try {
      const result = {
        tickets: this.db.prepare("SELECT id FROM tickets ORDER BY created_at DESC,id").all().map(row => this.readTicket(String(row.id))),
        processes: this.db.prepare("SELECT payload FROM processes ORDER BY id").all().map(row => JSON.parse(String(row.payload)) as Process),
        knowledge: this.db.prepare("SELECT payload FROM knowledge ORDER BY id").all().map(row => JSON.parse(String(row.payload)) as KnowledgeArticle).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        revision: Number(this.db.prepare("SELECT revision FROM hub_meta WHERE id=1").get()!.revision),
      };
      this.db.exec("COMMIT"); return result;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  createTicket(value: unknown): Ticket {
    const form = ticketForm(value);
    return this.transaction(() => {
      if (form.processId && !this.db.prepare("SELECT id FROM processes WHERE id=?").get(form.processId)) throw new AppError("Processo relacionado não encontrado.");
      let aiContext: TicketAiContext | undefined;
      if (form.attemptedAi) {
        if (!this.db.prepare("SELECT id FROM form_ai_attempts WHERE process_id=? LIMIT 1").get(form.processId!)) throw new AppError("Envie primeiro um pedido ao copiloto deste processo antes de solicitar suporte de edição com IA.");
        const process = JSON.parse(String(this.db.prepare("SELECT payload FROM processes WHERE id=?").get(form.processId!)!.payload)) as Process;
        const attempts = (form.aiAttemptIds ?? []).map(id => {
          const row = this.db.prepare("SELECT payload FROM form_ai_attempts WHERE id=? AND process_id=?").get(id, process.id);
          if (!row) throw new AppError("Tentativa com IA não encontrada para este processo.");
          return JSON.parse(String(row.payload)) as FormAiAttempt;
        });
        aiContext = { processId: process.id, formRevision: process.formRevision ?? 1, notes: form.aiAttemptNotes ?? "", attempts };
      }
      const now = new Date().toISOString();
      const ticket: Ticket = { ...form, aiContext, id: `NLP-${randomUUID().slice(0, 8).toUpperCase()}`, subject: form.subject ?? form.description.slice(0, 90), priority: form.priority ?? "Média", status: "Aberto", createdAt: now, updatedAt: now, source: form.channel, messages: [], triage: "pending" };
      this.db.prepare("INSERT INTO tickets(id,origin,priority,created_at,updated_at,payload) VALUES (?,?,?,?,?,?)").run(ticket.id, ticket.origin, ticket.priority!, now, now, JSON.stringify(ticket));
      this.append(ticket.id, "customer", form.description);
      this.append(ticket.id, "support", "O chamado foi aberto e a equipe técnica já está analisando. Esta é uma confirmação automática de demonstração.");
      this.enqueueAgent(this.readTicket(ticket.id));
      return this.readTicket(ticket.id);
    });
  }
  reply(id: string, content: unknown, kind: unknown) {
    const body = text(content, 4000, "Mensagem");
    if (kind !== "customer" && kind !== "support") throw new AppError("Autor da mensagem inválido.");
    this.transaction(() => { const ticket = this.readTicket(id); this.invalidateAgentRuns(id); this.append(id, kind, body); this.writeTicket(ticket); if (kind === "customer") this.enqueueAgent(this.readTicket(id)); });
  }
  setPriority(id: string, value: unknown) {
    const next = priority(value);
    this.transaction(() => { const ticket = this.readTicket(id); if (ticket.priority === next) return; this.append(id, "log", `Atendente alterou a prioridade para ${next}.`); this.writeTicket({ ...ticket, priority: next }); });
  }
  setStatus(id: string, value: unknown) {
    const next = status(value);
    this.transaction(() => { const ticket = this.readTicket(id); if (ticket.status === next) return; if (next === "Resolvido") this.invalidateAgentRuns(id); this.append(id, "log", `Atendente alterou o status para ${next}.`); this.writeTicket({ ...ticket, status: next }); });
  }
  command(id: string, value: unknown): string {
    const command = text(value, 200, "Comando");
    return this.transaction(() => {
      const ticket = this.readTicket(id);
      if (ticket.status === "Resolvido") throw new AppError("Reabra o chamado antes de executar uma ação.");
      const processes = this.db.prepare("SELECT payload FROM processes ORDER BY id").all().map(row => JSON.parse(String(row.payload)) as Process);
      const result = executeCommand(command, processes);
      if (result.changed) {
        for (const process of result.processes) this.db.prepare("UPDATE processes SET payload=? WHERE id=?").run(JSON.stringify(process), process.id);
        this.append(id, "log", result.message); this.writeTicket(ticket);
      }
      return result.message;
    });
  }
  saveProcess(id: string, value: unknown) {
    const information = processInformation(value);
    this.transaction(() => {
      const row = this.db.prepare("SELECT payload FROM processes WHERE id=?").get(id);
      if (!row) throw new AppError("Processo não encontrado.", 404);
      let process: Process;
      try {
        const previous = JSON.parse(String(row.payload)) as Process;
        const schema = previous.formDefinition ?? defaultFormDefinition;
        information.customFields = validateCustomFields(schema, information.customFields, previous.information.customFields);
        validateConfiguredInformation(schema, information);
        [process] = updateProcessInformation([previous], id, information);
      }
      catch (error) { throw new AppError(error instanceof Error ? error.message : "Informações do processo inválidas."); }
      this.db.prepare("UPDATE processes SET payload=? WHERE id=?").run(JSON.stringify(process), id);
    });
  }
  submitProcess(id: string, value: unknown): Process {
    const information = processInformation(value);
    return this.transaction(() => {
      const row = this.db.prepare("SELECT payload FROM processes WHERE id=?").get(id);
      if (!row) throw new AppError("Modelo de processo não encontrado.", 404);
      const template = JSON.parse(String(row.payload)) as Process;
      if (template.protocol) return template;
      let prepared: Process;
      try {
        const schema = template.formDefinition ?? defaultFormDefinition;
        information.customFields = validateCustomFields(schema, information.customFields, template.information.customFields);
        validateConfiguredInformation(schema, information);
        [prepared] = updateProcessInformation([template], id, information);
        prepared.formDefinition = schema;
        prepared.formRevision = template.formRevision ?? 1;
      }
      catch (error) { throw new AppError(error instanceof Error ? error.message : "Revise os dados do formulário."); }
      const processId = `PRC-${randomUUID().slice(0, 12).toUpperCase()}`;
      const now = new Date().toISOString();
      const sequence = this.db.prepare("INSERT INTO process_protocols(process_id,created_at) VALUES (?,?)").run(processId, now).lastInsertRowid;
      const submitted = { ...prepared, id: processId, templateId: template.id, protocol: `NLP-${new Date().getFullYear()}-${String(sequence).padStart(6, "0")}`, submittedAt: now, updatedAt: now };
      this.db.prepare("INSERT INTO processes(id,payload) VALUES (?,?)").run(processId, JSON.stringify(submitted));
      return submitted;
    });
  }
  adjustForm(id: string, value: unknown) {
    const input = object(value);
    const row = this.db.prepare("SELECT payload FROM processes WHERE id=?").get(id);
    if (!row) throw new AppError("Modelo não encontrado.", 404);
    const process = JSON.parse(String(row.payload)) as Process;
    if (process.protocol) throw new AppError("Processos protocolados preservam o formulário original.");
    const prompt = text(input.prompt, 1500, "Pedido");
    const sectionId = input.sectionId === undefined ? undefined : text(input.sectionId, 60, "Seção");
    const articles = this.db.prepare("SELECT payload FROM knowledge WHERE json_extract(payload,'$.active')=1").all().map(row => JSON.parse(String(row.payload)) as KnowledgeArticle);
    let definition;
    try { definition = parseFormDefinition(input.definition); } catch (error) { throw new AppError(error instanceof Error ? error.message : "Configuração inválida."); }
    let result;
    try { result = adjustForm({ definition, prompt, sectionId, context: process.name }, articles); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível preparar o ajuste.";
      this.recordFormAttempt({ id: `FA-${randomUUID()}`, processId: id, prompt, message, changes: [], sources: [], createdAt: new Date().toISOString(), outcome: "failed" });
      throw new AppError(message);
    }
    const attempt = this.recordFormAttempt({ id: `FA-${randomUUID()}`, processId: id, prompt, message: result.message, changes: result.changes, sources: result.sources, createdAt: new Date().toISOString(), outcome: result.changed ? "prepared" : "no_change" });
    return { ...result, attempt };
  }
  private recordFormAttempt(attempt: FormAiAttempt) {
    return this.transaction(() => {
      this.db.prepare("INSERT INTO form_ai_attempts(id,process_id,payload) VALUES (?,?,?)").run(attempt.id, attempt.processId, JSON.stringify(attempt));
      return attempt;
    });
  }
  formAssistantHistory(id: string): FormAiAttempt[] {
    if (!this.db.prepare("SELECT id FROM processes WHERE id=?").get(id)) throw new AppError("Processo não encontrado.", 404);
    return this.db.prepare("SELECT payload FROM form_ai_attempts WHERE process_id=? ORDER BY sequence DESC LIMIT 50").all(id).map(row => JSON.parse(String(row.payload)) as FormAiAttempt).reverse();
  }
  setFormAttemptOutcome(processId: string, id: string, outcome: unknown) {
    if (outcome !== "applied" && outcome !== "not_applied" && outcome !== "undone") throw new AppError("Resultado de tentativa inválido.");
    return this.transaction(() => {
      const row = this.db.prepare("SELECT payload FROM form_ai_attempts WHERE id=? AND process_id=?").get(id, processId);
      if (!row) throw new AppError("Tentativa não encontrada para este processo.", 404);
      const attempt = JSON.parse(String(row.payload)) as FormAiAttempt;
      const allowed = attempt.outcome === outcome || (attempt.outcome === "prepared" && outcome !== "undone") || (attempt.outcome === "applied" && outcome === "undone");
      if (!allowed) throw new AppError("Transição de resultado da tentativa inválida.", 409);
      const updated = { ...attempt, outcome };
      this.db.prepare("UPDATE form_ai_attempts SET payload=? WHERE id=?").run(JSON.stringify(updated), id);
      return updated;
    });
  }
  saveFormDefinition(id: string, value: unknown) {
    const input = object(value);
    let definition;
    try { definition = parseFormDefinition(input.definition); }
    catch (error) { throw new AppError(error instanceof Error ? error.message : "Configuração inválida."); }
    this.transaction(() => {
      const row = this.db.prepare("SELECT payload FROM processes WHERE id=?").get(id);
      if (!row) throw new AppError("Modelo não encontrado.", 404);
      const process = JSON.parse(String(row.payload)) as Process;
      if (process.protocol) throw new AppError("Não é possível configurar um processo protocolado.");
      const revision = process.formRevision ?? 1;
      if (input.expectedRevision !== revision) throw new AppError("Configuração atualizada por outra sessão. Recarregue o modelo antes de publicar.", 409);
      const previous = process.formDefinition ?? defaultFormDefinition;
      for (const field of previous.sections.flatMap(section => section.fields)) {
        const next = definition.sections.flatMap(section => section.fields).find(item => item.id === field.id);
        if (next && next.type !== field.type) throw new AppError("Para alterar o tipo de um campo existente, crie um novo ID.");
      }
      this.db.prepare("UPDATE processes SET payload=? WHERE id=?").run(JSON.stringify({ ...process, formDefinition: definition, formRevision: revision + 1, updatedAt: new Date().toISOString() }), id);
    });
  }
  agentSettings(): AgentSettings { return { enabled: this.db.prepare("SELECT enabled FROM agent_settings WHERE id=1").get()!.enabled === 1 }; }
  setAgentEnabled(enabled: unknown) {
    if (typeof enabled !== "boolean") throw new AppError("Configuração de automação inválida.");
    this.transaction(() => this.db.prepare("UPDATE agent_settings SET enabled=? WHERE id=1").run(enabled ? 1 : 0));
  }
  agentTraining(): AgentTrainingExample[] { return this.db.prepare("SELECT payload FROM agent_training ORDER BY rowid DESC").all().map(row => JSON.parse(String(row.payload)) as AgentTrainingExample); }
  saveAgentTraining(value: unknown, id?: string): AgentTrainingExample {
    const input = object(value);
    if (!["BUG", "CONSTRUIR_ALTERAR", "DUVIDA"].includes(String(input.bucket)) || !["solution", "clarification", "handoff"].includes(String(input.kind)) || typeof input.active !== "boolean" || !Array.isArray(input.articleIds) || input.articleIds.length > 5) throw new AppError("Revise classificação, tipo, fontes e disponibilidade do exemplo.");
    const articleIds = [...new Set(input.articleIds.map(id => text(id, 100, "Fonte")))];
    if (input.kind === "solution" && !articleIds.length) throw new AppError("Vincule pelo menos um artigo ativo à solução de treinamento.");
    for (const articleId of articleIds) {
      const row = this.db.prepare("SELECT payload FROM knowledge WHERE id=?").get(articleId);
      if (!row || (input.active && !JSON.parse(String(row.payload)).active)) throw new AppError("Selecione somente artigos ativos da base.");
    }
    const training: AgentTrainingInput = { text: text(input.text, 2000, "Mensagem de exemplo", 10), reply: text(input.reply, 3500, "Resposta revisada", 10), bucket: input.bucket as AgentTrainingInput["bucket"], kind: input.kind as AgentTrainingInput["kind"], active: input.active, articleIds };
    if (training.kind === "clarification" && !training.reply.includes("?")) throw new AppError("Uma complementação deve conter uma pergunta ao solicitante.");
    return this.transaction(() => {
      const previous = id ? this.db.prepare("SELECT payload FROM agent_training WHERE id=?").get(id) : undefined;
      if (id && !previous) throw new AppError("Exemplo não encontrado.", 404);
      if (!id && Number(this.db.prepare("SELECT COUNT(*) AS count FROM agent_training").get()!.count) >= 100) throw new AppError("Limite de 100 exemplos. Revise um exemplo existente.");
      const now = new Date().toISOString();
      const saved = { ...training, id: id ?? `TRAIN-${randomUUID()}`, createdAt: previous ? (JSON.parse(String(previous.payload)) as AgentTrainingExample).createdAt : now, updatedAt: now };
      this.db.prepare("INSERT INTO agent_training(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(saved.id, JSON.stringify(saved));
      return saved;
    });
  }
  private writeAgentRun(run: AgentRun) {
    this.db.prepare("UPDATE agent_runs SET status=?,lease_until=?,payload=? WHERE id=?").run(run.status, run.leaseUntil ?? 0, JSON.stringify(run), run.id);
  }
  private invalidateAgentRuns(ticketId: string) {
    const rows = this.db.prepare("SELECT payload FROM agent_runs WHERE ticket_id=? AND status IN ('queued','running','pending_approval')").all(ticketId);
    for (const row of rows) this.writeAgentRun({ ...JSON.parse(String(row.payload)) as AgentRun, status: "superseded", updatedAt: new Date().toISOString() });
  }
  private enqueueAgent(ticket: Ticket) {
    if (!this.agentSettings().enabled || ticket.status === "Resolvido" || ticket.origin === "historico") return;
    const messages = ticket.messages.filter(message => message.kind === "customer" || message.kind === "support");
    const last = messages.at(-1);
    const customer = messages.findLast(message => message.kind === "customer");
    const opening = messages.length === 2 && last?.content.startsWith("O chamado foi aberto e a equipe técnica já está analisando.");
    if (!last || !customer || (last.kind !== "customer" && !opening)) return;
    if (this.db.prepare("SELECT id FROM agent_runs WHERE ticket_id=? AND target_message_id=?").get(ticket.id, customer.id)) return;
    const now = new Date().toISOString();
    const run: AgentRun = { id: `RUN-${randomUUID()}`, ticketId: ticket.id, targetMessageId: customer.id, baselineMessageId: last.id, status: "queued", attempts: 0, createdAt: now, updatedAt: now };
    this.db.prepare("INSERT INTO agent_runs(id,ticket_id,target_message_id,status,payload) VALUES (?,?,?,?,?)").run(run.id, ticket.id, customer.id, run.status, JSON.stringify(run));
  }
  enqueueEligibleAgentTickets() {
    if (!this.agentSettings().enabled) return;
    const rows = this.db.prepare("SELECT id FROM tickets WHERE json_extract(payload,'$.status')!='Resolvido' ORDER BY created_at DESC").all();
    const eligible = rows.map(row => this.readTicket(String(row.id))).filter(ticket => {
      const messages = ticket.messages.filter(message => message.kind === "customer" || message.kind === "support");
      const last = messages.at(-1); const customer = messages.findLast(message => message.kind === "customer");
      return customer && last && (last.kind === "customer" || (messages.length === 2 && last.content.startsWith("O chamado foi aberto e a equipe técnica já está analisando."))) && !ticket.agentRuns?.some(run => run.targetMessageId === customer.id);
    });
    if (eligible.length) this.transaction(() => { for (const ticket of eligible) this.enqueueAgent(ticket); });
  }
  claimAgentRun(): AgentRun | null {
    if (!this.agentSettings().enabled) return null;
    const row = this.db.prepare("SELECT id FROM agent_runs WHERE status='queued' OR (status='running' AND lease_until<?) ORDER BY rowid LIMIT 1").get(Date.now());
    if (!row) return null;
    return this.transaction(() => {
      const current = this.db.prepare("SELECT payload FROM agent_runs WHERE id=? AND (status='queued' OR (status='running' AND lease_until<?))").get(row.id, Date.now());
      if (!current) return null;
      const previous = JSON.parse(String(current.payload)) as AgentRun;
      const run: AgentRun = { ...previous, status: "running", claimToken: randomUUID(), leaseUntil: Date.now() + 30000, attempts: previous.attempts + 1, updatedAt: new Date().toISOString(), error: undefined };
      this.writeAgentRun(run); return run;
    });
  }
  private currentAgentRun(run: AgentRun) {
    const row = this.db.prepare("SELECT payload FROM agent_runs WHERE id=?").get(run.id);
    return row ? JSON.parse(String(row.payload)) as AgentRun : undefined;
  }
  private agentConversationCurrent(run: AgentRun, ticket: Ticket) {
    const publicMessages = ticket.messages.filter(message => message.kind === "customer" || message.kind === "support");
    return ticket.status !== "Resolvido" && publicMessages.at(-1)?.id === run.baselineMessageId && publicMessages.findLast(message => message.kind === "customer")?.id === run.targetMessageId;
  }
  completeAgentRun(claim: AgentRun, result: AgentDecision) {
    this.transaction(() => {
      const run = this.currentAgentRun(claim);
      if (!run || run.status !== "running" || run.claimToken !== claim.claimToken) return;
      const ticket = this.readTicket(run.ticketId);
      if (!this.agentConversationCurrent(run, ticket)) { this.writeAgentRun({ ...run, status: "superseded" }); return; }
      if (!this.agentSettings().enabled) { this.writeAgentRun({ ...run, status: "queued", leaseUntil: 0 }); return; }
      if (result.kind === "clarification" && ticket.messages.some(message => message.id.startsWith("agent-reply:") && normalize(message.content) === normalize(result.reply))) result = { ...result, kind: "handoff", reply: "Recebi as informações adicionais. A equipe técnica precisa conferir os detalhes para orientar o próximo passo.", sources: [] };
      if (result.kind === "solution" && (!result.sources.length || result.sources.some(source => !this.activeAgentArticle(source.id)))) throw new AppError("A solução perdeu sua fonte ativa. Revise a base e reprocesse.");
      const now = new Date().toISOString();
      if (ticket.origin === "prefeitura" && result.kind !== "clarification") {
        this.writeAgentRun({ ...run, result, status: "pending_approval", updatedAt: now, leaseUntil: 0 });
        this.append(ticket.id, "log", "O agente Aprova preparou uma mensagem e aguarda aprovação do atendente.", `agent-pending:${run.id}`);
      } else {
        const messageId = `agent-reply:${run.id}`;
        this.append(ticket.id, "support", result.reply, messageId);
        this.writeAgentRun({ ...run, result, status: "published", publishedMessageId: messageId, updatedAt: now, leaseUntil: 0 });
      }
      this.writeTicket(ticket);
    });
  }
  failAgentRun(claim: AgentRun, error: string) {
    this.transaction(() => { const run = this.currentAgentRun(claim); if (run?.status === "running" && run.claimToken === claim.claimToken) this.writeAgentRun({ ...run, status: "failed", error: error.slice(0, 300), leaseUntil: 0, updatedAt: new Date().toISOString() }); });
  }
  private activeAgentArticle(id: string) {
    const row = this.db.prepare("SELECT payload FROM knowledge WHERE id=?").get(id);
    return !!row && (JSON.parse(String(row.payload)) as KnowledgeArticle).active;
  }
  approveAgentReply(ticketId: string, runId: string, value: unknown) {
    const reply = text(value, 4000, "Resposta aprovada", 1);
    this.transaction(() => {
      const run = this.currentAgentRun({ id: runId } as AgentRun);
      const ticket = this.readTicket(ticketId);
      if (!run || run.ticketId !== ticketId || run.status !== "pending_approval" || !run.result) throw new AppError("Proposta não está disponível para aprovação.", 409);
      if (!this.agentConversationCurrent(run, ticket)) throw new AppError("A conversa mudou. Revise a proposta mais recente.", 409);
      if (run.result.sources.some(source => !this.activeAgentArticle(source.id))) throw new AppError("Uma fonte ficou inativa. Reprocesse a proposta antes de aprovar.", 409);
      const messageId = `agent-reply:${run.id}`;
      this.append(ticketId, "support", reply, messageId);
      this.append(ticketId, "log", "Atendente aprovou a mensagem do agente Aprova.");
      this.writeAgentRun({ ...run, status: "published", publishedMessageId: messageId, result: { ...run.result, reply }, updatedAt: new Date().toISOString() });
      this.writeTicket(ticket);
    });
  }
  rejectAgentReply(ticketId: string, runId: string) {
    this.transaction(() => { const run = this.currentAgentRun({ id: runId } as AgentRun); if (!run || run.ticketId !== ticketId || run.status !== "pending_approval") throw new AppError("Proposta indisponível.", 409); this.writeAgentRun({ ...run, status: "rejected", updatedAt: new Date().toISOString() }); this.append(ticketId, "log", "Atendente rejeitou a mensagem sugerida pelo agente Aprova."); });
  }
  retryAgentRun(ticketId: string, runId: string) {
    this.transaction(() => { const run = this.currentAgentRun({ id: runId } as AgentRun); const ticket = this.readTicket(ticketId); if (!run || run.ticketId !== ticketId || !["failed", "rejected", "superseded", "pending_approval"].includes(run.status) || !this.agentConversationCurrent(run, ticket)) throw new AppError("Esta execução não pode ser reprocessada. Confira a conversa atual.", 409); this.writeAgentRun({ ...run, status: "queued", result: undefined, error: undefined, leaseUntil: 0, updatedAt: new Date().toISOString() }); });
  }
  agentInput(textValue: string, processId?: string, queryValue = textValue) {
    const articles = this.db.prepare("SELECT payload FROM knowledge WHERE json_extract(payload,'$.active')=1").all().map(row => JSON.parse(String(row.payload)) as KnowledgeArticle);
    const allTraining = this.agentTraining().filter(example => example.active && example.articleIds.every(id => articles.some(article => article.id === id)));
    const terms = normalize(queryValue).split(/\W+/).filter(term => term.length > 3);
    const training = allTraining.sort((a, b) => terms.filter(term => normalize(b.text).includes(term)).length - terms.filter(term => normalize(a.text).includes(term)).length);
    const references = training.slice(0, 10).flatMap(example => example.articleIds);
    const matched = findKnowledgeArticles(textValue, articles);
    const selected = [...new Map([...matched, ...articles.filter(article => references.includes(article.id))].map(article => [article.id, article])).values()].slice(0, 10).map(article => ({ ...article, content: article.content.slice(0, 12000) }));
    const process = processId ? this.snapshot().processes.find(process => process.id === processId) : undefined;
    const processNumber = process?.protocol ?? process?.id.match(/\d+/)?.[0];
    return { query: queryValue, text: `${textValue}${processNumber ? `\nContexto informado pela plataforma: processo ${processNumber}.` : ""}`, articles: selected, training, author: "Solicitante" };
  }
  agentInputForRun(run: AgentRun) {
    const ticket = this.readTicket(run.ticketId);
    const customer = ticket.messages.filter(message => message.kind === "customer").slice(-4).map(message => message.content).join("\n");
    const processId = ticket.processId ?? this.snapshot().processes.find(process => normalize(ticket.description).includes(normalize(process.name)))?.id;
    return { ...this.agentInput(`${ticket.subject}\n${customer}`, processId, ticket.messages.findLast(message => message.kind === "customer")!.content), author: ticket.origin === "prefeitura" ? "Analista" : "Requerente" };
  }
  suggestReply(id: string) {
    const ticket = this.readTicket(id);
    const articles = this.db.prepare("SELECT payload FROM knowledge").all().map(row => JSON.parse(String(row.payload)) as KnowledgeArticle);
    return buildReplyDraft(`${ticket.subject} ${ticket.description}`, articles);
  }
  saveArticle(value: unknown, id?: string): KnowledgeArticle {
    const input: ArticleInput = articleInput(value);
    return this.transaction(() => {
      const row = id ? this.db.prepare("SELECT payload FROM knowledge WHERE id=?").get(id) : undefined;
      if (id && !row) throw new AppError("Artigo não encontrado.", 404);
      const previous = row ? JSON.parse(String(row.payload)) as KnowledgeArticle : undefined;
      const now = new Date().toISOString();
      const article = { ...previous, ...input, id: id ?? `KB-${randomUUID().slice(0, 8).toUpperCase()}`, createdAt: previous?.createdAt ?? now, updatedAt: now };
      this.db.prepare("INSERT INTO knowledge(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(article.id, JSON.stringify(article));
      return article;
    });
  }
  retryTriage(id: string) { this.transaction(() => { const ticket = this.readTicket(id); if (ticket.triage === "failed") this.writeTicket({ ...ticket, triage: "pending" }); }); }
  settleTriage(history: Ticket[], delay = 1000) {
    const candidates = this.db.prepare("SELECT id FROM tickets WHERE json_extract(payload,'$.triage')='pending' AND created_at<=?").all(new Date(Date.now() - delay).toISOString());
    for (const candidate of candidates) this.transaction(() => {
      const ticket = this.readTicket(String(candidate.id));
      if (ticket.triage !== "pending") return;
      const knowledge = this.db.prepare("SELECT payload FROM knowledge").all().map(row => JSON.parse(String(row.payload)) as KnowledgeArticle);
      const note = investigateTicket(ticket, history, knowledge);
      this.append(ticket.id, "internal", note, `triage:${ticket.id}`);
      this.writeTicket({ ...ticket, triage: "complete" });
    });
  }
}
let repository: HubRepository | undefined;
export function getRepository() { return repository ??= new HubRepository(process.env.ZENITH_DB_PATH || join(process.cwd(), "data", "zenith.sqlite")); }
