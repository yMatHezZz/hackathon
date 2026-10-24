import { readJson, respond, snapshot } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
import { wakeResponseAgent } from "@/lib/server/agent-queue";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(request, async () => {
    const ticket = getRepository().createTicket(await readJson(request));
    wakeResponseAgent();
    return { snapshot: snapshot(), ticketId: ticket.id };
  }, 201);
}
