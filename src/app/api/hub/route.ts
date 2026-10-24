import { respond, snapshot } from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return respond(request, () => {
  const raw = new URL(request.url).searchParams.get("since");
  return raw !== null && /^\d+$/.test(raw) ? snapshot(Number(raw)) : snapshot();
}); }
