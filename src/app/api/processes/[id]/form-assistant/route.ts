import { readJson, respond } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, () => context.params.then(({ id }) => ({ attempts: getRepository().formAssistantHistory(id) })));
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, async () => getRepository().adjustForm((await context.params).id, await readJson(request)));
}
