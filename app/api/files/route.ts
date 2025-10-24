import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await requireUser(request);
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("q") ?? undefined;

  const files = await prisma.file.findMany({
    where: {
      ownerId: user.id,
      projectId: projectId || undefined,
      category: category || undefined,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { summary: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: { id: true, name: true }
      }
    }
  });

  return NextResponse.json(files);
}
