"use client";

import { useState } from "react";
import { FilePreview } from "@/components/dashboard/file-preview";

export type ViewerFile = {
  id: string;
  title: string;
  description: string;
  summary: string | null;
  category: string;
  type: string;
  storageUrl: string;
  isPremium: boolean;
  price: number;
  currency: string;
  totalViews: number;
  totalPurchases: number;
};

type FileViewerProps = {
  file: ViewerFile;
  canAccess: boolean;
};

export function FileViewer({ file, canAccess }: FileViewerProps) {
  const [loading, setLoading] = useState(false);

  async function checkout(target: ViewerFile) {
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: target.id })
      });
      const payload = await response.json();
      if (payload?.url) {
        window.location.href = payload.url as string;
      }
    } catch (error) {
      console.error("Failed to start checkout", error);
    } finally {
      setLoading(false);
    }
  }

  return <FilePreview file={file} onCheckout={checkout} loading={loading} canAccess={canAccess} />;
}
