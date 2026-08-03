import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./session";

// Vercel Password Protection handles the UI layer.
// Accepts either an ADMIN_SECRET header (direct API calls) or the browser's
// admin_session cookie (set on /admin/login, same as the middleware checks).
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const secret = req.headers.get("x-admin-secret");
  if (secret === process.env.ADMIN_SECRET) return null;

  const token = req.cookies.get("admin_session")?.value;
  if (token && await verifySessionToken(process.env.ADMIN_SECRET!, token)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
