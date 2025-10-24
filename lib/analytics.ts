import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export type FileAnalytics = {
  id: string;
  title: string;
  views: number;
  purchases: number;
  revenue: number;
};

export async function getUserAnalytics(userId: string) {
  const [files, transactions, views] = await Promise.all([
    prisma.file.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        title: true,
        totalViews: true,
        totalPurchases: true,
        price: true
      }
    }),
    prisma.transaction.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        amount: true,
        currency: true,
        createdAt: true,
        fileId: true
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.fileView.groupBy({
      where: { file: { ownerId: userId } },
      by: ["fileId"],
      _count: {
        fileId: true
      }
    })
  ]);

  const revenueByFile = new Map<string, number>();
  for (const tx of transactions) {
    revenueByFile.set(tx.fileId, (revenueByFile.get(tx.fileId) ?? 0) + Number(tx.amount));
  }

  const viewsByFile = new Map<string, number>();
  for (const view of views) {
    viewsByFile.set(view.fileId, view._count.fileId);
  }

  const fileAnalytics: FileAnalytics[] = files.map((file) => ({
    id: file.id,
    title: file.title,
    views: viewsByFile.get(file.id) ?? file.totalViews,
    purchases: file.totalPurchases,
    revenue: revenueByFile.get(file.id) ?? Number(file.price) * file.totalPurchases
  }));

  const totalRevenue = fileAnalytics.reduce((acc, item) => acc + item.revenue, 0);
  const totalViews = fileAnalytics.reduce((acc, item) => acc + item.views, 0);

  const recentTransactions = transactions.map((tx) => ({
    id: tx.id,
    amount: Number(tx.amount),
    currency: tx.currency,
    createdAtLabel: format(tx.createdAt, "MMM d, yyyy"),
    fileId: tx.fileId
  }));

  const topViewed = [...fileAnalytics].sort((a, b) => b.views - a.views).slice(0, 5);
  const topSelling = [...fileAnalytics].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return {
    totals: {
      revenue: totalRevenue,
      views: totalViews,
      files: files.length
    },
    fileAnalytics,
    topViewed,
    topSelling,
    recentTransactions
  };
}
