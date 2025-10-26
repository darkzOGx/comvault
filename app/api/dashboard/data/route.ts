import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserAnalytics } from "@/lib/analytics";

/**
 * Get all dashboard data for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);

    const [projects, files, analytics, notifications] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: user.id },
        include: {
          _count: { select: { files: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.file.findMany({
        where: { ownerId: user.id },
        select: {
          id: true,
          title: true,
          description: true,
          summary: true,
          category: true,
          type: true,
          storageUrl: true,
          storageKey: true,
          isPremium: true,
          price: true,
          currency: true,
          totalViews: true,
          totalPurchases: true,
          createdAt: true,
          project: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      getUserAnalytics(user.id),
      prisma.notification.findMany({
        where: { userId: user.id, readAt: null },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

    // Calculate categories
    const categoriesMap = new Map<string, number>();
    for (const file of files) {
      categoriesMap.set(file.category, (categoriesMap.get(file.category) ?? 0) + 1);
    }
    const categories = Array.from(categoriesMap.entries()).map(([name, count]) => ({
      name,
      count
    }));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name ?? "Creator",
        role: user.role
      },
      files: files.map((file) => ({
        id: file.id,
        title: file.title,
        description: file.description ?? "",
        summary: file.summary,
        category: file.category,
        type: file.type,
        storageUrl: file.storageUrl,
        storageKey: file.storageKey,
        isPremium: file.isPremium,
        price: Number(file.price),
        currency: file.currency,
        totalViews: file.totalViews,
        totalPurchases: file.totalPurchases,
        createdAt: file.createdAt.toISOString(),
        project: file.project
          ? {
              id: file.project.id,
              name: file.project.name
            }
          : null
      })),
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        summary: project.summary,
        count: project._count.files
      })),
      categories,
      analytics: {
        totals: analytics.totals,
        topViewed: analytics.topViewed,
        topSelling: analytics.topSelling,
        recentTransactions: analytics.recentTransactions
      },
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        payload: (notification.payload ?? {}) as Record<string, unknown>,
        createdAt: notification.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error("[API] Failed to fetch dashboard data", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
