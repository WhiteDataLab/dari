import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { computeRelationPath } from "@/lib/relationPath";
import { Prisma, RejectReason } from "@prisma/client";

// 매칭 성사 트랜잭션 (PAGE_IA §4): Like 상태 변경 + Match insert
// + Profile 2건 MATCHED + 양방향 PhotoAccess + Notification 2건
async function createMatch(
  tx: Prisma.TransactionClient,
  like: { id: string; fromProfileId: string; toProfileId: string },
  fromUserId: string,
  toUserId: string,
  degree: number | null,
) {
  await tx.like.update({
    where: { id: like.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });
  const match = await tx.match.create({
    data: {
      profileAId: like.fromProfileId,
      profileBId: like.toProfileId,
      sourceLikeId: like.id,
      degreeOfSeparation: degree,
    },
  });
  await tx.profile.update({ where: { id: like.fromProfileId }, data: { status: "MATCHED" } });
  await tx.profile.update({ where: { id: like.toProfileId }, data: { status: "MATCHED" } });

  // 성사 → 상호 사진 열람권 (여성 사진 gate 대응, 양방향 발급해도 무해)
  for (const [profileId, viewerId] of [
    [like.fromProfileId, toUserId],
    [like.toProfileId, fromUserId],
  ] as const) {
    await tx.photoAccess.upsert({
      where: { profileId_viewerId: { profileId, viewerId } },
      create: { profileId, viewerId, source: "MATCH", likeId: like.id },
      update: { revokedAt: null, source: "MATCH" },
    });
  }

  for (const uid of [fromUserId, toUserId]) {
    await tx.notification.create({
      data: { userId: uid, type: "MATCH_CREATED", payload: { matchId: match.id } },
    });
  }
  return match;
}

// PATCH /api/likes/[id] — { action: "accept" | "reject", reason?: RejectReason }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const reason = (body.reason ?? "NO_REASON") as RejectReason;

  const like = await prisma.like.findUnique({
    where: { id },
    include: { fromProfile: true, toProfile: true },
  });
  if (!like) return NextResponse.json({ error: "찾을 수 없어요" }, { status: 404 });

  const fromUserId = like.fromProfile.userId ?? like.fromProfile.ownerId;
  const toUserId = like.toProfile.userId ?? like.toProfile.ownerId;
  const isRecipient = userId === toUserId;
  const isSender = userId === fromUserId;
  if (!isRecipient && !isSender) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

  const maleInitiated = like.fromProfile.gender === "MALE";

  // ── 거절 (어느 단계든 본인 차례에 가능) ──
  if (action === "reject") {
    const canReject =
      (like.status === "PENDING" && isRecipient) ||
      (like.status === "PHOTO_GRANTED" && isSender);
    if (!canReject) {
      return NextResponse.json({ error: "지금은 응답할 수 없어요" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.like.update({
        where: { id },
        data: { status: "REJECTED", rejectReason: reason, respondedAt: new Date() },
      });
      // 열람권 즉시 회수 (DB_SCHEMA §5-6)
      await tx.photoAccess.updateMany({
        where: { likeId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          userId: isRecipient ? fromUserId : toUserId,
          type: "LIKE_REJECTED",
          payload: { likeId: id, reason },
        },
      });
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (action !== "accept") {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  // ── 수락 ──
  if (like.status === "PENDING") {
    if (!isRecipient) {
      return NextResponse.json({ error: "상대의 응답을 기다리는 중이에요" }, { status: 400 });
    }
    if (like.expiresAt < new Date()) {
      return NextResponse.json({ error: "기한이 지난 호감이에요" }, { status: 400 });
    }

    if (maleInitiated) {
      // 2단계: 여성 수락 → 사진 공개, 남성 최종 결정 대기 48시간
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        await tx.like.update({
          where: { id },
          data: {
            status: "PHOTO_GRANTED",
            photoGrantedAt: now,
            finalDeadline: new Date(now.getTime() + 48 * 60 * 60 * 1000),
          },
        });
        await tx.photoAccess.upsert({
          where: {
            profileId_viewerId: { profileId: like.toProfileId, viewerId: fromUserId },
          },
          create: {
            profileId: like.toProfileId,
            viewerId: fromUserId,
            source: "FEMALE_GRANT",
            likeId: id,
          },
          update: { revokedAt: null, source: "FEMALE_GRANT", likeId: id },
        });
        await tx.notification.create({
          data: {
            userId: fromUserId,
            type: "LIKE_ACCEPTED",
            payload: { likeId: id, stage: "PHOTO_GRANTED" },
          },
        });
      });
      return NextResponse.json({ ok: true, status: "PHOTO_GRANTED" });
    }

    // 여성 발신: 남성 수락 1회로 성사
    const degree = await degreeBetween(fromUserId, like.toProfile);
    const match = await prisma.$transaction((tx) =>
      createMatch(tx, like, fromUserId, toUserId, degree),
    );
    return NextResponse.json({ ok: true, status: "ACCEPTED", matchId: match.id });
  }

  if (like.status === "PHOTO_GRANTED") {
    // 3단계: 남성 최종 수락 (48시간 기한)
    if (!isSender) {
      return NextResponse.json({ error: "상대의 최종 결정을 기다리는 중이에요" }, { status: 400 });
    }
    if (like.finalDeadline && like.finalDeadline < new Date()) {
      return NextResponse.json({ error: "결정 기한이 지났어요" }, { status: 400 });
    }
    const degree = await degreeBetween(fromUserId, like.toProfile);
    const match = await prisma.$transaction((tx) =>
      createMatch(tx, like, fromUserId, toUserId, degree),
    );
    return NextResponse.json({ ok: true, status: "ACCEPTED", matchId: match.id });
  }

  return NextResponse.json({ error: "이미 종료된 호감이에요" }, { status: 400 });
}

// 성사 시점 촌수 스냅샷 ("4다리 커플")
async function degreeBetween(
  viewerId: string,
  profile: {
    ownerId: string;
    relationToOwner: import("@prisma/client").RelationType;
    isSelf: boolean;
    userId: string | null;
    name: string;
  },
): Promise<number | null> {
  try {
    const path = await computeRelationPath(viewerId, profile);
    return path && !path.far ? path.degree : null;
  } catch {
    return null;
  }
}
