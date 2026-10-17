import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  return NextResponse.json(
    { user: auth.user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
