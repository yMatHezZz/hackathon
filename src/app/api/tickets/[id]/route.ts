import { readJson, respond, snapshot } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
import { AppError, object } from "@/lib/server/validation";
import { wakeResponseAgent } from "@/lib/server/agent-queue";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, async () => {
    const { id } = await context.params;
    const body = object(await readJson(request));
    const repo = getRepository();
    let message: string | undefined;
    if (body.action === "suggest-reply") return { snapshot: snapshot(), draft: repo.suggestReply(id) };
    switch (body.action) {
      case "reply": repo.reply(id, body.content, body.kind); break;
      case "status": repo.setStatus(id, body.status); break;
      case "priority": repo.setPriority(id, body.priority); break;
      case "command": message = repo.command(id, body.command); break;
      case "retry-triage": repo.retryTriage(id); break;
      case "approve-agent": repo.approveAgentReply(id, String(body.runId ?? ""), body.content); break;
      case "reject-agent": repo.rejectAgentReply(id, String(body.runId ?? "")); break;
      case "retry-agent": repo.retryAgentRun(id, String(body.runId ?? "")); break;
      default: throw new AppError("Ação de chamado inválida.");
    }
    wakeResponseAgent();
    return { snapshot: snapshot(), message };
  });
}
