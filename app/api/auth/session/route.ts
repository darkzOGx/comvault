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
    console.log("[API /auth/session] Headers:", Object.fromEntries(request.headers.entries()));

    // getUserFromRequest will:
    // 1. Try to verify Whop headers from the request
    // 2. Create/update user in database
    // 3. Set session cookie via persistSessionCookie
    const user = await getUserFromRequest(request);

    if (!user) {
      console.log("[API /auth/session] No user authenticated from Whop headers");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    console.log("[API /auth/session] Session established for user:", user.id);

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
    console.error("[API /auth/session] Failed to establish session", error);
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
