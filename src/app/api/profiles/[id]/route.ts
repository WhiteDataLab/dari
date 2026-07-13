import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { canViewPhotos } from "@/lib/photoGate";
import { computeRelationPath } from "@/lib/relationPath";
import { getViewerContext, isProfileVisible } from "@/lib/visibility";
import { decryptPhone, encryptPhone, hashPhone } from "@/lib/crypto";
import { canEditProfile, canManageProfile } from "@/lib/profileAccess";
import { deletePhotoByUrl } from "@/lib/storage";
import { profileUpdateSchema, checkProfileFreeText, PHONE_RE } from "@/lib/profileInput";
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

  // 이름·연락처 미입력(지인의 지인) 프로필은 등록자 외 비노출
  if (profile.identityPending && !isMine) {
    return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });
  }

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
  if (!profile) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  // 지인의 지인 — 당사자 이름·연락처 최초 입력 (§7.9)
  // 권한: 등록자 or 다리 역할 지인(이름+연락처 해시 일치 회원). canEdit과 별개 경로
  if (body.action === "fillIdentity") {
    if (!profile.identityPending) {
      return NextResponse.json({ error: "이미 정보가 입력된 프로필이에요" }, { status: 400 });
    }
    let allowed = profile.ownerId === userId;
    if (!allowed) {
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, phoneHash: true },
      });
      allowed =
        !!me?.phoneHash && me.phoneHash === profile.viaPhoneHash && me.name === profile.viaName;
    }
    if (!allowed) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone : "";
    if (!name || name.length > 30 || !PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "이름과 연락처를 확인해 주세요" }, { status: 400 });
    }
    if (!body.consentConfirmed) {
      return NextResponse.json({ error: "당사자 등록 동의 확인이 필요해요" }, { status: 400 });
    }

    const phoneHash = hashPhone(phone);
    await prisma.profile.update({
      where: { id },
      data: {
        name,
        phone: encryptPhone(phone.replace(/-/g, "")),
        phoneHash,
        identityPending: false,
        consentConfirmed: true,
        consentNotifiedAt: new Date(),
      },
    });

    // 당사자가 이미 회원이면 즉시 클레임 연동
    const existingUser = await prisma.user.findFirst({ where: { phoneHash, name } });
    if (existingUser) {
      const alreadyLinked = await prisma.profile.findFirst({
        where: { userId: existingUser.id },
        select: { id: true },
      });
      if (!alreadyLinked) {
        await prisma.profile.update({
          where: { id },
          data: { userId: existingUser.id, claimedAt: new Date() },
        });
        await notify(existingUser.id, "PROFILE_REGISTERED_CONSENT", { profileId: id });
      }
    }

    if (profile.ownerId !== userId) {
      await notify(profile.ownerId, "PROFILE_IDENTITY_FILLED", { profileId: id, name });
    }
    return NextResponse.json({ ok: true });
  }

  // 편집 가능자(당사자/등록자) + 관리자 (§12.4 — 관리자는 전체 카드 편집 가능)
  if (!(await canManageProfile(userId, profile))) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

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
        industry: d.industry,
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

  // 비가입자 공유 링크 발급 (/s/[token]) — 편집 가능자만, 노출 중 프로필만
  // body.photos: true → 사진 포함 링크, false/미지정 → 프로필만 (각각 별도 토큰)
  if (body.action === "share") {
    if (profile.status !== "ACTIVE" || profile.identityPending) {
      return NextResponse.json({ error: "정보 입력이 완료된, 노출 중인 프로필만 공유할 수 있어요" }, { status: 400 });
    }
    const withPhotos = !!body.photos;
    let token = withPhotos ? profile.sharePhotoToken : profile.shareToken;
    if (!token) {
      token = crypto.randomBytes(16).toString("hex");
      await prisma.profile.update({
        where: { id },
        data: withPhotos ? { sharePhotoToken: token } : { shareToken: token },
      });
    }
    return NextResponse.json({ ok: true, token, photos: withPhotos });
  }

  // 공유 링크 회수 — 두 종류 모두 즉시 무효화
  if (body.action === "unshare") {
    await prisma.profile.update({
      where: { id },
      data: { shareToken: null, sharePhotoToken: null },
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

// DELETE /api/profiles/[id] — 카드 완전 삭제 (§7.11)
// 잘못 등록했거나 지인이 다른 곳에서 커플이 된 경우 등. 사진(Storage)·호감·열람권·신고까지 함께 제거.
// 권한: 편집 가능자(당사자/등록자) + 관리자. 성사(Match) 이력이 있으면 일반 회원은 삭제 불가(관리자만).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { photos: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "이미 삭제된 프로필이에요" }, { status: 404 });
  }

  const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = viewer?.role === "ADMIN";
  if (!isAdmin && !canEditProfile(userId, profile)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

  // 성사 이력 — 상대의 성사 기록 보호를 위해 일반 회원은 삭제 대신 숨기기 안내
  const matches = await prisma.match.findMany({
    where: { OR: [{ profileAId: id }, { profileBId: id }] },
    select: { profileAId: true, profileBId: true },
  });
  if (matches.length > 0 && !isAdmin) {
    return NextResponse.json(
      { error: "성사 이력이 있는 카드는 삭제할 수 없어요. 숨기기를 이용하거나 관리자에게 문의해 주세요" },
      { status: 400 },
    );
  }
  const counterpartIds = matches.map((m) => (m.profileAId === id ? m.profileBId : m.profileAId));

  const likes = await prisma.like.findMany({
    where: { OR: [{ fromProfileId: id }, { toProfileId: id }] },
    select: { id: true },
  });
  const likeIds = likes.map((l) => l.id);
  const photoUrls = profile.photos.map((p) => p.url);

  await prisma.$transaction([
    prisma.report.deleteMany({ where: { profileId: id } }),
    prisma.moderationFlag.deleteMany({ where: { profileId: id } }),
    prisma.matchProposal.deleteMany({ where: { OR: [{ profileAId: id }, { profileBId: id }] } }),
    // 관리자 강제 삭제 시에만 도달 — Match 제거 후 상대 프로필은 탐색으로 복귀
    ...(matches.length > 0
      ? [
          prisma.match.deleteMany({ where: { OR: [{ profileAId: id }, { profileBId: id }] } }),
          prisma.profile.updateMany({
            where: { id: { in: counterpartIds }, status: "MATCHED" },
            data: { status: "ACTIVE" },
          }),
        ]
      : []),
    // 이 카드가 주고받은 호감으로 발급된 열람권까지 함께 회수 (양방향)
    prisma.photoAccess.deleteMany({
      where: {
        OR: [{ profileId: id }, ...(likeIds.length ? [{ likeId: { in: likeIds } }] : [])],
      },
    }),
    prisma.like.deleteMany({ where: { OR: [{ fromProfileId: id }, { toProfileId: id }] } }),
    prisma.profileView.deleteMany({ where: { profileId: id } }),
    // payload에 이 프로필을 가리키는 알림 제거 (남겨두면 클릭 시 404)
    prisma.notification.deleteMany({ where: { payload: { path: ["profileId"], equals: id } } }),
    prisma.profilePhoto.deleteMany({ where: { profileId: id } }),
    prisma.profile.delete({ where: { id } }),
  ]);

  // Storage 사진 삭제 (DB 정리 후 — 실패해도 원본 URL 노출 경로는 이미 제거됨)
  for (const url of photoUrls) {
    await deletePhotoByUrl(url).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
