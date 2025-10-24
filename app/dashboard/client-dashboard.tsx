"use client";

import { useEffect, useState } from "react";
import { useWhopBridge } from "@/components/whop-bridge-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientDashboard() {
  const { sdk, ready } = useWhopBridge();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      if (!ready) return;

      try {
        if (!sdk) throw new Error("Whop SDK not initialized");

        // Get user from Whop using the SDK
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (sdk as any).request({
          event: "get_user_info",
          request: {}
        });

        if (!result?.id) throw new Error("No Whop user found");

        const response = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: result.id,
            username: result.username || null,
            email: result.email || null
          })
        });

        if (!response.ok) throw new Error("Authentication failed");

        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, [sdk, ready]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Connecting to Whop...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Whop Authentication</CardTitle>
          <CardDescription>{error || "Initializing..."}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please access Community Vault through your Whop workspace.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
