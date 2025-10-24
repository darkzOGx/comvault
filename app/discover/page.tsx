import { redirect } from "next/navigation";

/**
 * Whop discover/browse route handler
 * This route is expected by Whop's iframe configuration but redirects to the main dashboard
 * The discovery/browse functionality is integrated into the main dashboard experience
 */
export default function DiscoverPage() {
  // Redirect to the main dashboard where discovery features are integrated
  redirect("/dashboard");
}
