import { cookies } from "next/headers";
import { openSession } from "@/lib/server/store";

export const SESSION_COOKIE = "telpcrm_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function cookieToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase(), maxAge: MAX_AGE });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...cookieBase(), maxAge: 0 });
}

export async function requestSession() {
  const token = await cookieToken();
  if (!token) return null;
  return openSession(token);
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Не удалось открыть данные отдела.";
  console.error(error);
  return Response.json({ error: message }, { status: 500 });
}
