import { headers } from "next/headers";
import { cache } from "react";
import { verifyUserToken, WhopServerSdk } from "@whop/api";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const APP_ID = process.env.NEXT_PUBLIC_WHOP_APP_ID;
const WHOP_API_KEY = process.env.WHOP_SERVER_API_KEY;

if (!APP_ID) {
  console.warn("NEXT_PUBLIC_WHOP_APP_ID is not set. Whop auth will fail.");
}

const whopServerSdk = WHOP_API_KEY
  ? new WhopServerSdk({
      defaultAccessToken: WHOP_API_KEY
    })
  : null;

type WhopUserLike = {
  id?: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar?: { url?: string | null } | null;
  profileImage?: { url?: string | null } | null;
  profilePicture?: string | null;
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

export const getCurrentUser = cache(async () => {
  const hdrs = headers();
  return getUserFromHeaders(hdrs);
});

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

  try {
    const payload = await verifyUserToken(targetHeaders, { appId: APP_ID });
    if (!payload?.userId) {
      return null;
    }

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
      (whopUser?.avatar && "url" in whopUser.avatar ? whopUser.avatar.url : null) ||
      (whopUser?.profileImage && "url" in whopUser.profileImage
        ? whopUser.profileImage.url
        : null) ||
      whopUser?.profilePicture ||
      null;

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

type HeaderMap = {
  entries(): IterableIterator<[string, string | number | readonly string[]]>;
};
