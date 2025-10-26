import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/session";

/**
 * Endpoint to establish a session cookie for authenticated users
 * Called by client-side code after Whop SDK initializes
 *
 * This endpoint receives Whop authentication headers from the iframe
 * and sets a session cookie that subsequent API calls can use
 */
export async function POST(request: Request) {
  try {
    console.log("[API /auth/session] POST - Establishing user session...");

    // Log environment info
    console.log("[API /auth/session] Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      host: request.headers.get("host"),
      hasWhopAppId: !!process.env.NEXT_PUBLIC_WHOP_APP_ID,
      hasWhopApiKey: !!process.env.WHOP_SERVER_API_KEY
    });

    // Log all headers (for debugging)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("[API /auth/session] Request headers:", headers);

    // getUserFromRequest will:
    // 1. Try to verify Whop headers from the request
    // 2. Create/update user in database if Whop auth succeeds
    // 3. Fall back to test user if localhost + development
    // 4. Set session cookie via persistSessionCookie
    const user = await getUserFromRequest(request);

    if (!user) {
      console.log("[API /auth/session] FAILED - No user authenticated");
      console.log("[API /auth/session] This could mean:");
      console.log("  1. Not running in Whop iframe (no Whop headers)");
      console.log("  2. Whop authentication failed");
      console.log("  3. Not on localhost (no dev fallback)");

      return NextResponse.json(
        {
          error: "Authentication required",
          details: "No Whop authentication headers found and not in development mode"
        },
        { status: 401 }
      );
    }

    console.log("[API /auth/session] SUCCESS - Session established for user:", {
      id: user.id,
      name: user.name,
      whopUserId: user.whopUserId
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("[API /auth/session] EXCEPTION - Failed to establish session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to establish session" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current session status
 */
export async function GET(request: Request) {
  try {
    console.log("[API /auth/session] GET - Checking session status...");

    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("[API /auth/session] Error checking session", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
