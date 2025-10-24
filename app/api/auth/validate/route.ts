import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const { userId, username, email } = await request.json();
    console.log("[Auth API] Auth request:", { userId, username, email });

    if (!userId) {
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    const user = await prisma.user.upsert({
      where: { whopUserId: userId },
      create: {
        whopUserId: userId,
        name: username || email || "User",
        email: email || null,
        role: UserRole.VIEWER
      },
      update: {
        name: username || email || undefined,
        email: email || undefined
      }
    });

    cookies().set("comvault_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      path: "/"
    });

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error("[Auth API] Failed:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
