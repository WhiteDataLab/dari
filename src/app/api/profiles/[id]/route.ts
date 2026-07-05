import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { canViewPhotos } from "@/lib/photoGate";
import { computeRelationPath } from "@/lib/relationPath";
import { getViewerContext, isProfileVisible } from "@/lib/visibility";
import { decryptPhone } from "@/lib/crypto";
import { canEditProfile } from "@/lib/profileAccess";
import { profileUpdateSchema, checkProfileFreeText } from "@/lib/profileInput";
import { notify } from "@/lib/notify";

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

  // 거절 이력 상대는 404 (DB_SCHEMA §5-3) — 클레임된 내 프로필(소유자는 추천인)도 포함
  const myProfiles = await prisma.profile.findMany({
    where: { OR: [{ ownerId: userId }, { userId }] },
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

  // 성사 여부 — 이름·전화번호 공개의 유일한 조건 (내 프로필 제외)
  let matched = false;
  if (!isMine && myProfileIds.length > 0) {
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { profileAId: { in: myProfileIds }, profileBId: id },
          { profileAId: id, profileBId: { in: myProfileIds } },
        ],
      },
    });
    matched = !!match;
  }

  let phone: string | null = null;
  try {
    if (isMine || matched) phone = decryptPhone(profile.phone);
  } catch {
    phone = null; // 키 불일치 등 복호화 실패 시 미공개로 처리
  }

  // 민감 필드는 응답에서 제외 (phone 암호문, phoneHash), 실명은 성사 전 닉네임으로 대체
  const { phone: _encrypted, phoneHash: _hash, name: realName, ...rest } = profile;
  return NextResponse.json({
    profile: {
      ...rest,
      name: isMine || matched ? realName : profile.nickname,
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

// PATCH /api/profiles/[id] — 수정 / 숨김 / 재공개 / 편집 권한 공유 결정
// 권한: 당사자(userId 일치)는 항상, 등록자는 클레임 전 or 당사자가 편집을 허용한 경우
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile || !canEditProfile(userId, profile)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // 클레임된 프로필의 당사자만: 추천인(등록자) 편집 권한 공유 여부 결정
  if (body.action === "shareEdit") {
    if (profile.userId !== userId || !profile.claimedAt) {
      return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
    }
    const share = !!body.value;
    await prisma.profile.update({
      where: { id },
      data: { ownerCanEdit: share, editShareDecidedAt: new Date() },
    });
    if (profile.ownerId !== userId) {
      await notify(profile.ownerId, "EDIT_SHARE_DECIDED", {
        profileId: id,
        name: profile.name,
        shared: share ? 1 : 0,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // 전체 항목 수정 (본인 프로필 / 지인 프로필 공용)
  // 이름·연락처는 최초 등록 후 변경 불가 — 스키마에서 제외 (도용 방지)
  if (body.action === "update") {
    const parsed = profileUpdateSchema.safeParse(body.fields);
    if (!parsed.success) {
      return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
    }
    const d = parsed.data;
    const violation = checkProfileFreeText(d);
    if (violation) {
      return NextResponse.json({ error: violation }, { status: 400 });
    }
    await prisma.profile.update({
      where: { id },
      data: {
        gender: d.gender,
        birthYear: d.birthYear,
        heightCm: d.heightCm,
        bodyType: d.bodyType,
        avoidSameCompany: d.avoidSameCompany ?? profile.avoidSameCompany,
        areaSido: d.areaSido,
        areaGugun: d.areaGugun,
        company: d.company.trim(),
        companyMasked: !!d.companyMasked,
        jobTitle: d.jobTitle.trim(),
        religion: d.religion,
        drinking: d.drinking,
        drinkCapacity: d.drinking === "OFTEN" ? d.drinkCapacity : null,
        smoking: d.smoking,
        isDivorced: d.isDivorced,
        mbti: d.mbti || null,
        hobbies: d.hobbies,
        idealType: d.idealType || null,
        loveView: d.loveView || null,
        recommenderComment: d.recommenderComment || null,
      },
    });
    return NextResponse.json({ ok: true });
  }

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
