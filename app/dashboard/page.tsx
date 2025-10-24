import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserAnalytics } from "@/lib/analytics";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Whop session required</CardTitle>
            <CardDescription>
              Launch Community Vault from your Whop workspace so we can authenticate you and sync
              your content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you believe you are seeing this message in error, ensure that the Whop iframe is
              passing the user token to the app.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      include: {
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

  const categoriesMap = new Map<string, number>();
  for (const file of files) {
    categoriesMap.set(file.category, (categoriesMap.get(file.category) ?? 0) + 1);
  }
  const categories = Array.from(categoriesMap.entries()).map(([name, count]) => ({
    name,
    count
  }));

  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading dashboard…</div>}>
      <DashboardShell
        user={{
          id: user.id,
          name: user.name ?? "Creator",
          role: user.role
        }}
        files={files.map((file) => ({
          id: file.id,
          title: file.title,
          description: file.description,
          summary: file.summary,
          category: file.category,
          type: file.type,
          storageUrl: file.storageUrl,
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
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          summary: project.summary,
          count: project._count.files
        }))}
        categories={categories}
        analytics={{
          totals: analytics.totals,
          topViewed: analytics.topViewed,
          topSelling: analytics.topSelling,
          recentTransactions: analytics.recentTransactions
        }}
        notifications={notifications.map((notification) => ({
          id: notification.id,
          type: notification.type,
          payload: notification.payload,
          createdAt: notification.createdAt.toISOString()
        }))}
      />
    </Suspense>
  );
}
