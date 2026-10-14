import { requestSession, serverError } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requestSession();
    return Response.json({ session });
  } catch (error) {
    return serverError(error);
  }
}
