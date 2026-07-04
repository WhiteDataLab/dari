import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { canViewPhotos } from "@/lib/photoGate";
import { computeRelationPath } from "@/lib/relationPath";
import { getViewerContext, isProfileVisible } from "@/lib/visibility";
import { decryptPhone } from "@/lib/crypto";

// GET /api/profiles/[id] — 상세 + 관계 경로 (phone 제외, 사진 gate 적용)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } },
  });
  if (!profile || profile.status === "HIDDEN") {
    return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });
  }

  // 거절 이력 상대는 404 (DB_SCHEMA §5-3)
  const myProfiles = await prisma.profile.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  const myProfileIds = myProfiles.map((p) => p.id);
  const isMine = profile.ownerId === userId || profile.userId === userId;

  // 노출 회피 (같은 회사 / 아는 사람) — 회피 대상이면 404
  if (!isMine) {
    const ctx = await getViewerContext(userId);
    if (!(await isProfileVisible(ctx, profile))) {
      return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });
    }
  }

  if (!isMine && myProfileIds.length > 0) {
    const rejected = await prisma.like.findFirst({
      where: {
        status: "REJECTED",
        OR: [
          { fromProfileId: { in: myProfileIds }, toProfileId: id },
          { fromProfileId: id, toProfileId: { in: myProfileIds } },
        ],
      },
    });
    if (rejected) {
      return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });
    }
  }

  const photosVisible = await canViewPhotos(userId, profile);
  const path = await computeRelationPath(userId, profile);

  // 성사된 사이면 전화번호 포함 (유일한 복호화 경로 ②)
  let phone: string | null = null;
  try {
    if (isMine) {
      phone = decryptPhone(profile.phone);
    } else if (myProfileIds.length > 0) {
      const match = await prisma.match.findFirst({
        where: {
          OR: [
            { profileAId: { in: myProfileIds }, profileBId: id },
            { profileAId: id, profileBId: { in: myProfileIds } },
          ],
        },
      });
      if (match) phone = decryptPhone(profile.phone);
    }
  } catch {
    phone = null; // 키 불일치 등 복호화 실패 시 미공개로 처리
  }

  // 민감 필드는 응답에서 제외 (phone 암호문, phoneHash)
  const { phone: _encrypted, phoneHash: _hash, ...rest } = profile;
  return NextResponse.json({
    profile: {
      ...rest,
      phone,
      photos: photosVisible
        ? profile.photos.map((p) => ({ id: p.id, url: p.url, isMain: p.isMain }))
        : [], // 권한 없으면 URL 자체를 응답하지 않음
      photoCount: profile.photos.length,
      photosLocked: !photosVisible,
    },
    path,
    isMine,
  });
}

// PATCH /api/profiles/[id] — 수정 / 숨김 / 재공개 (소유자만)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile || profile.ownerId !== userId) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.action === "hide" || body.action === "show") {
    if (profile.status === "MATCHED") {
      return NextResponse.json({ error: "성사된 프로필은 변경할 수 없어요" }, { status: 400 });
    }
    await prisma.profile.update({
      where: { id },
      data: { status: body.action === "hide" ? "HIDDEN" : "ACTIVE" },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "avoidCompany") {
    await prisma.profile.update({
      where: { id },
      data: { avoidSameCompany: !!body.value },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "지원하지 않는 액션이에요" }, { status: 400 });
}
