import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const CONCURRENT_LIMIT = 3; // 동시 진행 호감 3건 (PROJECT_SPEC §9.1)

// POST /api/likes — 호감 전송 { toProfileId }
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { toProfileId } = await req.json().catch(() => ({}));
  if (typeof toProfileId !== "string") {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  // 발신 프로필 = 내 본인 프로필 (호감 전송은 프로필 완성이 선행 조건)
  const fromProfile = await prisma.profile.findFirst({
    where: { userId, isSelf: true },
    include: { _count: { select: { photos: true } } },
  });
  if (!fromProfile) {
    return NextResponse.json(
      { error: "먼저 내 소개팅 프로필을 만들어 주세요", needProfile: true },
      { status: 400 },
    );
  }
  if (fromProfile._count.photos === 0) {
    return NextResponse.json(
      { error: "대표 사진을 등록해야 호감을 보낼 수 있어요", needProfile: true },
      { status: 400 },
    );
  }
  if (fromProfile.status === "MATCHED") {
    return NextResponse.json({ error: "이미 성사된 프로필이에요 🎓" }, { status: 400 });
  }

  const toProfile = await prisma.profile.findUnique({ where: { id: toProfileId } });
  if (!toProfile || toProfile.status !== "ACTIVE") {
    return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });
  }
  if (toProfile.ownerId === userId || toProfile.userId === userId) {
    return NextResponse.json({ error: "내가 등록한 프로필이에요" }, { status: 400 });
  }
  if (toProfile.gender === fromProfile.gender) {
    return NextResponse.json({ error: "같은 성별에게는 보낼 수 없어요" }, { status: 400 });
  }

  // 재호감 방지 (양방향)
  const existing = await prisma.like.findFirst({
    where: {
      OR: [
        { fromProfileId: fromProfile.id, toProfileId },
        { fromProfileId: toProfileId, toProfileId: fromProfile.id },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 진행했거나 종료된 인연이에요" }, { status: 409 });
  }

  // 동시 진행 제한
  const active = await prisma.like.count({
    where: { actorUserId: userId, status: { in: ["PENDING", "PHOTO_GRANTED"] } },
  });
  if (active >= CONCURRENT_LIMIT) {
    return NextResponse.json(
      { error: `호감은 동시에 ${CONCURRENT_LIMIT}건까지만 진행할 수 있어요` },
      { status: 400 },
    );
  }

  const recipientUserId = toProfile.userId ?? toProfile.ownerId; // 대리 등록이면 중매인이 수신
  const isFemaleInitiated = fromProfile.gender === "FEMALE";

  const like = await prisma.$transaction(async (tx) => {
    const created = await tx.like.create({
      data: {
        fromProfileId: fromProfile.id,
        toProfileId,
        actorUserId: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 여성 발신 = 사진 동봉: 상대 남성에게 즉시 열람권 발급 (PROJECT_SPEC §9.1)
    if (isFemaleInitiated) {
      await tx.photoAccess.upsert({
        where: { profileId_viewerId: { profileId: fromProfile.id, viewerId: recipientUserId } },
        create: {
          profileId: fromProfile.id,
          viewerId: recipientUserId,
          source: "FEMALE_INITIATE",
          likeId: created.id,
        },
        update: { revokedAt: null, source: "FEMALE_INITIATE", likeId: created.id },
      });
    }

    await tx.notification.create({
      data: {
        userId: recipientUserId,
        type: "LIKE_RECEIVED",
        payload: { likeId: created.id, fromProfileId: fromProfile.id, toProfileId },
      },
    });

    return created;
  });

  return NextResponse.json({ ok: true, likeId: like.id, remaining: CONCURRENT_LIMIT - active - 1 });
}
