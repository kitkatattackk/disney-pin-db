import { NextResponse } from "next/server";
import {
  makeSession,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "@/lib/password-session";
// Best-effort per-instance throttling; the generated personal password is high entropy.
const attempts = new Map<string, { count: number; reset: number }>();
export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return NextResponse.json(
      { error: "Invalid login request." },
      { status: 403 },
    );
  const hash = process.env.PERSONAL_PASSWORD_HASH;
  const secret = process.env.PERSONAL_SESSION_SECRET;
  if (!hash || !secret)
    return NextResponse.json(
      { error: "Personal login is not configured." },
      { status: 503 },
    );
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  if (attempts.size > 2000)
    for (const [id, a] of attempts) if (a.reset < now) attempts.delete(id);
  let entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    entry = { count: 0, reset: now + 60000 };
    attempts.set(key, entry);
  }
  if (++entry.count > 10)
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  try {
    const { password } = await request.json();
    if (typeof password !== "string" || !passwordMatches(password, hash))
      return NextResponse.json(
        { error: "Incorrect password." },
        { status: 401 },
      );
    attempts.delete(key);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, makeSession(secret, hash), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to sign in." }, { status: 400 });
  }
}
