"use client";

import { useEffect, useState } from "react";
import { useWhopBridge } from "@/components/whop-bridge-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardData = {
  user: {
    id: string;
    name: string;
    role: string;
  };
  files: Array<{
    id: string;
    title: string;
    description: string | null;
    summary: string | null;
    category: string;
    type: string;
    storageUrl: string;
    storageKey: string;
    isPremium: boolean;
    price: number;
    currency: string;
    totalViews: number;
    totalPurchases: number;
    createdAt: string;
    project: { id: string; name: string } | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    summary: string | null;
    count: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
  }>;
  analytics: {
    totals: { totalFiles: number; totalViews: number; totalRevenue: number };
    topViewed: Array<{ id: string; title: string; views: number }>;
    topSelling: Array<{ id: string; title: string; revenue: number }>;
    recentTransactions: Array<{ id: string; type: string; amount: number; createdAt: string }>;
  };
  notifications: Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
    createdAt: string;
  }>;
};

export default function DashboardPage() {
  const { sdk, ready } = useWhopBridge();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      // Wait for Whop SDK to be ready
      if (!ready || !sdk) {
        return;
      }

      try {
        console.log("[Dashboard] Fetching dashboard data...");
        const response = await fetch("/api/dashboard/data");

        if (!response.ok) {
          throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
        }

        const dashboardData = await response.json();
        console.log("[Dashboard] Data loaded successfully");
        setData(dashboardData);
        setError(null);
      } catch (err) {
        console.error("[Dashboard] Failed to load data", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [ready, sdk]);

  // Show authentication prompt if Whop SDK not ready
  if (!ready || !sdk) {
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
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-xs text-muted-foreground">Initializing Whop SDK...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Loading Dashboard</CardTitle>
            <CardDescription>Fetching your data...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Please wait...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Error Loading Dashboard</CardTitle>
            <CardDescription>{error || "Unknown error occurred"}</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render dashboard with data
  return (
    <DashboardShell
      user={data.user}
      files={data.files}
      projects={data.projects}
      categories={data.categories}
      analytics={data.analytics}
      notifications={data.notifications}
    />
  );
}
