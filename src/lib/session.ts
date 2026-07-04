import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// 열람자 성별 — 사진 비대칭 gate 판정용 (본인 프로필의 gender에서 파생)
// 본인 프로필이 없으면 null → 여성 사진은 잠금 처리
export async function getViewerGender(userId: string) {
  const self = await prisma.profile.findFirst({
    where: { userId, isSelf: true },
    select: { id: true, gender: true },
  });
  return self;
}
