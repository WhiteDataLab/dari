import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LikeActions } from "@/components/LikeActions";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  NOT_READY: "지금은 연애 생각이 없어요",
  NOT_MY_TYPE: "이상형과 조금 달랐어요",
  KNOW_EACH_OTHER: "아는 사이라서요",
  TOO_FAR: "거리가 멀어서요",
  NO_REASON: "",
};

function dday(date: Date): string {
  const days = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
  return `D-${days}`;
}

// 호감함 (PAGE_IA §2.8) — 받은/보낸 탭
export default async function LikesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { tab = "in" } = await searchParams;

  const myProfiles = await prisma.profile.findMany({
    where: { OR: [{ ownerId: userId }, { userId }] },
    select: { id: true },
  });
  const ids = myProfiles.map((p) => p.id);

  const [received, sent] = await Promise.all([
    prisma.like.findMany({
      where: { toProfileId: { in: ids }, status: "PENDING" },
      include: { fromProfile: { include: { photos: { where: { isMain: true }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.like.findMany({
      where: { fromProfileId: { in: ids } },
      include: { toProfile: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 읽음 처리: 호감함 진입 시 알림 소거
  await prisma.notification.updateMany({
    where: { userId, readAt: null, type: { in: ["LIKE_RECEIVED", "LIKE_ACCEPTED", "LIKE_REJECTED", "LIKE_EXPIRED"] } },
    data: { readAt: new Date() },
  });

  const tabCls = (active: boolean) =>
    `flex-1 rounded-[10px] py-2.5 text-center text-sm font-bold ${
      active ? "bg-white text-ink shadow-[0_2px_12px_rgba(28,27,24,0.06)]" : "text-sub"
    }`;

  return (
    <main className="px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-tight">호감함 💚</h1>
      <p className="mb-4 mt-0.5 text-sm text-sub">받은 호감은 7일 안에 응답해 주세요.</p>

      <div className="mb-4 flex gap-1.5 rounded-[14px] bg-[#F1EADF] p-1.5">
        <Link href="/likes?tab=in" className={tabCls(tab === "in")}>받은 호감</Link>
        <Link href="/likes?tab=out" className={tabCls(tab === "out")}>보낸 호감</Link>
      </div>

      {tab === "in" && (
        <div>
          {received.length === 0 && (
            <p className="py-16 text-center text-sm text-sub">아직 받은 호감이 없어요 🧵</p>
          )}
          {received.map((like) => {
            const p = like.fromProfile;
            const femaleInitiated = p.gender === "FEMALE"; // 사진 동봉
            return (
              <div key={like.id} className="mb-3 rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
                <Link href={`/p/${p.id}`} className="flex items-center gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#EEE9DF] to-[#DFD8C8] text-2xl">
                    {femaleInitiated && p.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" />
                    ) : p.gender === "MALE" && p.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold">
                      {p.name}, {new Date().getFullYear() - p.birthYear + 1}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-sub">
                      {p.jobTitle}
                      {femaleInitiated && " · 📸 사진 동봉"}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-blue-tint px-2.5 py-1 text-[11px] font-extrabold text-blue">
                    {dday(like.expiresAt)}
                  </span>
                </Link>
                <LikeActions likeId={like.id} acceptLabel="수락하기 💚" />
              </div>
            );
          })}
        </div>
      )}

      {tab === "out" && (
        <div>
          {sent.length === 0 && (
            <p className="py-16 text-center text-sm text-sub">
              마음에 드는 인연에게 먼저 다가가 보세요 📮
            </p>
          )}
          {sent.map((like) => {
            const p = like.toProfile;
            const badge = {
              PENDING: ["전달됨 " + dday(like.expiresAt), "bg-yellow-tint text-[#B08900]"],
              PHOTO_GRANTED: ["📸 사진 공개됨", "bg-grn-tint text-grn"],
              ACCEPTED: ["성사 🎉", "bg-grn-tint text-grn"],
              REJECTED: [
                "거절" + (like.rejectReason && REASON_LABEL[like.rejectReason] ? ` · ${REASON_LABEL[like.rejectReason]}` : ""),
                "bg-[#FBEAEA] text-[#C43D3D]",
              ],
              EXPIRED: ["기한 만료", "bg-[#F1EDE6] text-sub"],
            }[like.status];
            return (
              <div key={like.id} className="mb-3 rounded-[20px] bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-extrabold">
                      {p.name}, {new Date().getFullYear() - p.birthYear + 1}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-sub">
                      {p.jobTitle}
                      {like.status === "PHOTO_GRANTED" &&
                        like.finalDeadline &&
                        ` · 최종 결정 ${dday(like.finalDeadline)}`}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${badge[1]}`}>
                    {badge[0]}
                  </span>
                </div>
                {like.status === "PHOTO_GRANTED" && (
                  <Link
                    href={`/p/${p.id}`}
                    className="mt-3 block rounded-xl bg-blue py-3 text-center text-sm font-extrabold text-white"
                  >
                    사진 보고 최종 결정하기 →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* TODO(phase-2): 중매인 제안 탭 */}
    </main>
  );
}
