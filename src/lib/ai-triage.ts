import type { Ticket, TicketForm, KnowledgeArticle } from "./types";
import { findKnowledgeArticles } from "./knowledge";
import { normalize } from "./domain";
const escape = (value: string) => value.replace(/[\\`*_{}\[\]()#+.!<>|~-]/g, "\\$&").replace(/[\r\n]+/g, " ");
const stopwords = new Set(["para", "como", "pelo", "pela", "esse", "essa", "esta", "este", "meu", "minha", "nao", "consigo", "apos", "conta", "processo", "com", "uma", "que", "dos", "das"]);
const tokens = (text: string) => [...new Set(normalize(text).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stopwords.has(t)))];

/** Função pura: produz somente uma nota. Não muda status, processos ou mensagens. */
export function investigateTicket(form: Pick<Ticket, "name" | "description" | "subject" | "channel" | "processId"> | TicketForm, history: Ticket[], knowledge: KnowledgeArticle[] = []): string {
  const articles = findKnowledgeArticles(`${form.subject ?? ""} ${form.description}`, knowledge);
  const words = tokens(`${form.subject ?? ""} ${form.description}`);
  const similar = history.map(ticket => {
    const other = tokens(`${ticket.subject} ${ticket.description}`);
    const shared = words.filter(word => other.includes(word));
    return { ticket, shared, score: shared.length };
  }).filter(item => item.score >= 2).sort((a, b) => b.score - a.score).slice(0, 3);
  const text = normalize(form.description);
  const blocked = /bloque|permiss|acesso/.test(text);
  const upload = /document|anexo|upload|pdf/.test(text);
  const hypothesis = blocked ? "Pode haver uma restrição de permissão ou bloqueio no fluxo do processo. A causa precisa ser confirmada pelo atendente; o texto não comprova falha de autorização." : upload ? "O impedimento pode estar relacionado ao formato ou tamanho do documento enviado. É necessário conferir o erro exibido e as regras do portal." : "Pode existir uma pendência no fluxo informado. Ainda não há evidências suficientes para estabelecer a causa.";
  const next = blocked ? "Conferir o processo relacionado e as permissões do solicitante. Se a liberação for autorizada, executar o comando de desbloqueio com o nome e o número corretos do processo na sidebar." : upload ? "Solicitar o erro exibido, o formato e o tamanho do arquivo. Conferir os limites antes de orientar um novo envio." : "Solicitar a identificação do processo, os passos realizados e a mensagem de erro antes de executar qualquer ação.";
  return `## Investigação inicial automática
### 1. Resumo do chamado
- **Problema:** ${escape(form.description.slice(0, 350))}
- **Canal:** ${form.channel}
- **Solicitante:** ${escape(form.name)}
- **Impacto aparente:** Médio (Necessita análise técnica)
### 2. Evidências observadas
- O solicitante informou: “${escape(form.description.slice(0, 200))}”.
- ${upload ? "O relato menciona documentos ou envio de arquivos; nenhum arquivo foi inspecionado." : blocked ? "O relato menciona bloqueio ou acesso; nenhuma permissão real foi consultada." : "A análise usa somente o texto do formulário e o histórico local."}
${articles.length ? articles.map(article => `- Base de conhecimento: ${escape(article.title)} (${escape(article.id)}), revisada em ${escape(article.updatedAt.slice(0, 10))}.`).join("\n") : "- Nenhum artigo ativo da base de conhecimento corresponde ao relato."}
### 3. Chamados semelhantes encontrados
${similar.length ? similar.map(({ ticket, shared }) => `- #${escape(ticket.id)}: Termos em comum: ${shared.map(escape).join(", ")} — ${ticket.status === "Resolvido" ? "Resolvido" : "Pendente"}`).join("\n") : "- Nenhum chamado semelhante encontrado com pelo menos dois termos relevantes em comum."}
### 4. Hipótese inicial
${hypothesis}
### 5. Possível próxima ação
${next}${articles.length ? `\n\nOrientação da base interna — **${escape(articles[0].title)}** (${escape(articles[0].id)}): ${escape(articles[0].content.slice(0, 1400))}\n\nValidar a orientação antes de agir; o artigo não autoriza execução automática.` : ""}`;
}
