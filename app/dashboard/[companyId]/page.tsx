import { redirect } from "next/navigation";

/**
 * Whop company-specific dashboard route handler
 * This route is expected by Whop's iframe configuration but redirects to the main dashboard
 * since Community Vault uses a single unified dashboard that handles all company contexts
 */
export default function CompanyDashboardPage({
  params
}: {
  params: { companyId: string };
}) {
  // Redirect to the main dashboard
  // The companyId is passed by Whop but the main dashboard handles company context internally
  redirect("/dashboard");
}
