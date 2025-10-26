"use client";

import { useWhopBridge } from "@/components/whop-bridge-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientDashboard() {
  const { sdk, ready } = useWhopBridge();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Community Vault</CardTitle>
          <CardDescription>
            {ready ? "Authentication Required" : "Initializing..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ready && !sdk ? (
            <>
              <p className="text-sm text-muted-foreground">
                Please access Community Vault through your Whop workspace.
              </p>
              <p className="text-xs text-muted-foreground">
                If you&apos;re already inside Whop, this app may not have the necessary permissions.
                Contact support if this issue persists.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 rounded-md bg-yellow-100 dark:bg-yellow-900/20 p-3 border border-yellow-300 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Development Mode:</strong> A fallback test user has been configured.
                    Refresh the page to continue.
                  </p>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Refresh Page
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
