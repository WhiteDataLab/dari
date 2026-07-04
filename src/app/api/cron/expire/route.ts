import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel Cron (매일 1회): 기한 지난 호감 자동 만료 (PAGE_IA §4)
// 1단계 7일 / 3단계 48시간. 만료 시 열람권 회수 + 알림.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.like.findMany({
    where: {
      OR: [
        { status: "PENDING", expiresAt: { lt: now } },
        { status: "PHOTO_GRANTED", finalDeadline: { lt: now } },
      ],
    },
    include: { fromProfile: true, toProfile: true },
  });

  for (const like of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.like.update({ where: { id: like.id }, data: { status: "EXPIRED" } });
      await tx.photoAccess.updateMany({
        where: { likeId: like.id, revokedAt: null },
        data: { revokedAt: now },
      });
      // 발신자에게만 만료 알림. 여성에게 "열람 여부"는 절대 노출하지 않음 (PROJECT_SPEC §9.1)
      const fromUserId = like.fromProfile.userId ?? like.fromProfile.ownerId;
      await tx.notification.create({
        data: { userId: fromUserId, type: "LIKE_EXPIRED", payload: { likeId: like.id } },
      });
    });
  }

  return NextResponse.json({ ok: true, expired: expired.length });
}
