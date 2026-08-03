import { NextRequest, NextResponse } from "next/server";
import { getSponsorCodes, createSponsorCode, toggleSponsorCode, deleteSponsorCode } from "@/lib/db";

// Neon's driver queries over fetch(); without this, Next's Data Cache can
// silently cache and replay stale DB reads.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSponsorCodes());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, company, tier } = await req.json();
    if (!code || !company) return NextResponse.json({ error: "code and company are required." }, { status: 400 });
    await createSponsorCode(code, company, tier ?? "Standard");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.message?.includes("unique") || err?.code === "23505") {
      return NextResponse.json({ error: "That code already exists." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { code, active } = await req.json();
    if (!code) return NextResponse.json({ error: "code is required." }, { status: 400 });
    await toggleSponsorCode(code, active);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code param required." }, { status: 400 });
    await deleteSponsorCode(code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
