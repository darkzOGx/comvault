import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional()
});

export async function GET(request: Request) {
  const user = await requireUser(request);
  const projects = await prisma.project.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: { files: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category
    }
  });

  return NextResponse.json(project, { status: 201 });
}
