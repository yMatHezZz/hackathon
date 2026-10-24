import { readJson, respond } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
import { object } from "@/lib/server/validation";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string; attemptId: string }> }) {
  return respond(request, async () => {
    const { id, attemptId } = await context.params;
    return { attempt: getRepository().setFormAttemptOutcome(id, attemptId, object(await readJson(request)).outcome) };
  });
}
