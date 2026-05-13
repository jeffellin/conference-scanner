import { NextRequest, NextResponse } from "next/server";
import { upsertAttendees, generateShortId } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const { csv } = await req.json();
    if (!csv) return NextResponse.json({ error: "No CSV data provided." }, { status: 400 });

    const lines = (csv as string).trim().split("\n");
    if (lines.length < 2) return NextResponse.json({ error: "CSV must have a header row and at least one data row." }, { status: 400 });

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));

    const attendees = lines.slice(1).map((line: string) => {
      const vals = line.split(",").map((v: string) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h: string, i: number) => { row[h] = vals[i] ?? ""; });
      return {
        id: generateShortId(),
        name: row.name ?? row.fullname ?? "",
        company: row.company ?? row.organization ?? row.org ?? "",
        email: row.email ?? "",
        phone: row.phone ?? row.phonenumber ?? row.mobile ?? "",
      };
    }).filter((a: { name: string }) => a.name.length > 0);

    if (attendees.length === 0) {
      return NextResponse.json({ error: "No valid attendee rows found. Check CSV format." }, { status: 400 });
    }

    await upsertAttendees(attendees);
    return NextResponse.json({ count: attendees.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error during import." }, { status: 500 });
  }
}
