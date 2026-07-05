import { prisma } from "@/lib/prisma";

// 노출 회피 규칙 (PROJECT_SPEC §7.3)
// ① 같은 회사 상호 비노출: 어느 한쪽이라도 avoidSameCompany=true면 숨김
// ② 아는 사람 피하기: 내가 등록한 번호의 프로필 숨김 + 내 번호를 등록한 회원에게 나를 숨김

export function normalizeCompany(c: string): string {
  return c
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\(주\)|주식회사|㈜/g, "");
}

export type ViewerContext = {
  userId: string;
  companyNorm: string;
  phoneHash: string | null;
  avoidSameCompany: boolean; // 내 본인 프로필 설정 (없으면 true)
  blockSet: Set<string>; // 내가 등록한 연락처 해시
};

export async function getViewerContext(userId: string): Promise<ViewerContext> {
  const [user, self, blocks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { company: true, phoneHash: true },
    }),
    prisma.profile.findFirst({
      where: { userId },
      select: { avoidSameCompany: true },
    }),
    prisma.contactBlock.findMany({ where: { userId }, select: { phoneHash: true } }),
  ]);
  return {
    userId,
    companyNorm: normalizeCompany(user?.company ?? ""),
    phoneHash: user?.phoneHash ?? null,
    avoidSameCompany: self?.avoidSameCompany ?? true,
    blockSet: new Set(blocks.map((b) => b.phoneHash)),
  };
}

type VisibilityFields = {
  id: string;
  company: string;
  phoneHash: string | null;
  avoidSameCompany: boolean;
  userId: string | null;
  ownerId: string;
};

export async function filterVisibleProfiles<T extends VisibilityFields>(
  ctx: ViewerContext,
  profiles: T[],
): Promise<T[]> {
  // 상대(회원인 경우)가 내 번호를 차단 목록에 등록했는지 일괄 조회
  const subjectIds = profiles.map((p) => p.userId).filter((v): v is string => !!v);
  const blockedMe =
    ctx.phoneHash && subjectIds.length
      ? await prisma.contactBlock.findMany({
          where: { phoneHash: ctx.phoneHash, userId: { in: subjectIds } },
          select: { userId: true },
        })
      : [];
  const blockedMeSet = new Set(blockedMe.map((b) => b.userId));

  return profiles.filter((p) => {
    // 내가 등록/소유한 프로필은 항상 보임
    if (p.ownerId === ctx.userId || p.userId === ctx.userId) return true;
    if (
      ctx.companyNorm &&
      normalizeCompany(p.company) === ctx.companyNorm &&
      (p.avoidSameCompany || ctx.avoidSameCompany)
    ) {
      return false;
    }
    if (p.phoneHash && ctx.blockSet.has(p.phoneHash)) return false;
    if (p.userId && blockedMeSet.has(p.userId)) return false;
    // TODO(phase-2): 대리 등록 프로필 당사자의 차단 목록 반영 (비회원이라 현재는 불가)
    return true;
  });
}

export async function isProfileVisible(
  ctx: ViewerContext,
  profile: VisibilityFields,
): Promise<boolean> {
  return (await filterVisibleProfiles(ctx, [profile])).length === 1;
}
