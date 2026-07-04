import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptPhone } from "@/lib/crypto";
import { CopyPhone } from "@/components/CopyPhone";

export const dynamic = "force-dynamic";

// 성사 목록 — 전화번호 공개의 유일한 화면 (PAGE_IA §2.9)
export default async function MatchesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const myProfiles = await prisma.profile.findMany({
    where: { OR: [{ ownerId: userId }, { userId }] },
    select: { id: true },
  });
  const ids = myProfiles.map((p) => p.id);

  const matches = ids.length
    ? await prisma.match.findMany({
        where: { OR: [{ profileAId: { in: ids } }, { profileBId: { in: ids } }] },
        include: {
          profileA: { include: { photos: { where: { isMain: true }, take: 1 } } },
          profileB: { include: { photos: { where: { isMain: true }, take: 1 } } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-tight">성사 🎉</h1>
      <p className="mb-5 mt-0.5 text-sm text-sub">붉은 실이 이어졌어요. 이제 두 사람의 차례예요.</p>

      {matches.length === 0 && (
        <p className="py-16 text-center text-sm text-sub">
          아직 성사된 인연이 없어요.
          <br />
          붉은 실은 생각보다 가까이 있어요 🧵
        </p>
      )}

      {matches.map((m) => {
        const mineIsA = ids.includes(m.profileAId);
        const mine = mineIsA ? m.profileA : m.profileB;
        const other = mineIsA ? m.profileB : m.profileA;
        let phone = "";
        try {
          phone = decryptPhone(other.phone).replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
        } catch {
          phone = "번호 확인 불가";
        }
        return (
          <div
            key={m.id}
            className="relative mb-4 overflow-hidden rounded-3xl bg-white px-5 pb-5 pt-7 text-center shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
          >
            <div className="thread-line absolute left-0 right-0 top-0 h-1" />
            <div className="flex items-center justify-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#EEE9DF] to-[#DFD8C8] text-3xl">
                {mine.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mine.photos[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  "🙂"
                )}
              </div>
              <span className="mx-2 text-lg text-thread">❤️</span>
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFE3D6] to-[#FFD1E0] text-3xl">
                {other.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.photos[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  "🙂"
                )}
              </div>
            </div>
            <h3 className="mt-3 text-[19px] font-extrabold">
              {mine.name} ❤ {other.name}
            </h3>
            <p className="mt-1 text-[13px] text-sub">
              {m.createdAt.toLocaleDateString("ko-KR")} 성사
              {m.degreeOfSeparation && (
                <span className="ml-1.5 rounded-full bg-thread-soft px-2 py-0.5 text-[11px] font-bold text-thread">
                  🧵 {m.degreeOfSeparation}다리 커플
                </span>
              )}
            </p>
            <CopyPhone name={other.name} phone={phone} />
            {/* TODO(phase-3): 인연 경로 카드 만들어 카톡 공유 */}
          </div>
        );
      })}
    </main>
  );
}
