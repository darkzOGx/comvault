import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createCheckoutSession } from "@/lib/payments";

const schema = z.object({
  fileId: z.string().min(1)
});

export async function POST(request: Request) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const session = await createCheckoutSession({
      fileId: parsed.data.fileId,
      purchaserId: user.id
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("Checkout session error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 400 }
    );
  }
}
