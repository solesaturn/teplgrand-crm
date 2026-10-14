import { blankSecrets } from "@/lib/server/desk";
import { requestSession, serverError } from "@/lib/server/http";
import { getData, saveSellerDesk } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requestSession();
    if (!session) return Response.json({ error: "Нужно войти." }, { status: 401 });
    const data = blankSecrets(await getData(), session);
    return Response.json(data);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requestSession();
    if (!session) return Response.json({ error: "Нужно войти." }, { status: 401 });
    if (session.kind !== "seller") {
      return Response.json({ error: "Список отдела сохраняет продавец." }, { status: 403 });
    }
    const body = (await request.json()) as unknown;
    const data = blankSecrets(await saveSellerDesk(session.sellerId, body), session);
    return Response.json(data);
  } catch (error) {
    return serverError(error);
  }
}
