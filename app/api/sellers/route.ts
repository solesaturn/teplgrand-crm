import { blankSecrets } from "@/lib/server/desk";
import { requestSession, serverError } from "@/lib/server/http";
import { createSeller } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requestSession();
    if (!session) return Response.json({ error: "Нужно войти." }, { status: 401 });
    if (session.kind !== "admin") {
      return Response.json({ error: "Добавлять продавцов может администратор." }, { status: 403 });
    }
    const body = (await request.json()) as { name?: unknown; login?: unknown; password?: unknown };
    const result = await createSeller({
      name: typeof body.name === "string" ? body.name : "",
      login: typeof body.login === "string" ? body.login : "",
      password: typeof body.password === "string" ? body.password : "",
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json(blankSecrets(result.data, session));
  } catch (error) {
    return serverError(error);
  }
}
