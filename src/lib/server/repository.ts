import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { ArticleInput, HubSnapshot, KnowledgeArticle, Message, Process, Ticket } from "../types";
import { buildReplyDraft } from "../knowledge";
import { initialProcesses } from "../demo-data";
import { executeCommand, updateProcessInformation } from "../domain";
import { investigateTicket } from "../ai-triage";
import { AppError, articleInput, priority, processInformation, status, text, ticketForm } from "./validation";

export class HubRepository {
  private db: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    this.db.exec(readFileSync(join(process.cwd(), "migrations/001_local_hub.sql"), "utf8"));
    this.db.exec(readFileSync(join(process.cwd(), "migrations/002_process_protocols.sql"), "utf8"));
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
    return ticket;
  }
  private writeTicket(ticket: Ticket) {
    const payload = { ...ticket, messages: [], updatedAt: new Date().toISOString() };
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
      const now = new Date().toISOString();
      const ticket: Ticket = { ...form, id: `NLP-${randomUUID().slice(0, 8).toUpperCase()}`, subject: form.subject ?? form.description.slice(0, 90), priority: form.priority ?? "Média", status: "Aberto", createdAt: now, updatedAt: now, source: form.channel, messages: [], triage: "pending" };
      this.db.prepare("INSERT INTO tickets(id,origin,priority,created_at,updated_at,payload) VALUES (?,?,?,?,?,?)").run(ticket.id, ticket.origin, ticket.priority!, now, now, JSON.stringify(ticket));
      this.append(ticket.id, "customer", form.description);
      this.append(ticket.id, "support", "O chamado foi aberto e a equipe técnica já está analisando. Esta é uma confirmação automática de demonstração.");
      return this.readTicket(ticket.id);
    });
  }
  reply(id: string, content: unknown, kind: unknown) {
    const body = text(content, 4000, "Mensagem");
    if (kind !== "customer" && kind !== "support") throw new AppError("Autor da mensagem inválido.");
    this.transaction(() => { const ticket = this.readTicket(id); this.append(id, kind, body); this.writeTicket(ticket); });
  }
  setPriority(id: string, value: unknown) {
    const next = priority(value);
    this.transaction(() => { const ticket = this.readTicket(id); if (ticket.priority === next) return; this.append(id, "log", `Atendente alterou a prioridade para ${next}.`); this.writeTicket({ ...ticket, priority: next }); });
  }
  setStatus(id: string, value: unknown) {
    const next = status(value);
    this.transaction(() => { const ticket = this.readTicket(id); if (ticket.status === next) return; this.append(id, "log", `Atendente alterou o status para ${next}.`); this.writeTicket({ ...ticket, status: next }); });
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
      try { [process] = updateProcessInformation([JSON.parse(String(row.payload)) as Process], id, information); }
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
      try { [prepared] = updateProcessInformation([template], id, information); }
      catch (error) { throw new AppError(error instanceof Error ? error.message : "Revise os dados do formulário."); }
      const processId = `PRC-${randomUUID().slice(0, 12).toUpperCase()}`;
      const now = new Date().toISOString();
      const sequence = this.db.prepare("INSERT INTO process_protocols(process_id,created_at) VALUES (?,?)").run(processId, now).lastInsertRowid;
      const submitted = { ...prepared, id: processId, templateId: template.id, protocol: `NLP-${new Date().getFullYear()}-${String(sequence).padStart(6, "0")}`, submittedAt: now, updatedAt: now };
      this.db.prepare("INSERT INTO processes(id,payload) VALUES (?,?)").run(processId, JSON.stringify(submitted));
      return submitted;
    });
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
