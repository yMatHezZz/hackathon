import { readJson, respond } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
import { agentHealth, runAprovaAgent } from "@/lib/server/aprova-agent";
import { wakeResponseAgent } from "@/lib/server/agent-queue";
import { AppError, object, text } from "@/lib/server/validation";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return respond(request, async () => {
    const repo = getRepository(); let health;
    try { health = await agentHealth(); } catch (error) { health = { ready: false, error: error instanceof Error ? error.message : "Agente indisponível." }; }
    return { settings: repo.agentSettings(), training: repo.agentTraining(), health };
  });
}
export async function PATCH(request: Request) {
  return respond(request, async () => { const input = object(await readJson(request)); getRepository().setAgentEnabled(input.enabled); wakeResponseAgent(); return { settings: getRepository().agentSettings() }; });
}
export async function POST(request: Request) {
  return respond(request, async () => {
    const input = object(await readJson(request)); const repo = getRepository();
    if (input.action === "train") return { example: repo.saveAgentTraining(input.example, input.id === undefined ? undefined : text(input.id, 100, "Exemplo")) };
    if (input.action === "test") {
      const message = text(input.text, 4000, "Mensagem de teste", 10);
      const processId = input.processId ? text(input.processId, 30, "Processo") : undefined;
      const result = await runAprovaAgent(repo.agentInput(message, processId));
      return { result, delivery: input.origin === "prefeitura" && result.kind !== "clarification" ? "approval" : "automatic" };
    }
    throw new AppError("Ação de treinamento inválida.");
  });
}
