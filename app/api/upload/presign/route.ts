import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createPresignedUploadUrl } from "@/lib/storage";

const payloadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireUser(request);
  const json = await request.json();
  const parsed = payloadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    const presigned = await createPresignedUploadUrl({
      userId: user.id,
      filename: parsed.data.filename,
      contentType: parsed.data.contentType
    });

    return NextResponse.json(presigned);
  } catch (error) {
    console.error("Presign upload failed", error);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
