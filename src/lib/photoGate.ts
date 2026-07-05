import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";

// 비대칭 사진 gate (PROJECT_SPEC §9.0, DB_SCHEMA §5-5)
// 남성 사진: 전체 공개 / 여성 사진: PhotoAccess 보유자·여성·소유자만
// 권한 없으면 원본 URL을 아예 응답에서 제외한다 (CSS blur 금지)

export async function canViewPhotos(
  viewerId: string,
  profile: { id: string; gender: Gender; ownerId: string; userId: string | null },
): Promise<boolean> {
  if (profile.gender === "MALE") return true;
  if (profile.ownerId === viewerId || profile.userId === viewerId) return true;

  // 여성 열람자는 자유 열람 (중매인 포함 — 남성 중매인만 차단)
  const viewerSelf = await prisma.profile.findFirst({
    where: { userId: viewerId },
    select: { gender: true },
  });
  if (viewerSelf?.gender === "FEMALE") return true;

  const access = await prisma.photoAccess.findUnique({
    where: { profileId_viewerId: { profileId: profile.id, viewerId } },
  });
  return !!access && !access.revokedAt;
}
