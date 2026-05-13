import { NextRequest, NextResponse } from "next/server";
import { verifySponsorCode } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Code is required." }, { status: 400 });

    const sponsor = await verifySponsorCode(code);
    if (!sponsor) return NextResponse.json({ error: "Invalid or inactive sponsor code." }, { status: 401 });

    return NextResponse.json(sponsor);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
