import { readJson, respond, snapshot } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, async () => {
    const process = getRepository().submitProcess((await context.params).id, await readJson(request));
    return { snapshot: snapshot(), processId: process.id };
  }, 201);
}
