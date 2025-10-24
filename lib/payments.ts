import { WhopServerSdk } from "@whop/api";
import { prisma } from "@/lib/prisma";
import { notifyPurchase } from "@/lib/notifications";
import { calculateSplit, describeSplit } from "@/lib/payouts";

const whopApiKey = process.env.WHOP_SERVER_API_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Disable lint rule for Whop SDK initialization pattern
export const whop = whopApiKey
  ? (new (WhopServerSdk as unknown as new (config: { defaultAccessToken: string }) => ReturnType<typeof WhopServerSdk>)({ defaultAccessToken: whopApiKey }))
  : null;

export async function createCheckoutSession(params: {
  purchaserId: string;
  fileId: string;
  successPath?: string;
  cancelPath?: string;
}) {
  if (!whop) {
    throw new Error("Whop is not configured");
  }

  const file = await prisma.file.findUnique({
    where: { id: params.fileId },
    include: {
      owner: {
        select: { id: true, name: true, whopUserId: true }
      }
    }
  });

  if (!file) {
    throw new Error("File not found");
  }

  if (!file.isPremium) {
    throw new Error("File is not premium and does not require checkout.");
  }

  // Get purchaser's Whop user ID
  const purchaser = await prisma.user.findUnique({
    where: { id: params.purchaserId },
    select: { whopUserId: true }
  });

  if (!purchaser?.whopUserId) {
    throw new Error("Purchaser not found or not authenticated with Whop");
  }

  // Convert price to cents for Whop
  const priceInCents = Math.round(Number(file.price) * 100);

  // Build Whop checkout URL with parameters
  // Note: This is a placeholder implementation. You'll need to replace this with
  // the actual Whop checkout API based on Whop's documentation for your app.
  // Options:
  // 1. Use Whop's SDK checkout method if available
  // 2. Create a product/plan in Whop dashboard and redirect to it
  // 3. Use Whop's hosted checkout page with proper parameters

  const checkoutUrl = process.env.WHOP_CHECKOUT_URL ?? "https://whop.com/checkout";
  const checkoutSessionId = `session_${Date.now()}_${file.id}`;

  // Build checkout URL (adjust based on your Whop app configuration)
  const url = `${checkoutUrl}?` + new URLSearchParams({
    amount: priceInCents.toString(),
    currency: file.currency,
    title: file.title,
    description: file.summary ?? file.description,
    success_url: `${appUrl}${params.successPath ?? "/dashboard"}?checkout=success&fileId=${file.id}`,
    cancel_url: `${appUrl}${params.cancelPath ?? "/dashboard"}?checkout=cancelled`,
    metadata: JSON.stringify({
      fileId: file.id,
      purchaserId: params.purchaserId,
      ownerId: file.ownerId,
      purchaserWhopId: purchaser.whopUserId,
      ownerWhopId: file.owner.whopUserId
    })
  }).toString();

  return {
    url,
    id: checkoutSessionId
  };
}

interface WhopWebhookEvent {
  type: string;
  data: {
    id?: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, string>;
    [key: string]: unknown;
  };
}

export async function handleWhopWebhook(event: WhopWebhookEvent) {
  if (!whop) {
    throw new Error("Whop is not configured");
  }

  // Handle payment.succeeded event from Whop
  if (event.type === "payment.succeeded") {
    const payment = event.data;
    const fileId = payment.metadata?.fileId;
    const purchaserId = payment.metadata?.purchaserId;

    if (!fileId || !purchaserId) {
      console.warn("Missing fileId or purchaserId in Whop webhook metadata");
      return;
    }

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { owner: true }
    });

    if (!file) {
      console.warn(`File not found: ${fileId}`);
      return;
    }

    // Convert from cents to dollars
    const amount = payment.amount ? payment.amount / 100 : Number(file.price);
    const splits = calculateSplit(amount);

    await prisma.$transaction([
      prisma.file.update({
        where: { id: file.id },
        data: { totalPurchases: { increment: 1 } }
      }),
      prisma.transaction.create({
        data: {
          fileId: file.id,
          purchaserId,
          creatorId: file.ownerId,
          amount,
          currency: file.currency,
          creatorShare: splits.creator,
          communityShare: splits.community,
          platformShare: splits.platform,
          externalReference: payment.id
        }
      }),
      prisma.user.update({
        where: { id: file.ownerId },
        data: {
          earnings: { increment: splits.creator }
        }
      })
    ]);

    await notifyPurchase({
      creatorId: file.ownerId,
      purchaserName: purchaserId,
      fileTitle: file.title,
      amount,
      currency: file.currency
    });
  }

  // Handle membership.created event (if user subscribes to access content)
  if (event.type === "membership.created") {
    const membership = event.data;
    // Handle subscription-based access if needed
    console.log("Membership created:", membership);
  }
}

export { describeSplit };
