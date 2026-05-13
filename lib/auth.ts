import { NextRequest, NextResponse } from "next/server";

// Vercel Password Protection handles the UI layer.
// This validates an ADMIN_SECRET header for direct API calls.
export function requireAdmin(req: NextRequest): NextResponse | null {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
