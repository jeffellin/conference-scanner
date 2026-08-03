import { NextRequest, NextResponse } from "next/server";
import { getScansForCode, verifySponsorCode } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Neon's driver queries over fetch(); without this, Next's Data Cache can
// silently cache and replay stale DB reads.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  // Allow either admin secret OR the matching sponsor code
  const adminCheck = await requireAdmin(req);
  const sponsorCode = req.headers.get("x-sponsor-code");

  if (adminCheck !== null) {
    // Not admin — check if it's the sponsor themselves
    if (!sponsorCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sponsor = await verifySponsorCode(params.code);
    if (!sponsor || sponsor.code !== sponsorCode) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const leads = await getScansForCode(params.code);
    return NextResponse.json({ leads }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
