import { NextRequest, NextResponse } from "next/server";
import { getAllAttendees, deleteAllAttendees } from "@/lib/db";

// GET /api/admin/attendees
export async function GET(_req: NextRequest) {
  try {
    const attendees = await getAllAttendees();
    return NextResponse.json(attendees);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST /api/admin/import  (same file, but we'll split — see import/route.ts)
// DELETE /api/admin/attendees
export async function DELETE(_req: NextRequest) {
  try {
    await deleteAllAttendees();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
