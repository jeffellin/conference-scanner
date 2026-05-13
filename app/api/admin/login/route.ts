import { NextRequest, NextResponse } from "next/server";
import { createSessionToken } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!password || password !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }
  const token = await createSessionToken(process.env.ADMIN_SECRET!);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
