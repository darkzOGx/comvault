"use client";

import { useQuery } from "@tanstack/react-query";

export type AnalyticsResponse = Awaited<ReturnType<typeof fetchAnalytics>>;

async function fetchAnalytics() {
  const response = await fetch("/api/analytics");
  if (!response.ok) {
    throw new Error("Failed to load analytics");
  }
  return response.json();
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: fetchAnalytics,
    staleTime: 1000 * 60 * 5
  });
}
