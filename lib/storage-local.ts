import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createHash } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export type PresignedUploadPayload = {
  url: string;
  fields?: Record<string, string>;
  key: string;
  publicUrl: string;
};

/**
 * Local file system storage for development
 * This is a fallback when S3 is not configured
 */

export async function createPresignedUploadUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
}): Promise<PresignedUploadPayload> {
  const { userId, filename } = params;
  const key = `${userId}/${Date.now()}-${sanitizeFilename(filename)}`;

  // Create upload directory if it doesn't exist
  const userDir = join(UPLOAD_DIR, userId);
  if (!existsSync(userDir)) {
    await mkdir(userDir, { recursive: true });
  }

  // For local storage, we return a special URL that the client will recognize
  // The actual upload will happen via a different endpoint
  const uploadUrl = `/api/upload/local`;
  const publicUrl = `/uploads/${key}`;

  return {
    url: uploadUrl,
    fields: { key }, // Pass the key so the upload endpoint knows where to save
    key,
    publicUrl
  };
}

export async function saveLocalFile(params: {
  key: string;
  buffer: Buffer;
}): Promise<void> {
  const { key, buffer } = params;
  const filePath = join(UPLOAD_DIR, key);

  // Ensure directory exists
  const dir = join(UPLOAD_DIR, key.split("/")[0]);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(filePath, buffer);
}

export async function getLocalFile(key: string): Promise<Buffer> {
  const filePath = join(UPLOAD_DIR, key);
  return await readFile(filePath);
}

export function buildPublicUrl(key: string): string {
  return `/uploads/${key}`;
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
