import { NextResponse } from "next/server";
import { z } from "zod";
import { FileType } from "@prisma/client";
import pdfParse from "pdf-parse";
import { requireUser } from "@/lib/auth/session";
import { buildEmbeddingVector, summarizeContent, summarizeProject, transcribeAudioBuffer } from "@/lib/ai";
import { buildPublicUrl, getObjectBuffer, hashBuffer } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { upsertDocumentEmbedding } from "@/lib/vector-store";
import { notifyNewContent } from "@/lib/notifications";

const payloadSchema = z.object({
  key: z.string().min(1),
  filename: z.string().min(1),
  title: z.string().min(2),
  description: z.string().min(10),
  category: z.string().min(2),
  type: z.nativeEnum(FileType),
  projectId: z.string().optional(),
  isPremium: z.boolean().default(false),
  price: z.number().min(0).default(0),
  currency: z.string().default("USD"),
  originalContentType: z.string().optional()
});

export async function POST(request: Request) {
  const user = await requireUser(request);
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.isPremium && data.price <= 0) {
    return NextResponse.json(
      { error: "Premium files must include a price greater than 0." },
      { status: 400 }
    );
  }

  try {
    const objectBuffer = await getObjectBuffer(data.key);
    const checksum = hashBuffer(objectBuffer);

    const existing = await prisma.file.findFirst({
      where: {
        ownerId: user.id,
        checksum
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: "This file already exists in your vault.", fileId: existing.id },
        { status: 409 }
      );
    }

    const contentText = await extractTextFromBuffer(objectBuffer, data);

    const summary = await summarizeContent(contentText, {
      title: data.title,
      fileType: data.type
    });

    const embedding = await buildEmbeddingVector(
      [
        data.title,
        data.description,
        summary.summary,
        summary.keyPoints.join("\n"),
        contentText.slice(0, 2000)
      ].join("\n\n")
    );

    const file = await prisma.file.create({
      data: {
        ownerId: user.id,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        category: data.category,
        type: data.type,
        storageKey: data.key,
        storageUrl: buildPublicUrl(data.key),
        summary: summary.summary,
        transcript: data.type === FileType.VIDEO ? contentText : null,
        isPremium: data.isPremium,
        price: data.price,
        currency: data.currency,
        totalViews: 0,
        checksum
      }
    });

    await upsertDocumentEmbedding({
      userId: user.id,
      fileId: file.id,
      embedding,
      content: contentText,
      metadata: {
        title: file.title,
        category: file.category,
        summary: file.summary,
        type: file.type
      }
    });

    if (data.projectId) {
      const projectFiles = await prisma.file.findMany({
        where: { projectId: data.projectId },
        select: {
          title: true,
          summary: true
        }
      });

      const projectSummary = await summarizeProject(
        projectFiles.map((item) => ({
          title: item.title,
          summary: item.summary ?? ""
        }))
      );

      await prisma.project.update({
        where: { id: data.projectId },
        data: {
          summary: projectSummary.summary
        }
      });
    }

    await propagateNewContentNotification({
      ownerId: user.id,
      file
    });

    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    console.error("Failed to finalize upload", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}

async function extractTextFromBuffer(
  buffer: Buffer,
  file: {
    type: FileType;
    filename: string;
    originalContentType?: string;
  }
) {
  switch (file.type) {
    case FileType.PDF: {
      const parsed = await pdfParse(buffer);
      return parsed.text;
    }
    case FileType.TEXT: {
      return buffer.toString("utf-8");
    }
    case FileType.VIDEO: {
      const transcript = await transcribeAudioBuffer(
        buffer,
        file.filename ?? `video-${Date.now()}.mp4`
      );
      return transcript;
    }
    default:
      return buffer.toString("utf-8");
  }
}

async function propagateNewContentNotification({
  ownerId,
  file
}: {
  ownerId: string;
  file: {
    id: string;
    title: string;
    category: string;
  };
}) {
  const subscribers = await prisma.user.findMany({
    where: {
      NOT: { id: ownerId },
      role: {
        in: ["VIEWER", "CREATOR"]
      }
    },
    select: { id: true, name: true }
  });

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { name: true }
  });

  await Promise.all(
    subscribers.map((subscriber) =>
      notifyNewContent({
        subscriberId: subscriber.id,
        fileTitle: file.title,
        category: file.category,
        creatorName: owner?.name ?? "A creator you follow"
      })
    )
  );
}
