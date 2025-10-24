import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().optional()
});

export async function GET(
  request: Request,
  {
    params
  }: {
    params: { projectId: string };
  }
) {
  const user = await requireUser(request);
  const project = await prisma.project.findFirst({
    where: {
      id: params.projectId,
      ownerId: user.id
    },
    include: {
      files: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  request: Request,
  {
    params
  }: {
    params: { projectId: string };
  }
) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: parsed.data
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  {
    params
  }: {
    params: { projectId: string };
  }
) {
  const user = await requireUser(request);
  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: project.id } });
  return NextResponse.json({ success: true });
}
