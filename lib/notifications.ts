import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { Resend } from "resend";

const resendKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL;

const resend = resendKey ? new Resend(resendKey) : null;

type NotificationParams = {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  emailSubject?: string;
  emailBody?: string;
};

export async function createNotification({
  userId,
  type,
  payload,
  emailSubject,
  emailBody
}: NotificationParams) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      payload
    }
  });

  if (emailSubject && emailBody) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email && resend && resendFrom) {
      await resend.emails.send({
        from: resendFrom,
        to: user.email,
        subject: emailSubject,
        html: emailBody
      });
    }
  }

  return notification;
}

export async function notifyPurchase(params: {
  creatorId: string;
  purchaserName: string;
  fileTitle: string;
  amount: number;
  currency: string;
}) {
  await createNotification({
    userId: params.creatorId,
    type: NotificationType.PURCHASE,
    payload: {
      purchaserName: params.purchaserName,
      fileTitle: params.fileTitle,
      amount: params.amount,
      currency: params.currency
    },
    emailSubject: `🎉 ${params.purchaserName} purchased ${params.fileTitle}`,
    emailBody: `<p>${params.purchaserName} just purchased <strong>${params.fileTitle}</strong> for ${params.amount.toFixed(
      2
    )} ${params.currency}. Keep the momentum going!</p>`
  });
}

export async function notifyNewContent(params: {
  subscriberId: string;
  fileTitle: string;
  category: string;
  creatorName: string;
}) {
  await createNotification({
    userId: params.subscriberId,
    type: NotificationType.NEW_CONTENT,
    payload: {
      fileTitle: params.fileTitle,
      category: params.category,
      creatorName: params.creatorName
    },
    emailSubject: `${params.creatorName} added new content`,
    emailBody: `<p>${params.creatorName} just published <strong>${params.fileTitle}</strong> in ${params.category}. Log in to start learning.</p>`
  });
}
