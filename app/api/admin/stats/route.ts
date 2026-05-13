import { NextResponse } from "next/server";
import { getScanStats } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await getScanStats());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
