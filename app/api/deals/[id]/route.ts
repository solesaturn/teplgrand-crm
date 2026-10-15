import { blankSecrets } from "@/lib/server/desk";
import { requestSession, serverError } from "@/lib/server/http";
import { deleteDeal, setDealStage } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requestSession();
    if (!session) return Response.json({ error: "Нужно войти." }, { status: 401 });
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { stage?: unknown } | null;
    const stage = typeof body?.stage === "string" ? body.stage : "";
    const result = await setDealStage(id, stage);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(blankSecrets(result.data, session));
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requestSession();
    if (!session) return Response.json({ error: "Нужно войти." }, { status: 401 });
    if (session.kind !== "admin") {
      return Response.json({ error: "Удалять сделки может администратор." }, { status: 403 });
    }
    const { id } = await context.params;
    const result = await deleteDeal(id);
    if (!result.ok) return Response.json({ error: "Такой сделки уже нет." }, { status: 404 });
    return Response.json(blankSecrets(result.data, session));
  } catch (error) {
    return serverError(error);
  }
}
