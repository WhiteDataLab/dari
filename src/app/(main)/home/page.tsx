import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeRelationPath } from "@/lib/relationPath";
import { getViewerContext, filterVisibleProfiles } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// 탐색 피드 (PAGE_IA §2.4)
export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [myProfiles, viewerSelf] = await Promise.all([
    // 내가 등록한 프로필 + 클레임 연동된 내 프로필 (거절 이력 제외 계산용)
    prisma.profile.findMany({
      where: { OR: [{ ownerId: userId }, { userId }] },
      select: { id: true },
    }),
    prisma.profile.findFirst({
      where: { userId },
      include: { _count: { select: { photos: true } } },
    }),
  ]);
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
      id: { notIn: [...excludeIds] },
      ownerId: { not: userId },
      OR: [{ userId: null }, { userId: { not: userId } }],
    },
    include: { photos: { where: { isMain: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // 같은 회사 회피 + 아는 사람 피하기 (상호 비노출)
  const ctx = await getViewerContext(userId);
  const profiles = await filterVisibleProfiles(ctx, candidates);

  // 여성 사진 gate: 열람권 일괄 조회
  const accessSet = new Set(
    (
      await prisma.photoAccess.findMany({
        where: { viewerId: userId, revokedAt: null },
        select: { profileId: true },
      })
    ).map((a) => a.profileId),
  );
  const viewerIsFemale = viewerSelf?.gender === "FEMALE";

  const cards = await Promise.all(
    profiles.map(async (p) => {
      const locked = p.gender === "FEMALE" && !viewerIsFemale && !accessSet.has(p.id);
      const path = await computeRelationPath(userId, p).catch(() => null);
      return {
        id: p.id,
        name: p.nickname, // 성사 전 실명 비공개 (PROJECT_SPEC §7.6)
        age: new Date().getFullYear() - p.birthYear + 1,
        area: `${p.areaSido} ${p.areaGugun}`,
        job: p.jobTitle,
        comment: p.recommenderComment,
        photoUrl: locked ? null : (p.photos[0]?.url ?? null),
        locked,
        degree: path && !path.far ? path.degree : null,
      };
    }),
  );

  const profileIncomplete = !viewerSelf || viewerSelf._count.photos === 0;
  const hasDeck = myProfiles.length > (viewerSelf ? 1 : 0);

  return (
    <main className="px-5">
      <header className="flex items-center justify-between py-4">
        <span className="logo-thread text-2xl font-extrabold">다리</span>
      </header>
      <h1 className="text-[22px] font-extrabold tracking-tight">오늘의 인연</h1>
      <p className="mb-4 mt-0.5 text-sm text-sub">
        모두 누군가의 지인이에요. 몇 다리인지 확인해 보세요.
      </p>

      {profileIncomplete && (
        <Link
          href="/me/profile"
          className="mb-2.5 block rounded-xl bg-blue-tint px-3.5 py-3 text-[13px] font-semibold text-[#2B6CD4]"
        >
          ✍️ <b>내 프로필을 완성해 주세요</b> — 사진까지 등록해야 호감을 보낼 수 있어요
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
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/p/${c.id}`}
              className="overflow-hidden rounded-[20px] bg-white text-left shadow-[0_2px_12px_rgba(28,27,24,0.06)] active:scale-[0.97]"
            >
              <div
                className={`relative flex aspect-[4/5] items-center justify-center ${
                  c.locked || !c.photoUrl ? "bg-gradient-to-br from-[#EEE9DF] to-[#DFD8C8]" : ""
                }`}
              >
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-45 grayscale">👤</span>
                )}
                {c.degree && (
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-thread-soft px-2 py-0.5 text-[11px] font-bold text-thread">
                    🧵 {c.degree}다리
                  </span>
                )}
                {c.locked && (
                  <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-sub shadow">
                    🔒 수락 후 공개
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-base font-extrabold">
                  {c.name}{" "}
                  <span className="text-[13px] font-semibold text-sub">{c.age}</span>
                </p>
                <p className="mt-0.5 text-xs text-sub">
                  {c.area} · {c.job}
                </p>
                {c.comment && (
                  <p className="mt-1.5 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg bg-ivory px-2 py-1.5 text-xs text-[#6E6759]">
                    &ldquo;{c.comment}&rdquo;
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
