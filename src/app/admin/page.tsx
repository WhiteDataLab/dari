import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminReportActions } from "@/components/AdminReportActions";

export const dynamic = "force-dynamic";

// 관리자 대시보드 (스펙 §12.4) — 회원·가입 추이·매칭 퍼널·성사·신고
const KST_OFFSET = 9 * 3600000;

function kstDayKey(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET).toISOString().slice(5, 10); // MM-DD
}

const REASON_LABEL: Record<string, string> = {
  OBSCENE: "음란성", AD_SPAM: "광고·스팸", ILLEGAL: "불법", FAKE_INFO: "허위 정보",
  NO_CONSENT: "미동의 등록", CONTACT_LEAK: "연락처 노출", ETC: "기타",
};
const REPORT_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기", RESOLVED_REMOVED: "숨김 확정", RESOLVED_DISMISSED: "기각",
};

export default async function AdminPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role !== "ADMIN") redirect("/home");

  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000);
  const d14 = new Date(now - 14 * 86400000);

  const [
    totalUsers, deletedUsers, newUsers7d, recentSignups,
    totalProfiles, selfProfiles, femaleProfiles, pendingIdentity, matchedProfiles, hiddenProfiles,
    likeGroups, totalMatches, recentMatches,
    reportPending, recentReports, users,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: d7 }, deletedAt: null } }),
    prisma.user.findMany({ where: { createdAt: { gte: d14 } }, select: { createdAt: true } }),
    prisma.profile.count(),
    prisma.profile.count({ where: { isSelf: true } }),
    prisma.profile.count({ where: { gender: "FEMALE" } }),
    prisma.profile.count({ where: { identityPending: true } }),
    prisma.profile.count({ where: { status: "MATCHED" } }),
    prisma.profile.count({ where: { status: "HIDDEN" } }),
    prisma.like.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.match.count(),
    prisma.match.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        profileA: { select: { name: true, nickname: true } },
        profileB: { select: { name: true, nickname: true } },
      },
    }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        profile: { select: { id: true, name: true, nickname: true, status: true } },
        reporter: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, name: true, company: true, role: true, createdAt: true, deletedAt: true,
        referredBy: { select: { name: true } },
        _count: { select: { profiles: true, referrals: true } },
      },
    }),
  ]);

  const likeCount = (s: string) =>
    likeGroups.find((g) => g.status === s)?._count._all ?? 0;
  const likesSent = likeGroups.reduce((sum, g) => sum + g._count._all, 0);
  const photoGranted = likeCount("PHOTO_GRANTED") + likeCount("ACCEPTED");
  const accepted = likeCount("ACCEPTED");

  // 최근 14일 가입 추이 (KST 일 단위)
  const days: { key: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    days.push({ key: kstDayKey(new Date(now - i * 86400000)), count: 0 });
  }
  for (const u of recentSignups) {
    const k = kstDayKey(u.createdAt);
    const slot = days.find((d) => d.key === k);
    if (slot) slot.count++;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const statCards: [string, string | number, string?][] = [
    ["전체 회원", totalUsers - deletedUsers, deletedUsers ? `탈퇴 ${deletedUsers}` : undefined],
    ["주간 신규", newUsers7d],
    ["프로필", totalProfiles, `본인 ${selfProfiles} · 대리 ${totalProfiles - selfProfiles}`],
    ["여성 비율", totalProfiles ? `${Math.round((femaleProfiles / totalProfiles) * 100)}%` : "-"],
    ["누적 성사", totalMatches],
    ["미처리 신고", reportPending, pendingIdentity ? `정보 대기 ${pendingIdentity}` : undefined],
  ];

  const card = "rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)]";
  const h2 = "mb-2 mt-7 text-sm font-extrabold text-sub";

  return (
    <main className="px-5 py-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight">관리자 🛠</h1>
        <Link href="/home" className="text-sm font-bold text-sub">홈으로 ›</Link>
      </div>
      <p className="mt-0.5 text-sm text-sub">서비스 전체 현황이에요. (ADMIN 전용)</p>

      {/* 핵심 지표 */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {statCards.map(([label, value, sub]) => (
          <div key={label} className="rounded-2xl bg-white px-2 py-3 text-center shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
            <p className="text-[20px] font-extrabold">{value}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-sub">{label}</p>
            {sub && <p className="text-[10px] text-[#B4AB9B]">{sub}</p>}
          </div>
        ))}
      </div>

      {/* 매칭 퍼널 */}
      <h2 className={h2}>매칭 퍼널</h2>
      <div className={card}>
        {(
          [
            ["호감 발신", likesSent],
            ["사진 공개 (여성 수락)", photoGranted],
            ["최종 성사", accepted],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
            <span className="w-40 flex-shrink-0 text-[13px] font-semibold text-sub">{label}</span>
            <span className="h-2.5 rounded-full bg-blue" style={{ width: `${likesSent ? Math.max(4, (n / likesSent) * 100) : 4}%` }} />
            <span className="text-sm font-extrabold">{n}</span>
          </div>
        ))}
        <p className="pt-2 text-[11px] text-[#B4AB9B]">
          만료 {likeCount("EXPIRED")} · 거절 {likeCount("REJECTED")} · 성사 프로필 {matchedProfiles} · 숨김 {hiddenProfiles}
        </p>
      </div>

      {/* 가입 추이 */}
      <h2 className={h2}>가입 추이 (최근 14일)</h2>
      <div className={`${card} flex items-end gap-1`}>
        {days.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-sub">{d.count > 0 ? d.count : ""}</span>
            <div
              className={`w-full rounded-t ${d.count > 0 ? "bg-blue" : "bg-line"}`}
              style={{ height: `${Math.max(4, (d.count / maxDay) * 56)}px` }}
            />
            <span className="text-[9px] text-[#B4AB9B]">{d.key.slice(3)}</span>
          </div>
        ))}
      </div>

      {/* 신고 현황 */}
      <h2 className={h2}>신고 현황 {reportPending > 0 && <span className="text-thread">· 대기 {reportPending}건</span>}</h2>
      <div className={card}>
        {recentReports.length === 0 && (
          <p className="py-6 text-center text-sm text-sub">접수된 신고가 없어요 ✅</p>
        )}
        {recentReports.map((r) => (
          <div key={r.id} className="border-b border-line py-3 last:border-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">
                <Link href={`/p/${r.profile.id}`} className="text-blue">
                  {r.profile.name || r.profile.nickname}
                </Link>{" "}
                <span className="font-semibold text-sub">— {REASON_LABEL[r.reason] ?? r.reason}</span>
              </p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                r.status === "PENDING" ? "bg-yellow-tint text-[#B08900]" : "bg-line text-sub"
              }`}>
                {REPORT_STATUS_LABEL[r.status]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-sub">
              신고자 {r.reporter.name} · {r.createdAt.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
              {r.detail && ` · "${r.detail}"`}
              {r.profile.status === "HIDDEN" && " · 현재 숨김 상태"}
            </p>
            {r.status === "PENDING" && <AdminReportActions reportId={r.id} />}
          </div>
        ))}
      </div>

      {/* 성사 목록 */}
      <h2 className={h2}>최근 성사</h2>
      <div className={card}>
        {recentMatches.length === 0 && (
          <p className="py-6 text-center text-sm text-sub">아직 성사가 없어요</p>
        )}
        {recentMatches.map((m) => (
          <div key={m.id} className="flex items-center justify-between border-b border-line py-3 text-sm last:border-0">
            <span className="font-bold">
              {m.profileA.name || m.profileA.nickname} ❤ {m.profileB.name || m.profileB.nickname}
            </span>
            <span className="text-xs text-sub">
              {m.degreeOfSeparation ? `${m.degreeOfSeparation}다리 · ` : ""}
              {m.createdAt.toLocaleDateString("ko-KR")}
            </span>
          </div>
        ))}
      </div>

      {/* 회원 목록 */}
      <h2 className={h2}>회원 목록 (최근 50명)</h2>
      <div className={card}>
        {users.map((u) => (
          <div key={u.id} className="border-b border-line py-3 last:border-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">
                {u.name}
                {u.role === "ADMIN" && <span className="ml-1.5 rounded bg-blue-tint px-1.5 py-0.5 text-[10px] font-extrabold text-blue">ADMIN</span>}
                {u.deletedAt && <span className="ml-1.5 rounded bg-line px-1.5 py-0.5 text-[10px] font-bold text-sub">탈퇴</span>}
              </p>
              <span className="text-xs text-sub">{u.createdAt.toLocaleDateString("ko-KR")}</span>
            </div>
            <p className="mt-0.5 text-xs text-sub">
              {u.company || "-"}
              {u.referredBy && ` · 초대: ${u.referredBy.name}`}
              {` · 프로필 ${u._count.profiles} · 초대한 지인 ${u._count.referrals}`}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
