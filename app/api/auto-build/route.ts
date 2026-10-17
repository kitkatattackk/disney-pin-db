import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import report from "@/lib/pinandpop-import.json";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  const { count, error } = await auth.db
    .from("pins")
    .select("id", { count: "exact", head: true })
    .like("notes", "Source: https://pinandpop.com/pins/%");
  if (error)
    return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(
    { ...report, pins: count ?? report.pins },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Imports run through the budget-capped importer. Refresh import status to see saved records.",
    },
    { status: 405 },
  );
}
