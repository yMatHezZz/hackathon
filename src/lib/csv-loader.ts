import Papa from "papaparse";
import type { Ticket } from "./types";
import { normalize } from "./domain";
import { demoHistory } from "./demo-data";
const header = (value: string) => normalize(value.replace(/^\uFEFF/, "")).replace(/[^a-z0-9]/g, "");
export function parseTicketsCsv(text: string): Ticket[] {
  if (!text.trim() || text.length > 5_000_000) throw new Error("CSV vazio ou acima de 5 MB.");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: "greedy", transformHeader: header });
  if (parsed.errors.some(e => e.code !== "UndetectableDelimiter")) throw new Error("CSV malformado.");
  const fields = parsed.meta.fields ?? [];
  if (!fields.some(f => ["assunto", "titulo", "subject", "descricao", "description", "problema", "descricaoproblema"].includes(f))) throw new Error("Cabeçalhos de chamado não encontrados.");
  const seen = new Set<string>();
  const tickets = parsed.data.map((row, index): Ticket => {
    const pick = (...names: string[]) => names.map(name => row[name]?.trim()).find(Boolean) ?? "";
    const id = pick("id", "ticketid", "idticket", "chamado", "idchamado", "numero") || `CSV-${index + 1}`;
    if (seen.has(id)) throw new Error("IDs de chamados duplicados.");
    seen.add(id);
    const description = pick("descricao", "description", "problema", "descricaoproblema", "mensagem", "assunto", "titulo", "subject");
    if (!description) throw new Error("Chamado sem descrição.");
    const date = pick("data", "createdat", "dataabertura");
    const createdAt = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : "2026-10-20T12:00:00Z";
    const resolution = pick("solucao", "resolucao", "resolution", "resposta", "acaotomada");
    return { id, subject: pick("assunto", "titulo", "subject") || description.slice(0, 90), description, resolution, name: pick("nome", "solicitante", "name") || "Solicitante demonstrativo", email: pick("email", "emaildosolicitante") || "demo@example.com", account: pick("conta", "prefeitura", "account") || "Prefeitura Modelo", channel: "Formulário", origin: "historico", status: "Resolvido", source: "CSV", triage: "none", createdAt, messages: [{ id: `csv-${id}-request`, kind: "customer", content: description, createdAt }, ...(resolution ? [{ id: `csv-${id}-resolution`, kind: "support" as const, content: resolution, createdAt }] : [])] };
  });
  if (!tickets.length) throw new Error("CSV sem chamados.");
  return tickets;
}
export async function loadTickets(signal?: AbortSignal): Promise<{ tickets: Ticket[]; notice: string; source: string }> {
  const timeout = AbortSignal.timeout(8000);
  try {
    const response = await fetch("/tickets_suporte_150_balanceado.csv", { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!response.ok) throw new Error("CSV indisponível.");
    const tickets = parseTicketsCsv(await response.text());
    return { tickets, source: "CSV demonstrativo", notice: "" };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { tickets: demoHistory, source: "Fallback demonstrativo", notice: "CSV indisponível ou inválido. Usando 6 chamados fictícios locais; o fluxo continua disponível." };
  }
}
