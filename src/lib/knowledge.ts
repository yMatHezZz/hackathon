import type { KnowledgeArticle, ReplyDraft } from "./types";
import { normalize } from "./domain";
export function findKnowledgeArticles(query: string, articles: KnowledgeArticle[]): KnowledgeArticle[] {
  const words = [...new Set(normalize(query).split(/[^a-z0-9]+/).filter(word => word.length > 3 && !["para", "como", "conta", "processo", "consigo", "apos", "pela", "pelo", "preciso", "ajuda", "sobre", "fazer", "pode", "chamado"].includes(word)))];
  return articles.filter(article => article.active).map(article => {
    const terms = normalize(`${article.title} ${article.tags.join(" ")} ${article.content}`).split(/[^a-z0-9]+/);
    const heading = normalize(`${article.title} ${article.tags.join(" ")}`).split(/[^a-z0-9]+/);
    return { article, score: words.filter(word => terms.includes(word)).length + 3 * words.filter(word => heading.includes(word)).length };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.article);
}
export function buildReplyDraft(query: string, articles: KnowledgeArticle[]): ReplyDraft {
  const matches = findKnowledgeArticles(query, articles);
  if (!matches.length) return { content: "Ainda não encontrei uma orientação correspondente na base. Para investigar, informe o processo, os passos realizados e a mensagem apresentada pela plataforma.", sources: [] };
  const article = matches[0];
  const template = article.content.match(/(?:^|\n)#{1,6}\s*(?:\d+[.)]?\s*)?(?:modelo|resposta(?: ao cliente)?|orienta[çc][ãa]o ao cliente)[^\n]*\n([\s\S]*?)(?=\n#{1,6}\s|$)/i)?.[1];
  const candidate = template || article.content.replace(/^#\s+[^\n]+\n/, "");
  const clean = candidate.replace(/```[\s\S]*?```/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, "");
  const paragraphs = clean.split(/\n\s*\n/).map(value => value.trim()).filter(value => value.length > 35 && !/^(?:Categoria|Equipe|Status|#|\|)/i.test(value) && !/CREDENCIAL OCULTADA|Bearer |api[_-]?key|password|service_role/i.test(value));
  const excerpt = paragraphs.slice(0, 2).join("\n\n").replace(/^[*-]\s*/gm, "").slice(0, 1800);
  return { content: excerpt ? `Olá! Com base nas orientações disponíveis sobre “${article.title}”:\n\n${excerpt}\n\nSe o impedimento continuar, envie os detalhes do processo para a equipe conferir.` : `Olá! Localizamos o procedimento “${article.title}”. A equipe vai conferir os detalhes do seu caso antes de orientar a próxima ação.`, sources: matches.map(item => ({ id: item.id, title: item.title })) };
}
