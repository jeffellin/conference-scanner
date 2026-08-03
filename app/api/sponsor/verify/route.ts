import { NextRequest, NextResponse } from "next/server";
import { verifySponsorCode } from "@/lib/db";

// Neon's driver queries over fetch(); without this, Next's Data Cache can
// silently cache and replay stale DB reads.
export const dynamic = "force-dynamic";

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
