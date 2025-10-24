import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { getUserAnalytics } from "@/lib/analytics";

export async function GET(request: Request) {
  const user = await requireUser(request);
  try {
    const analytics = await getUserAnalytics(user.id);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics fetch failed", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
