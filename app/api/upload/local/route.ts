import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { saveLocalFile } from "@/lib/storage-local";

/**
 * Local file upload endpoint for development
 * Only used when S3 is not configured
 */

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const key = formData.get("key") as string | null;

    if (!file || !key) {
      return NextResponse.json(
        { error: "Missing file or key" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to local file system
    await saveLocalFile({ key, buffer });

    return NextResponse.json({
      success: true,
      key,
      publicUrl: `/uploads/${key}`
    });
  } catch (error) {
    console.error("Local upload failed", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
