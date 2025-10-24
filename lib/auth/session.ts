import { headers, cookies } from "next/headers";
import { verifyUserToken, WhopServerSdk } from "@whop/api";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const APP_ID = process.env.NEXT_PUBLIC_WHOP_APP_ID;
const WHOP_API_KEY = process.env.WHOP_SERVER_API_KEY;

if (!APP_ID) {
  console.warn("NEXT_PUBLIC_WHOP_APP_ID is not set. Whop auth will fail.");
}

// Disable lint rule for Whop SDK initialization pattern
const whopServerSdk = WHOP_API_KEY
  ? new (WhopServerSdk as unknown as new (config: { defaultAccessToken: string }) => ReturnType<typeof WhopServerSdk>)({
      defaultAccessToken: WHOP_API_KEY
    })
  : null;

export const SESSION_COOKIE_NAME = "comvault_user_id";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const isProduction = process.env.NODE_ENV === "production";
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS
};

type WhopUserLike = {
  id?: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  profilePicture?: { sourceUrl?: string | null } | string | null;
  roles?: string[] | null;
  type?: string | null;
};

function resolveRole(whopUser: WhopUserLike | null | undefined): UserRole {
  const input = [
    ...(whopUser?.roles ?? []),
    whopUser?.type,
    whopUser?.["role" as keyof typeof whopUser]
  ]
    .map((value) => (typeof value === "string" ? value.toLowerCase() : null))
    .filter(Boolean) as string[];

  if (input.includes("admin")) return UserRole.ADMIN;
  if (input.includes("creator") || input.includes("owner")) return UserRole.CREATOR;
  return UserRole.VIEWER;
}

export type AuthenticatedUser = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getCurrentUser() {
  console.log("[AUTH] getCurrentUser called");
  const hdrs = headers();

  // Log all headers for debugging
  const headerEntries: string[] = [];
  for (const [key, value] of hdrs.entries()) {
    headerEntries.push(`${key}: ${value}`);
  }
  console.log("[AUTH] Request headers:", headerEntries.join(", "));

  const user = await getUserFromHeaders(hdrs);

  // Temporary fallback: if no Whop auth, return first user from DB for testing
  if (!user) {
    console.log("[AUTH] No user from Whop headers, trying fallback...");
    try {
      const testUser = await prisma.user.findFirst();
      if (testUser) {
        console.log("[AUTH] Using fallback test user:", testUser.id);
        return testUser;
      } else {
        console.log("[AUTH] No users found in database");
      }
    } catch (error) {
      console.error("[AUTH] Error fetching fallback user:", error);
    }
  } else {
    console.log("[AUTH] User authenticated via Whop:", user.id);
  }

  return user;
}

export async function requireUser(request?: Request): Promise<NonNullable<AuthenticatedUser>> {
  const user = await (request ? getUserFromRequest(request) : getCurrentUser());
  if (!user) {
    throw new Error("Authentication required.");
  }
  return user;
}

export async function getUserFromRequest(request: Request) {
  return getUserFromHeaders(request.headers);
}

async function getUserFromHeaders(incoming: Headers | HeaderMap | undefined) {
  if (!APP_ID) {
    throw new Error("Whop app id is not configured.");
  }

  const targetHeaders =
    incoming instanceof Headers
      ? incoming
      : (() => {
          const hdrs = new Headers();
          if (!incoming) return hdrs;
          for (const [key, value] of incoming.entries()) {
            hdrs.set(key, typeof value === "string" ? value : String(value));
          }
          return hdrs;
        })();

  const user = await getUserFromWhopHeaders(targetHeaders);
  if (user) {
    persistSessionCookie(user.id);
    return user;
  }

  // Try cookie-based session as a fallback (used by client-side API calls)
  try {
    const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
    if (sessionId) {
      const cookieUser = await prisma.user.findUnique({ where: { id: sessionId } });
      if (cookieUser) return cookieUser;
    }
  } catch {}

  return null;
}

async function getUserFromWhopHeaders(targetHeaders: Headers) {
  try {
    console.log("[AUTH] Verifying Whop token with APP_ID:", APP_ID);
    const payload = await verifyUserToken(targetHeaders, { appId: APP_ID });
    console.log("[AUTH] Whop token payload:", payload);
    if (!payload?.userId) {
      console.log("[AUTH] No userId in Whop token payload");
      return null;
    }
    console.log("[AUTH] Whop userId found:", payload.userId);

    const whopUser =
      whopServerSdk &&
      (await whopServerSdk.users
        .getUser({ userId: payload.userId })
        .catch((error) => {
          console.error("Failed to retrieve Whop user profile", error);
          return null;
        }));

    const role = resolveRole(whopUser ?? undefined);

    const name =
      (whopUser &&
        ("displayName" in whopUser ? (whopUser as Record<string, unknown>)["displayName"] : null)) ||
      whopUser?.name ||
      whopUser?.username ||
      null;

    const avatarUrl =
      (typeof whopUser?.profilePicture === "string"
        ? whopUser.profilePicture
        : whopUser?.profilePicture && typeof whopUser.profilePicture === "object" && "sourceUrl" in whopUser.profilePicture
          ? whopUser.profilePicture.sourceUrl
          : null) || null;

    const email =
      (whopUser && "email" in whopUser ? (whopUser as Record<string, unknown>)["email"] : null) ||
      null;

    const user = await prisma.user.upsert({
      where: { whopUserId: payload.userId },
      create: {
        whopUserId: payload.userId,
        email: typeof email === "string" ? email : null,
        name: typeof name === "string" ? name : null,
        avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
        role
      },
      update: {
        email: typeof email === "string" ? email : undefined,
        name: typeof name === "string" ? name : undefined,
        avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
        role
      }
    });

    return user;
  } catch (error) {
    console.error("Failed to verify Whop token", error);
    return null;
  }
}

function persistSessionCookie(userId: string) {
  try {
    cookies().set(SESSION_COOKIE_NAME, userId, SESSION_COOKIE_OPTIONS);
  } catch (error) {
    console.warn("[AUTH] Failed to persist session cookie", error);
  }
}

type HeaderMap = {
  entries(): IterableIterator<[string, string | number | readonly string[]]>;
};
