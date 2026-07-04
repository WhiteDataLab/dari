import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";

export function notifyTx(
  tx: Prisma.TransactionClient,
  userId: string,
  type: NotificationType,
  payload: Record<string, string | number | null>,
) {
  return tx.notification.create({
    data: { userId, type, payload },
  });
}

export function notify(
  userId: string,
  type: NotificationType,
  payload: Record<string, string | number | null>,
) {
  return notifyTx(prisma, userId, type, payload);
}
