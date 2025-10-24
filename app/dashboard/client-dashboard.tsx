"use client";

import { useEffect, useState } from "react";
import { useWhopBridge } from "@/components/whop-bridge-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhopIframeSdk } from "@whop/iframe";

type WhopTopLevelUrlData = Awaited<ReturnType<WhopIframeSdk["getTopLevelUrlData"]>>;

export function ClientDashboard() {
  const { sdk, ready } = useWhopBridge();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Connecting to Whop...");
  const [error, setError] = useState<string | null>(null);
  const [whopContext, setWhopContext] = useState<WhopTopLevelUrlData | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function authenticateUser() {
      try {
        if (!sdk) throw new Error("Whop SDK not initialized");

        // Step 1: Verify iframe connection
        setStatus("Pinging Whop workspace...");
        const pong = await sdk.ping("ping");
        if (pong !== "pong") {
          throw new Error("Unexpected ping response from Whop host");
        }

        // Step 2: Get context data
        const context = await sdk.getTopLevelUrlData({});
        if (!cancelled) {
          setWhopContext(context);
          setStatus("Connected to Whop. Retrieving user information...");
        }

        // Step 3: Get user data from Whop
        setStatus("Authenticating with Whop...");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whopUser = await (sdk as any).getUser();

        if (!whopUser?.id) {
          throw new Error("No user data received from Whop");
        }

        // Step 4: Authenticate with backend
        setStatus("Creating session...");
        const response = await fetch("/api/auth/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: whopUser.id,
            username: whopUser.username || null,
            email: whopUser.email || null
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Authentication failed");
        }

        // Step 5: Reload to update session
        if (!cancelled) {
          setStatus("Authentication successful! Redirecting...");
          window.location.href = "/dashboard";
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[ClientDashboard] Authentication error:", err);
          setError(err instanceof Error ? err.message : "Failed to authenticate with Whop");
          setStatus("Authentication failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    authenticateUser();

    return () => {
      cancelled = true;
    };
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
          <CardDescription>{error || status}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please access Community Vault through your Whop workspace. If you are already inside Whop,
            refresh the page to retry the authentication handshake.
          </p>
          {whopContext ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Experience route: <span className="font-medium">{whopContext.experienceRoute}</span> (
              {whopContext.viewType})
            </p>
          ) : null}
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
