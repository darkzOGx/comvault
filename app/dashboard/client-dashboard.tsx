"use client";

import { useEffect, useState } from "react";
import { useWhopBridge } from "@/components/whop-bridge-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const RETRY_KEY = "whop_auth_retry_count";
const MAX_RETRIES = 2;

export function ClientDashboard() {
  const { sdk, ready, error: sdkError } = useWhopBridge();
  const [retryCount, setRetryCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = sessionStorage.getItem(RETRY_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  useEffect(() => {
    if (!ready || !sdk) return;

    // Check if we've already tried too many times
    if (retryCount >= MAX_RETRIES) {
      return;
    }

    // If we have the SDK but still seeing ClientDashboard,
    // it means server-side auth hasn't picked up yet
    // Increment retry count and reload
    const timer = setTimeout(() => {
      const nextCount = retryCount + 1;
      sessionStorage.setItem(RETRY_KEY, String(nextCount));
      setRetryCount(nextCount);
      window.location.reload();
    }, 2000);

    return () => clearTimeout(timer);
  }, [sdk, ready, retryCount]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Community Vault</CardTitle>
          <CardDescription>
            {ready && sdk
              ? retryCount < 2
                ? "Connecting to Whop..."
                : "Authentication Required"
              : "Initializing..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sdkError || retryCount >= 2 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Please access Community Vault through your Whop workspace.
              </p>
              <p className="text-xs text-muted-foreground">
                If you&apos;re already inside Whop, this app may not have the necessary permissions.
                Contact support if this issue persists.
              </p>
              <button
                onClick={() => {
                  sessionStorage.removeItem(RETRY_KEY);
                  setRetryCount(0);
                  window.location.reload();
                }}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Retry Connection
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
