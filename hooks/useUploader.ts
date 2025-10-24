"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { FileType } from "@prisma/client";
import { useToast } from "@/components/ui/use-toast";

type UploadPayload = {
  title: string;
  description: string;
  category: string;
  projectId?: string;
  isPremium: boolean;
  price: number;
};

function resolveFileType(file: File): FileType {
  if (file.type.includes("pdf")) return FileType.PDF;
  if (file.type.startsWith("video")) return FileType.VIDEO;
  return FileType.TEXT;
}

async function uploadToPresignedUrl(url: string, file: File) {
  await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type
    },
    body: file
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to upload file: ${res.statusText}`);
    }
  });
}

export function useUploader() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<"idle" | "uploading" | "processing">("idle");

  const mutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: UploadPayload }) => {
      setProgress("uploading");
      const presign = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type
        })
      }).then((res) => res.json());

      if (!presign?.url || !presign?.key) {
        throw new Error("Unable to create upload URL");
      }

      await uploadToPresignedUrl(presign.url, file);

      setProgress("processing");

      const response = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: presign.key,
          filename: file.name,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          projectId: metadata.projectId,
          isPremium: metadata.isPremium,
          price: metadata.price,
          type: resolveFileType(file),
          originalContentType: file.type
        })
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Failed to process upload");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Upload complete",
        description: "Your content is ready to share."
      });
      setProgress("idle");
    },
    onError: (error: unknown) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive"
      });
      setProgress("idle");
    }
  });

  return {
    ...mutation,
    progress
  };
}
