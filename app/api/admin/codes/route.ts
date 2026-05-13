import { NextRequest, NextResponse } from "next/server";
import { getSponsorCodes, createSponsorCode, toggleSponsorCode, deleteSponsorCode } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    return NextResponse.json(await getSponsorCodes());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
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
  const denied = requireAdmin(req);
  if (denied) return denied;
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
  const denied = requireAdmin(req);
  if (denied) return denied;
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
