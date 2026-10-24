import { readJson, respond, snapshot } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(request, async () => {
    const ticket = getRepository().createTicket(await readJson(request));
    return { snapshot: snapshot(), ticketId: ticket.id };
  }, 201);
}
