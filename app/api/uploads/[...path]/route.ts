import { NextResponse } from "next/server";
import { getLocalFile } from "@/lib/storage-local";

/**
 * Serve uploaded files from local storage
 * Only used in development when S3 is not configured
 */

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const key = params.path.join("/");
    const buffer = await getLocalFile(key);

    // Determine content type from file extension
    const ext = key.split(".").pop()?.toLowerCase() || "";
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      txt: "text/plain",
      json: "application/json",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
    };

    const contentType = contentTypeMap[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to serve file", error);
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  }
}
