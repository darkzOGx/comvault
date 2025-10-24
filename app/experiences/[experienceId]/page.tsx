import { redirect } from "next/navigation";

/**
 * Whop experiences route handler
 * This route is expected by Whop's iframe configuration but redirects to the main dashboard
 * since Community Vault uses a single unified dashboard experience
 */
export default function ExperiencePage() {
  // Redirect to the main dashboard
  // The experienceId is passed by Whop but not currently used in our architecture
  redirect("/dashboard");
}
