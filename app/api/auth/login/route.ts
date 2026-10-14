import { blankSecrets } from "@/lib/server/desk";
import { serverError, setSessionCookie } from "@/lib/server/http";
import { getData, startSession } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { login?: unknown; password?: unknown };
    const login = typeof body.login === "string" ? body.login : "";
    const password = typeof body.password === "string" ? body.password : "";
    const opened = await startSession(login, password);
    if (!opened) {
      return Response.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    await setSessionCookie(opened.token);
    const data = blankSecrets(await getData(), opened.session);
    return Response.json({ session: opened.session, data });
  } catch (error) {
    return serverError(error);
  }
}
