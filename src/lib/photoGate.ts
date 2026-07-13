import { prisma } from "@/lib/prisma";
import { Gender } from "@prisma/client";

// 대칭 사진 gate (PROJECT_SPEC §9.0 v1.5)
// 모든 사진은 성별 무관 비공개. 열람 가능: 본인/등록자, 사진 교환(EXCHANGE)·성사(MATCH) 열람권 보유자.
// 관리자는 운영 목적(신고 검토 등) 전체 열람 가능 (§7.2, §12.4)
// 권한 없으면 원본 URL을 아예 응답에서 제외한다 (CSS blur 금지)

export async function canViewPhotos(
  viewerId: string,
  profile: { id: string; gender: Gender; ownerId: string; userId: string | null },
): Promise<boolean> {
  if (profile.ownerId === viewerId || profile.userId === viewerId) return true;

  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: { role: true },
  });
  if (viewer?.role === "ADMIN") return true;

  const access = await prisma.photoAccess.findUnique({
    where: { profileId_viewerId: { profileId: profile.id, viewerId } },
  });
  return !!access && !access.revokedAt;
}
