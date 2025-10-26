import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "crypto";
import * as localStorage from "./storage-local";

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET_NAME;

export const s3 =
  region && bucket
    ? new S3Client({
        region,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
              }
            : undefined
      })
    : null;

const USE_LOCAL_STORAGE = !s3 && process.env.NODE_ENV === 'development';

export type PresignedUploadPayload = {
  url: string;
  fields: Record<string, string>;
  key: string;
  publicUrl: string;
};

export async function createPresignedUploadUrl(params: {
  userId: string;
  filename: string;
  contentType: string;
}) {
  // Use local storage in development if S3 is not configured
  if (USE_LOCAL_STORAGE) {
    console.log("[STORAGE] Using local file system storage (development mode)");
    return localStorage.createPresignedUploadUrl(params);
  }

  if (!s3 || !bucket) {
    throw new Error("S3 is not configured. Please set AWS credentials in .env.local");
  }

  const { userId, filename, contentType } = params;
  const key = `${userId}/${Date.now()}-${sanitizeFilename(filename)}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 });

  return {
    url: signedUrl,
    key,
    publicUrl: buildPublicUrl(key)
  };
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  // Use local storage in development if S3 is not configured
  if (USE_LOCAL_STORAGE) {
    return localStorage.getLocalFile(key);
  }

  if (!s3 || !bucket) {
    throw new Error("S3 is not configured");
  }
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  const response = await s3.send(command);
  const stream = response.Body;
  if (!stream) return Buffer.from("");
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function buildPublicUrl(key: string) {
  // Use local URLs in development if S3 is not configured
  if (USE_LOCAL_STORAGE) {
    return localStorage.buildPublicUrl(key);
  }

  const host = process.env.NEXT_PUBLIC_S3_PUBLIC_HOST;
  if (host?.startsWith("http")) {
    return `${host.replace(/\/$/, "")}/${key}`;
  }
  if (host) {
    return `https://${host.replace(/\/$/, "")}/${key}`;
  }
  if (!bucket || !region) return key;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}
