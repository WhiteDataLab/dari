import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encryptPhone } from "@/lib/crypto";
import { deletePhotoByUrl } from "@/lib/storage";

// PATCH /api/me — 이름 경로 노출 동의 토글
export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.allowNameInPath !== "boolean") {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { allowNameInPath: body.allowNameInPath },
  });
  return NextResponse.json({ ok: true });
}

// DELETE /api/me — 회원 탈퇴 (§7.10)
// 개인정보는 익명화·삭제하되, 추천 그래프(경로)·성사 이력의 FK 무결성을 위해 행 자체는 유지.
// 다른 회원에게 클레임된 프로필(당사자가 관리 중)은 건드리지 않는다.
export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: "이미 탈퇴한 계정이에요" }, { status: 400 });
  }

  // 정리 대상 프로필: 내 본인/클레임 프로필 + 내가 등록한 미클레임 대리 프로필
  const profiles = await prisma.profile.findMany({
    where: { OR: [{ userId }, { ownerId: userId, userId: null }] },
    include: { photos: true },
  });
  const photoUrls = profiles.flatMap((p) => p.photos.map((ph) => ph.url));
  const profileIds = profiles.map((p) => p.id);

  await prisma.$transaction([
    prisma.profilePhoto.deleteMany({ where: { profileId: { in: profileIds } } }),
    // 프로필 익명화 — Like/Match FK 때문에 삭제 대신 개인정보 제거 + 영구 숨김
    prisma.profile.updateMany({
      where: { id: { in: profileIds } },
      data: {
        status: "HIDDEN",
        name: "",
        phone: encryptPhone(""),
        phoneHash: null,
        viaName: null,
        viaPhone: null,
        viaPhoneHash: null,
        identityPending: false,
        shareToken: null,
        company: "",
        idealType: null,
        loveView: null,
        recommenderComment: null,
        mbti: null,
        hobbies: [],
      },
    }),
    // 진행 중 호감 종료 + 발급된 사진 열람권 회수
    prisma.like.updateMany({
      where: {
        status: { in: ["PENDING", "PHOTO_GRANTED"] },
        OR: [{ fromProfileId: { in: profileIds } }, { toProfileId: { in: profileIds } }],
      },
      data: { status: "EXPIRED", respondedAt: new Date() },
    }),
    prisma.photoAccess.updateMany({
      where: { profileId: { in: profileIds }, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.contactBlock.deleteMany({ where: { userId } }),
    prisma.companyBlock.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.emailVerification.deleteMany({ where: { email: user.email } }),
    // 계정 익명화 — 이메일 무효화로 재로그인 차단, 경로에는 "지인"으로만 표시
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted-${crypto.randomBytes(8).toString("hex")}@deleted.dari`,
        name: "탈퇴 회원",
        phone: encryptPhone(""),
        phoneHash: null,
        company: "",
        allowNameInPath: false,
      },
    }),
  ]);

  // Storage 사진 삭제 (DB 정리 후 — 실패해도 개인정보 노출 경로는 이미 차단됨)
  for (const url of photoUrls) {
    await deletePhotoByUrl(url).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
