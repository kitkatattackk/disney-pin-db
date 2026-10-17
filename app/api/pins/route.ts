import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Invalid pin." }, { status: 400 });
  const { data, error } = await auth.db
    .from("pins")
    .select("*,pin_images(storage_url,is_primary)")
    .eq("id", id)
    .like("notes", "Source: https://pinandpop.com/pins/%")
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Unable to load this pin." },
      { status: 502 },
    );
  if (!data)
    return NextResponse.json({ error: "Pin not found." }, { status: 404 });
  const query = new URLSearchParams({
    _nkw: `${data.name} Disney pin`,
    LH_Sold: "1",
    LH_Complete: "1",
    _sop: "13",
  });
  return NextResponse.json({
    pin: data,
    ebaySoldUrl: `https://www.ebay.com/sch/i.html?${query}`,
    sales: [],
    salesStatus: "external_search_only",
  });
}
