import { describe, expect, it } from "vitest";
import { parseTicketsCsv } from "../src/lib/csv-loader";
import { investigateTicket } from "../src/lib/ai-triage";
import { executeCommand, validateTicketForm, updateProcessInformation } from "../src/lib/domain";
import { initialProcesses } from "../src/lib/demo-data";

const form = { name: "Ana Demonstração", email: "ana@example.com", account: "Prefeitura Modelo", channel: "Chat" as const, origin: "requerente" as const, description: "Alvará 001 bloqueado ao enviar documentos." };

describe("CSV", () => {
  it("normaliza cabeçalhos e importa histórico como resolvido", () => {
    const tickets = parseTicketsCsv('ID;Assunto;Descrição;Solução\n42;Alvará bloqueado;Erro ao enviar documentos;Permissão revisada');
    expect(tickets[0]).toMatchObject({ id: "42", subject: "Alvará bloqueado", status: "Resolvido", resolution: "Permissão revisada" });
  });
  it("recusa vazio, linhas quebradas e esquema desconhecido", () => {
    expect(() => parseTicketsCsv("")).toThrow();
    expect(() => parseTicketsCsv('id,assunto\n1,"aberto')).toThrow();
    expect(() => parseTicketsCsv("a,b\n1,2")).toThrow();
  });
  it("recusa IDs duplicados para evitar seleção ambígua", () => {
    expect(() => parseTicketsCsv("id,assunto\n1,Primeiro\n1,Segundo")).toThrow();
  });
});

describe("triagem somente interna", () => {
  it("gera cinco seções no canal correto, encontra similar e preserva entradas", () => {
    const history = parseTicketsCsv("id,assunto,descricao\n42,Alvará bloqueado,Erro ao enviar documentos");
    const before = JSON.stringify({ form, history });
    const note = investigateTicket(form, history);
    expect(note).toContain("## Investigação inicial automática\n");
    expect(note.match(/### \d\./g)).toHaveLength(5);
    expect(note).toContain("**Canal:** Chat");
    expect(note).not.toMatch(/tipo (da|de) conta/i);
    expect(note).toContain("#42:");
    expect(note).toContain("— Resolvido");
    expect(JSON.stringify({ form, history })).toBe(before);
  });
  it("identifica tickets municipais como formulário e mantém similar pendente identificado", () => {
    const history = parseTicketsCsv("id,assunto,descricao\n42,Alvará bloqueado,Erro ao enviar documentos");
    history[0].status = "Aberto";
    const note = investigateTicket({ ...form, origin: "prefeitura", channel: "Formulário", subject: "Bloqueio do Alvará 001", processId: "001" }, history);
    expect(note).toContain("**Canal:** Formulário");
    expect(note).toContain("#42:");
    expect(note).toContain("— Pendente");
  });
  it("não inventa correspondências e escapa Markdown do solicitante", () => {
    const note = investigateTicket({ ...form, name: "[clique](https://example.com)", description: "Questão completamente inédita" }, []);
    expect(note).toContain("Nenhum chamado semelhante");
    expect(note).not.toContain("[clique](https://example.com)");
  });
});

describe("ações explícitas", () => {
  const processes = initialProcesses;
  it("desbloqueia somente o processo solicitado e registra a ação", () => {
    const result = executeCommand("Desbloquear Alvará 001", processes);
    expect(result.processes[0].status).toBe("Em Análise");
    expect(result.message).toBe("Ação executada: Alvará 001 desbloqueado pela IA");
    expect(processes[0].status).toBe("Bloqueado");
    expect(executeCommand("Desbloquear Alvará 001", result.processes).changed).toBe(false);
  });
  it("não executa instruções arbitrárias nem altera IDs inexistentes", () => {
    expect(executeCommand("Apagar todos os processos", processes).changed).toBe(false);
    expect(executeCommand("Não desbloquear Alvará 001", processes).changed).toBe(false);
    expect(executeCommand("Desbloquear Alvará 999", processes).changed).toBe(false);
  });
  it("rejeita campos vazios, email inválido e descrição excessiva", () => {
    expect(validateTicketForm(form)).toBeNull();
    expect(validateTicketForm({ ...form, email: "invalido" })).toBeTruthy();
    expect(validateTicketForm({ ...form, name: " " })).toBeTruthy();
    expect(validateTicketForm({ ...form, description: "x".repeat(4001) })).toBeTruthy();
    expect(validateTicketForm({ ...form, origin: "prefeitura", channel: "Formulário", subject: "" })).toBeTruthy();
  });
});

describe("edição de informações do processo", () => {
  it("salva seções do modelo de alvará e valida e-mail, área e taxas", () => {
    const information = { ...initialProcesses[0].information, applicantEmail: "ana@example.com", applicantDocument: "DEMO-001", applicantPhone: "(00) 0000-0000", requestType: "Renovação", propertyRegistration: "IMOVEL-DEMO-123", propertyArea: "150.5", propertyUse: "Comercial", documents: "Planta modelo e comprovante demonstrativo", feeAmount: "125.90", feeReference: "GUIA-DEMO-001", feeDueDate: "2026-12-10" };
    const saved = updateProcessInformation(initialProcesses, "001", information)[0].information;
    expect(saved).toMatchObject({ applicantEmail: "ana@example.com", requestType: "Renovação", propertyArea: "150.5", documents: "Planta modelo e comprovante demonstrativo", feeAmount: "125.90", feeReference: "GUIA-DEMO-001" });
    expect(() => updateProcessInformation(initialProcesses, "001", { ...information, applicantEmail: "inválido" })).toThrow();
    expect(() => updateProcessInformation(initialProcesses, "001", { ...information, propertyArea: "-1" })).toThrow();
    expect(() => updateProcessInformation(initialProcesses, "001", { ...information, feeAmount: "-10" })).toThrow();
  });
  it("salva campos editáveis sem liberar o bloqueio ou modificar a entrada", () => {
    const before = JSON.stringify(initialProcesses);
    const details = { ...initialProcesses[0].information, address: "Rua Exemplo, 123", activity: "Comércio de livros" };
    const result = updateProcessInformation(initialProcesses, "001", details);
    expect(result[0].information.address).toBe("Rua Exemplo, 123");
    expect(result[0].information.activity).toBe("Comércio de livros");
    expect(result[0].status).toBe("Bloqueado");
    expect(result[1]).toBe(initialProcesses[1]);
    expect(JSON.stringify(initialProcesses)).toBe(before);
  });
  it("recusa processo inexistente e informações obrigatórias vazias", () => {
    expect(() => updateProcessInformation(initialProcesses, "999", initialProcesses[0].information)).toThrow();
    expect(() => updateProcessInformation(initialProcesses, "001", { ...initialProcesses[0].information, address: " " })).toThrow();
  });
});
