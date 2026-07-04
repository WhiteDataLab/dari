import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  LIKE_RECEIVED: "💚 새로운 호감이 도착했어요",
  LIKE_ACCEPTED: "📸 상대가 수락했어요 — 사진이 공개됐어요",
  LIKE_REJECTED: "🍂 아쉽지만 이번 인연은 여기까지예요",
  LIKE_EXPIRED: "⏳ 응답 기한이 지나 종료됐어요",
  PROPOSAL_RECEIVED: "🤝 중매 제안이 도착했어요",
  MATCH_CREATED: "🎉 매칭 성사! 번호가 공개됐어요",
  VOUCH_REQUESTED: "🙋 보증 요청이 도착했어요",
  PROFILE_REGISTERED_CONSENT: "📋 내 프로필이 등록됐어요",
};

export default async function NotificationsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <main className="px-5 py-6">
      <h1 className="mb-5 text-[22px] font-extrabold tracking-tight">알림 🔔</h1>
      {notifications.length === 0 && (
        <p className="py-16 text-center text-sm text-sub">아직 알림이 없어요</p>
      )}
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`mb-2.5 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)] ${
            n.readAt ? "opacity-60" : ""
          }`}
        >
          <p className="text-sm font-bold">{TYPE_LABEL[n.type] ?? n.type}</p>
          <p className="mt-1 text-xs text-sub">
            {n.createdAt.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      ))}
    </main>
  );
}
