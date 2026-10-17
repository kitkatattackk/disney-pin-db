import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requestSession, validSession } from "./password-session";
export async function requireOwner(request: Request) {
  const secret = process.env.PERSONAL_SESSION_SECRET;
  const hash = process.env.PERSONAL_PASSWORD_HASH;
  if (!secret || !hash)
    return {
      response: NextResponse.json(
        { error: "Personal login is not configured." },
        { status: 503 },
      ),
    };
  if (!validSession(requestSession(request), secret, hash))
    return {
      response: NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 },
      ),
    };
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return {
    db,
    user: {
      id: "personal-owner",
      email: process.env.PERSONAL_OWNER_EMAIL || "Owner",
    },
  };
}
