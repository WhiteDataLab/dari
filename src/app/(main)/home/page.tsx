import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeRelationPath } from "@/lib/relationPath";
import { getViewerContext, filterVisibleProfiles } from "@/lib/visibility";
import { CardDeck } from "@/components/CardDeck";

export const dynamic = "force-dynamic";

// 탐색 피드 (PAGE_IA §2.4)
export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [myProfiles, viewerSelf, me] = await Promise.all([
    // 내가 등록한 프로필 + 클레임 연동된 내 프로필 (거절 이력 제외 계산용)
    prisma.profile.findMany({
      where: { OR: [{ ownerId: userId }, { userId }] },
      select: { id: true },
    }),
    prisma.profile.findFirst({
      where: { userId },
      include: { _count: { select: { photos: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, phoneHash: true } }),
  ]);

  // 내가 다리 역할인 "지인의 지인" 프로필 — 이름·연락처 입력 대기 건수
  const identityRequests = me?.phoneHash
    ? await prisma.profile.count({
        where: { identityPending: true, viaPhoneHash: me.phoneHash, viaName: me.name },
      })
    : 0;
  const myIds = myProfiles.map((p) => p.id);

  // 거절 이력 상대 제외 (양방향)
  const rejected = myIds.length
    ? await prisma.like.findMany({
        where: {
          status: "REJECTED",
          OR: [{ fromProfileId: { in: myIds } }, { toProfileId: { in: myIds } }],
        },
        select: { fromProfileId: true, toProfileId: true },
      })
    : [];
  const excludeIds = new Set<string>(myIds);
  for (const r of rejected) {
    excludeIds.add(r.fromProfileId);
    excludeIds.add(r.toProfileId);
  }

  const candidates = await prisma.profile.findMany({
    where: {
      status: "ACTIVE",
      identityPending: false, // 이름·연락처 미입력(지인의 지인) 프로필 제외
      id: { notIn: [...excludeIds] },
      ownerId: { not: userId },
      OR: [{ userId: null }, { userId: { not: userId } }],
    },
    include: { _count: { select: { photos: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // 같은 회사 회피 + 아는 사람 피하기 (상호 비노출)
  const ctx = await getViewerContext(userId);
  const profiles = await filterVisibleProfiles(ctx, candidates);

  // 사진은 성별 무관 비공개 (§9.0 v1.5) — 피드는 카드 뒷면 + 텍스트 프로필만
  const cards = await Promise.all(
    profiles.map(async (p) => {
      const path = await computeRelationPath(userId, p).catch(() => null);
      return {
        id: p.id,
        name: p.nickname, // 성사 전 실명 비공개 (PROJECT_SPEC §7.6)
        age: new Date().getFullYear() - p.birthYear + 1,
        area: `${p.areaSido} ${p.areaGugun}`,
        job: p.jobTitle,
        comment: p.recommenderComment,
        degree: path && !path.far ? path.degree : null,
        gender: p.gender,
        hasPhotos: p._count.photos > 0,
      };
    }),
  );

  const hasDeck = myProfiles.length > (viewerSelf ? 1 : 0);

  return (
    <main className="px-5">
      <header className="flex items-center justify-between py-4">
        <span className="logo-thread text-2xl font-extrabold">다리</span>
      </header>
      <h1 className="text-[22px] font-extrabold tracking-tight">오늘의 인연</h1>
      <p className="mb-4 mt-0.5 text-sm text-sub">
        카드를 탭해서 인연을 뽑아 보세요. 사진은 서로 교환을 수락해야 공개돼요.
      </p>

      {identityRequests > 0 && (
        <Link
          href="/me/identify"
          className="mb-2.5 block rounded-xl bg-yellow-tint px-3.5 py-3 text-[13px] font-semibold text-[#6B5B1E]"
        >
          ✍️ <b>이름·연락처 입력을 기다리는 지인 프로필이 {identityRequests}건</b> 있어요 ›
        </Link>
      )}
      {!viewerSelf &&
        (hasDeck ? (
          // 지인 추천만 하는 중매인 — 프로필 없이도 자유롭게 둘러볼 수 있음을 안내
          <div className="mb-2.5 rounded-xl bg-blue-tint px-3.5 py-3 text-[13px] font-semibold text-[#2B6CD4]">
            🃏 <b>중매인 모드로 둘러보는 중이에요</b> — 프로필 없이도 구경과 지인 추천은 자유예요.
            <Link href="/me/profile" className="ml-1 underline">
              나도 소개팅하려면 프로필 만들기 ›
            </Link>
          </div>
        ) : (
          <Link
            href="/me/profile"
            className="mb-2.5 block rounded-xl bg-blue-tint px-3.5 py-3 text-[13px] font-semibold text-[#2B6CD4]"
          >
            ✍️ <b>내 프로필을 만들어 주세요</b> — 프로필이 있어야 호감을 보낼 수 있어요
          </Link>
        ))}
      {viewerSelf && viewerSelf._count.photos === 0 && (
        <Link
          href="/me/profile"
          className="mb-2.5 block rounded-xl bg-yellow-tint px-3.5 py-3 text-[13px] font-semibold text-[#6B5B1E]"
        >
          📷 <b>사진이 아직 없어요</b> — 등록해 두면 사진 교환 단계에서 바로 보여줄 수 있어요
        </Link>
      )}
      {!hasDeck && (
        <Link
          href="/deck/new"
          className="mb-3.5 flex w-full items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#D9CFBF] bg-white px-3.5 py-3 text-left text-[13.5px] font-semibold text-sub"
        >
          🃏 소개해줄 지인이 있나요? <b className="text-ink">등록하면 카드덱이 열려요</b>
          <span className="ml-auto text-[17px] text-[#CFC6B6]">›</span>
        </Link>
      )}

      {cards.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          <p className="text-4xl">🧵</p>
          <p className="mt-3 font-bold">아직 프로필이 없어요</p>
          <p className="mt-1 text-sm text-sub">지인을 초대해 보세요</p>
          <Link href="/me" className="mt-4 inline-block rounded-xl bg-blue px-5 py-3 text-sm font-extrabold text-white">
            내 추천코드 공유하기
          </Link>
        </div>
      ) : (
        <CardDeck cards={cards} />
      )}
    </main>
  );
}
