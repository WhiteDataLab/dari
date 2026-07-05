import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id ?? null;
  if (!id) return null;
  // 탈퇴 회원의 잔여 JWT 차단 (세션은 무상태라 DB에서 확인)
  const user = await prisma.user.findUnique({ where: { id }, select: { deletedAt: true } });
  return user && !user.deletedAt ? id : null;
}

// 관리자 확인 — JWT role은 스테일할 수 있어 DB에서 재확인
export async function requireAdmin(): Promise<string | null> {
  const userId = await requireUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "ADMIN" ? userId : null;
}

// 열람자 성별 — 사진 비대칭 gate 판정용 (본인 프로필의 gender에서 파생)
// 본인 프로필(직접 생성 or 클레임 연동)이 없으면 null → 여성 사진은 잠금 처리
export async function getViewerGender(userId: string) {
  const self = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true, gender: true },
  });
  return self;
}
