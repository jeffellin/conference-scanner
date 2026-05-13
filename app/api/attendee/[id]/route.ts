import { NextRequest, NextResponse } from "next/server";
import { getAttendeeById, verifySponsorCode } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require a valid sponsor code on every lookup
    const code = req.headers.get("x-sponsor-code");
    if (!code) return NextResponse.json({ error: "Sponsor code required." }, { status: 401 });

    const sponsor = await verifySponsorCode(code);
    if (!sponsor) return NextResponse.json({ error: "Invalid or inactive sponsor code." }, { status: 401 });

    const attendee = await getAttendeeById(params.id);
    if (!attendee) return NextResponse.json({ error: "Attendee not found." }, { status: 404 });

    return NextResponse.json(attendee);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
