import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Use the personal password login. Email links are no longer required.",
    },
    { status: 410 },
  );
}
