import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 카드덱 — 내가 등록한 지인들의 매칭 현황 (PAGE_IA §2.6)
export default async function DeckPage() {
  const session = await auth();
  const userId = session!.user.id;

  const cards = await prisma.profile.findMany({
    where: { ownerId: userId, isSelf: false },
    include: {
      photos: { where: { isMain: true }, take: 1 },
      likesSent: { where: { status: { in: ["PENDING", "PHOTO_GRANTED"] } }, select: { id: true } },
      likesReceived: { where: { status: { in: ["PENDING", "PHOTO_GRANTED"] } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const withState = cards.map((c) => {
    const busy = c.likesSent.length + c.likesReceived.length > 0;
    const state: "done" | "busy" | "wait" | "hidden" =
      c.status === "MATCHED" ? "done" : c.status === "HIDDEN" ? "hidden" : busy ? "busy" : "wait";
    return { ...c, state };
  });

  const counts = {
    total: cards.length,
    busy: withState.filter((c) => c.state === "busy").length,
    done: withState.filter((c) => c.state === "done").length,
  };

  const borders = {
    wait: "border-[#3A362E]",
    busy: "border-yellow",
    done: "border-grn",
    hidden: "border-line opacity-60",
  };
  const stateLabel = { wait: "대기", busy: "진행 중", done: "성사", hidden: "숨김" };
  const stateBg = {
    wait: "bg-[#3A362E] text-white",
    busy: "bg-yellow text-[#6B5B1E]",
    done: "bg-grn text-white",
    hidden: "bg-line text-sub",
  };

  return (
    <main className="px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-tight">내 카드덱 🃏</h1>
      <p className="mb-4 mt-0.5 text-sm text-sub">등록한 지인들의 매칭 현황이에요.</p>

      <div className="mb-4 flex gap-2.5">
        {(
          [
            [counts.total, "등록", ""],
            [counts.busy, "진행 중", "text-[#D4A902]"],
            [counts.done, "성사 🎓", "text-grn"],
          ] as const
        ).map(([n, t, color]) => (
          <div key={t} className="flex-1 rounded-2xl bg-white px-2 py-3 text-center shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
            <p className={`text-[21px] font-extrabold ${color}`}>{n}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-sub">{t}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {withState.map((c) => (
          <Link
            key={c.id}
            href={`/p/${c.id}`}
            className={`relative overflow-hidden rounded-[20px] border-[2.5px] bg-white shadow-[0_2px_12px_rgba(28,27,24,0.06)] ${borders[c.state]}`}
          >
            <span className={`absolute right-2.5 top-2.5 z-[2] rounded-full px-2 py-1 text-[10px] font-extrabold ${stateBg[c.state]}`}>
              {stateLabel[c.state]}
            </span>
            <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-[#EEE9DF] to-[#DFD8C8]">
              {c.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photos[0].url} alt="" className="h-full w-full object-cover" />
              ) : (
                // 사진 미등록 — 성별 아이콘 (v1.5)
                <span className="text-5xl">{c.gender === "MALE" ? "🙋‍♂️" : "🙋‍♀️"}</span>
              )}
              {c.state === "done" && (
                <div className="absolute inset-0 z-[1] flex items-center justify-center bg-grn/10">
                  <b className="-rotate-6 rounded-full border-[1.5px] border-grn bg-white px-4 py-1.5 text-sm text-grn shadow">
                    졸업 🎓
                  </b>
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-base font-extrabold">
                {c.identityPending ? (c.pendingLabel ?? "이름 미입력") : c.name}{" "}
                <span className="text-[13px] font-semibold text-sub">
                  {new Date().getFullYear() - c.birthYear + 1}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-sub">
                {c.jobTitle} · 🎭 {c.nickname}
              </p>
              {c.claimedAt && (
                <p className="mt-1 text-[11px] font-bold text-thread">
                  🔗 본인 가입 연동{!c.ownerCanEdit ? " · 열람만 가능" : ""}
                </p>
              )}
              {c.identityPending && (
                <p className="mt-1 text-[11px] font-bold text-[#B08900]">
                  ⏳ 이름·연락처 입력 대기{c.viaName ? ` (지인 ${c.viaName})` : ""}
                </p>
              )}
            </div>
          </Link>
        ))}
        <Link
          href="/deck/new"
          className="flex min-h-[210px] flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed border-[#D9CFBF] text-sm font-bold text-sub"
        >
          <span className="text-[26px]">＋</span>
          지인 카드 추가
        </Link>
      </div>
      {/* TODO(phase-2): 중매인 매칭 제안 ("이 둘 어때?"), 마담뚜 리더보드 */}
    </main>
  );
}
