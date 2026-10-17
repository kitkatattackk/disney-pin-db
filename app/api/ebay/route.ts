import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { ebayLinks, ebayMarket } from "@/lib/ebay";
export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid pin." }, { status: 400 });
  const { data, error } = await auth.db.from("pins").select("name").eq("id", id).like("notes", "Source: https://pinandpop.com/pins/%").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load pin." }, { status: 502 });
  if (!data) return NextResponse.json({ error: "Pin not found." }, { status: 404 });
  return NextResponse.json({ ...await ebayMarket(data.name), ...ebayLinks(data.name) }, { headers: { "Cache-Control": "private, no-store" } });
}
