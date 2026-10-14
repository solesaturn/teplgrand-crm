import { clearSessionCookie, cookieToken, serverError } from "@/lib/server/http";
import { endSession } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = await cookieToken();
    await endSession(token);
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
