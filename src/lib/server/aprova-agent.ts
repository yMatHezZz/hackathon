import { spawn } from "node:child_process";
import { join } from "node:path";
import type { AgentDecision, AgentTrainingExample } from "../agent-types";
import type { KnowledgeArticle } from "../types";
import { pylonArticleUrl } from "../knowledge-links";

function invoke(payload: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.NOLYP_PYTHON_PATH || "python", [join(process.cwd(), "integrations/aprova-agent/runner.py")], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1" } });
    let output = ""; let size = 0;
    const timer = setTimeout(() => { child.kill(); reject(new Error("O agente local excedeu o tempo de resposta.")); }, 12000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { size += Buffer.byteLength(chunk, "utf8"); if (size > 1048576) { child.kill(); reject(new Error("Resposta do agente acima do limite.")); } else output += chunk; });
    child.stderr.resume();
    child.on("error", () => { clearTimeout(timer); reject(new Error("Python indisponível. Configure NOLYP_PYTHON_PATH no servidor.")); });
    child.on("close", code => { clearTimeout(timer); try { const result = JSON.parse(output); if (code !== 0 || result.error) throw new Error(); resolve(result); } catch { reject(new Error("O agente local não conseguiu processar a solicitação.")); } });
    child.stdin.on("error", () => {});
    const input = JSON.stringify(payload);
    if (Buffer.byteLength(input) > 1048576) { child.kill(); clearTimeout(timer); reject(new Error("Contexto do agente acima do limite.")); return; }
    child.stdin.end(input);
  });
}
export async function agentHealth() { return await invoke({ mode: "health" }) as { ready: boolean; engine: string; mode: string; llm: boolean }; }
export async function runAprovaAgent(input: { text: string; query: string; author: string; articles: KnowledgeArticle[]; training: AgentTrainingExample[] }): Promise<AgentDecision> {
  const result = await invoke(input) as AgentDecision;
  if (!result || typeof result.engine !== "string" || !result.engine.startsWith("aprova-agent-mvp@") || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1 || (result.triageNote !== null && (typeof result.triageNote !== "string" || result.triageNote.length > 8000)) || !["BUG", "DUVIDA", "CONSTRUIR_ALTERAR"].includes(result.bucket) || !["solution", "clarification", "handoff"].includes(result.kind) || typeof result.reply !== "string" || !result.reply.trim() || result.reply.length > 4000 || !Array.isArray(result.sources) || result.sources.length > 5 || result.sources.some(source => !source || typeof source.id !== "string")) throw new Error("Resposta inválida do agente local.");
  const allowed = new Map(input.articles.filter(article => article.active).map(article => [article.id, article]));
  result.sources = result.sources.filter(source => allowed.has(source.id)).map(source => ({ id: source.id, title: allowed.get(source.id)!.title, url: pylonArticleUrl(allowed.get(source.id)!.sourceUrl) ?? undefined }));
  if (result.kind === "solution" && !result.sources.length) throw new Error("Solução do agente sem fonte ativa. Encaminhe para revisão humana.");
  const links = [...new Set(result.sources.map(source => source.url).filter((url): url is string => !!url && !result.reply.includes(url)))].slice(0, 3);
  if (result.kind === "solution" && links.length) { const suffix = `\n\nFonte${links.length > 1 ? "s" : ""}:\n${links.join("\n")}`; result.reply = result.reply.slice(0, 4000 - suffix.length) + suffix; }
  return result;
}
