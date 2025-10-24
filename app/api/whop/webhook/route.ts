import { NextResponse } from "next/server";
import { handleWhopWebhook } from "@/lib/payments";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("x-whop-signature") ?? undefined;
  const webhookSecret = process.env.WHOP_SIGNING_SECRET;

  if (!webhookSecret) {
    console.error("Missing WHOP_SIGNING_SECRET");
    return new NextResponse("Webhook configuration error", { status: 500 });
  }

  const rawBody = await request.text();

  try {
    // Verify Whop webhook signature
    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new NextResponse("Invalid signature", { status: 401 });
      }
    }

    // Parse webhook event
    const event = JSON.parse(rawBody);

    // Handle the webhook event
    await handleWhopWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Whop webhook error", error);
    return new NextResponse("Webhook Error", { status: 400 });
  }
}
