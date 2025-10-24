import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { removeDocumentEmbedding, upsertDocumentEmbedding } from "@/lib/vector-store";
import { buildEmbeddingVector } from "@/lib/ai";
import { getObjectBuffer } from "@/lib/storage";
import pdfParse from "pdf-parse";
import { FileType } from "@prisma/client";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  category: z.string().min(2).optional(),
  isPremium: z.boolean().optional(),
  price: z.number().min(0).optional()
});

export async function GET(
  request: Request,
  {
    params
  }: {
    params: { fileId: string };
  }
) {
  const user = await requireUser(request);
  const file = await prisma.file.findUnique({
    where: { id: params.fileId },
    include: {
      owner: {
        select: { id: true, name: true }
      }
    }
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const isOwner = file.ownerId === user.id;
  let hasPurchased = false;

  if (!isOwner && file.isPremium) {
    const purchase = await prisma.transaction.findFirst({
      where: {
        fileId: file.id,
        purchaserId: user.id
      }
    });
    hasPurchased = Boolean(purchase);
  }

  await prisma.file.update({
    where: { id: file.id },
    data: {
      totalViews: { increment: 1 },
      views: {
        create: {
          viewerId: user.id
        }
      }
    }
  });

  if (isOwner || !file.isPremium || hasPurchased) {
    return NextResponse.json({
      ...file,
      canAccess: true
    });
  }

  return NextResponse.json({
    id: file.id,
    title: file.title,
    description: file.description,
    summary: file.summary,
    category: file.category,
    type: file.type,
    isPremium: file.isPremium,
    price: file.price,
    canAccess: false
  });
}

export async function PATCH(
  request: Request,
  {
    params
  }: {
    params: { fileId: string };
  }
) {
  const user = await requireUser(request);
  const json = await request.json();
  const parsed = updateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const file = await prisma.file.findUnique({ where: { id: params.fileId } });
  if (!file || file.ownerId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updated = await prisma.file.update({
    where: { id: file.id },
    data: parsed.data
  });

  await refreshEmbedding(updated);

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  {
    params
  }: {
    params: { fileId: string };
  }
) {
  const user = await requireUser(request);
  const file = await prisma.file.findUnique({ where: { id: params.fileId } });
  if (!file || file.ownerId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.file.delete({ where: { id: file.id } });
  await removeDocumentEmbedding(user.id, file.id);

  return NextResponse.json({ success: true });
}

async function refreshEmbedding(file: {
  id: string;
  ownerId: string;
  storageKey: string;
  title: string;
  description: string;
  summary: string | null;
  category: string;
  type: FileType;
}) {
  const buffer = await getObjectBuffer(file.storageKey);
  const text =
    file.type === FileType.TEXT
      ? buffer.toString("utf-8")
      : file.type === FileType.PDF
        ? (await pdfParse(buffer)).text
        : file.summary ?? "";

  const combined = [file.title, file.description, file.summary ?? "", text.slice(0, 2000)]
    .filter(Boolean)
    .join("\n\n");

  const embedding = await buildEmbeddingVector(combined);
  await upsertDocumentEmbedding({
    userId: file.ownerId,
    fileId: file.id,
    embedding,
    content: text,
    metadata: {
      title: file.title,
      category: file.category,
      summary: file.summary,
      type: file.type
    }
  });
}
