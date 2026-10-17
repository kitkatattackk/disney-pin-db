import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  try {
    const { pinName, page = 0 } = await request.json();
    if (
      typeof pinName !== "string" ||
      pinName.length > 200 ||
      !Number.isInteger(page) ||
      page < 0 ||
      page > 5000
    ) {
      return NextResponse.json(
        { error: "Enter a search under 200 characters and a valid page." },
        { status: 400 },
      );
    }
    let query = auth.db
      .from("pins")
      .select(
        "id,name,release_year,price_tier,notes,pin_images(storage_url,is_primary)",
        { count: "exact" },
      )
      .like("notes", "Source: https://pinandpop.com/pins/%");
    if (pinName.trim())
      query = query.ilike(
        "name",
        `%${pinName.trim().replace(/[\\%_]/g, "\\$&")}%`,
      );
    const { data, count, error } = await query
      .order("name")
      .order("id")
      .range(page * 48, page * 48 + 47);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ pins: data, count, page });
  } catch {
    return NextResponse.json(
      { error: "Unable to search saved pins." },
      { status: 500 },
    );
  }
}
