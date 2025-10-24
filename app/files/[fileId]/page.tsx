import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileViewer } from "@/components/file/file-viewer";

export default async function FilePage({ params }: { params: { fileId: string } }) {
  const user = await getCurrentUser();
  const file = await prisma.file.findUnique({
    where: { id: params.fileId },
    include: {
      owner: { select: { id: true, name: true } }
    }
  });

  if (!file) {
    notFound();
  }

  const isOwner = user?.id === file.ownerId;
  let canAccess = !file.isPremium || isOwner;

  if (!canAccess && user) {
    const purchase = await prisma.transaction.findFirst({
      where: {
        fileId: file.id,
        purchaserId: user.id
      }
    });
    canAccess = Boolean(purchase);
  }

  const viewerFile = {
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
    totalPurchases: file.totalPurchases
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{file.title}</CardTitle>
          <CardDescription>
            Published by {file.owner.name ?? "a creator"}. {file.isPremium ? "Premium content" : "Free access"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileViewer file={viewerFile} canAccess={canAccess} />
        </CardContent>
      </Card>
    </div>
  );
}
