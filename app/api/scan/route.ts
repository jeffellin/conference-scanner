import { NextRequest, NextResponse } from "next/server";
import { logScan, verifySponsorCode } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sponsorCode, attendeeId, notes } = await req.json();
    if (!sponsorCode || !attendeeId) {
      return NextResponse.json({ error: "sponsorCode and attendeeId are required." }, { status: 400 });
    }

    const sponsor = await verifySponsorCode(sponsorCode);
    if (!sponsor) return NextResponse.json({ error: "Invalid or inactive sponsor code." }, { status: 401 });

    await logScan(sponsorCode, attendeeId, notes ?? "");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
