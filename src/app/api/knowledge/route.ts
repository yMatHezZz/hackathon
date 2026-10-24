import { readJson, respond, snapshot } from "@/lib/server/http";
import { getRepository } from "@/lib/server/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return respond(request, async () => { getRepository().saveArticle(await readJson(request, 524288)); return { snapshot: snapshot() }; }, 201);
}
