import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  const topics = ["Stitch", "Mickey", "Haunted Mansion", "Star Wars", "Figment", "Tinker Bell"];
  const results = await Promise.all(topics.map((topic) => auth.db.from("pins")
    .select("id,name,release_year,price_tier,notes,pin_images!inner(storage_url,is_primary)")
    .like("notes", "Source: https://pinandpop.com/pins/%")
    .ilike("name", `%${topic}%`).order("id").limit(2)));
  if (results.some((r) => r.error)) return NextResponse.json({ error: "Unable to load demo pins." }, { status: 502 });
  const pins = [...new Map(results.flatMap((r) => r.data || []).map((pin) => [pin.id, pin])).values()];
  return NextResponse.json({ pins }, { headers: { "Cache-Control": "private, no-store" } });
}
