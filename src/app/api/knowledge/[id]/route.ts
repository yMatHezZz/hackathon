import { readJson, respond, snapshot } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, async () => { getRepository().saveArticle(await readJson(request, 524288), (await context.params).id); return { snapshot: snapshot() }; });
}
