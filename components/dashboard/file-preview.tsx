"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import { describeSplit } from "@/lib/payouts";
import { Lock, Unlock, ExternalLink } from "lucide-react";

type PreviewFile = {
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

export function FilePreview({
  file,
  onCheckout,
  loading,
  canAccess = true
}: {
  file: PreviewFile;
  onCheckout: (file: PreviewFile) => void;
  loading: boolean;
  canAccess?: boolean;
}) {
  const premiumBadge = file.isPremium ? (
    <Badge variant="default" className="gap-1">
      <Lock className="h-3 w-3" />
      Premium
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <Unlock className="h-3 w-3" />
      Free
    </Badge>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          {premiumBadge}
          <Badge variant="outline">{file.type}</Badge>
          <Badge variant="outline">{file.category}</Badge>
        </div>
        <h2 className="text-xl font-semibold">{file.title}</h2>
        <p className="text-sm text-muted-foreground">{file.description}</p>
      </header>

      <div className="flex-1 overflow-hidden rounded-lg border border-border">
        {canAccess ? (
          <PreviewContent file={file} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/20 text-center">
            <Lock className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">Unlock this guide to view the full content.</p>
            <p className="text-xs text-muted-foreground">You can still read the summary below.</p>
          </div>
        )}
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Monetization</p>
          <p className="text-xs text-muted-foreground">
            {file.isPremium ? "Members must purchase to unlock" : "Open to all members"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Price</p>
            <p className="text-lg font-semibold">
              {file.isPremium ? formatCurrency(file.price, file.currency) : "Free"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Conversions</p>
            <p className="text-lg font-semibold">{file.totalPurchases}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Views</p>
            <p className="text-lg font-semibold">{file.totalViews}</p>
          </div>
        </div>

        {file.isPremium && (
          <p className="text-xs text-muted-foreground">{describeSplit(file.price, file.currency)}</p>
        )}

        {file.isPremium && (
          <Button
            className="w-full"
            disabled={loading || (!canAccess && loading)}
            onClick={() => onCheckout(file)}
          >
            <Lock className="mr-2 h-4 w-4" />
            Open checkout
          </Button>
        )}

        {canAccess && (
          <Button variant="outline" asChild className="w-full">
            <a href={file.storageUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open original file
            </a>
          </Button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">AI Summary</h3>
        <ScrollArea className="max-h-40 rounded-lg border border-border p-3 text-sm">
          {file.summary ?? "Summary will appear after processing completes."}
        </ScrollArea>
      </section>
    </div>
  );
}

function PreviewContent({ file }: { file: PreviewFile }) {
  if (file.type === "PDF") {
    return (
      <iframe
        src={`${file.storageUrl}#toolbar=0`}
        className="h-full w-full"
        title={`PDF preview for ${file.title}`}
      />
    );
  }

  if (file.type === "VIDEO") {
    return (
      <video controls className="h-full w-full rounded-lg bg-black object-cover">
        <source src={file.storageUrl} />
        Your browser does not support playback.
      </video>
    );
  }

  return <TextPreview url={file.storageUrl} />;
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string>("Loading preview…");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to load text content");
        }
        const text = await response.text();
        if (!isMounted) return;
        setContent(text.slice(0, 4000));
      } catch (error) {
        console.error("Text preview error", error);
        if (isMounted) setContent("Unable to preview text. Download to view full content.");
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <ScrollArea className="h-full">
      <pre className="whitespace-pre-wrap p-4 text-sm">{content}</pre>
    </ScrollArea>
  );
}
