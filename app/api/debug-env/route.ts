import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.ADMIN_SECRET;
  return NextResponse.json({
    ADMIN_SECRET_set: !!secret,
    ADMIN_SECRET_length: secret?.length ?? 0,
    ADMIN_SECRET_trimmed_length: secret?.trim().length ?? 0,
  });
}
