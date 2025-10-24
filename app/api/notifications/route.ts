import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireUser(request);
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  const { notificationId } = await request.json();

  if (!notificationId) {
    return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
  }

  await prisma.notification.update({
    where: { id: notificationId, userId: user.id },
    data: {
      readAt: new Date()
    }
  });

  return NextResponse.json({ success: true });
}
