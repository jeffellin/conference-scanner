import { NextRequest, NextResponse } from "next/server";
import { updateScanNotes, verifySponsorCode } from "@/lib/db";

// Neon's driver queries over fetch(); without this, Next's Data Cache can
// silently cache and replay stale DB reads.
export const dynamic = "force-dynamic";

// Edits an existing scan log's notes in place. Distinct from POST /api/scan,
// which always inserts a new row for a fresh scan.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { sponsorCode, notes } = await req.json();
    if (!sponsorCode) return NextResponse.json({ error: "sponsorCode is required." }, { status: 400 });

    const sponsor = await verifySponsorCode(sponsorCode);
    if (!sponsor) return NextResponse.json({ error: "Invalid or inactive sponsor code." }, { status: 401 });

    const updated = await updateScanNotes(params.id, sponsorCode, notes ?? "");
    if (!updated) return NextResponse.json({ error: "Scan not found." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
