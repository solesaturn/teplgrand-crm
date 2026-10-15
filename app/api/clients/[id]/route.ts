import { blankSecrets } from "@/lib/server/desk";
import { requestSession, serverError } from "@/lib/server/http";
import { deleteClient } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requestSession();
    if (!session) return Response.json({ error: "Нужно войти." }, { status: 401 });
    if (session.kind !== "admin") {
      return Response.json({ error: "Удалять клиентов может администратор." }, { status: 403 });
    }
    const { id } = await context.params;
    const result = await deleteClient(id);
    if (!result.ok) return Response.json({ error: "Такого клиента уже нет." }, { status: 404 });
    return Response.json(blankSecrets(result.data, session));
  } catch (error) {
    return serverError(error);
  }
}
