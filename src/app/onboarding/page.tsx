import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ClaimEditDecision } from "@/components/ClaimEditDecision";

export const dynamic = "force-dynamic";

// 가입 직후 역할 분기 — 가입은 가볍게, 역할은 행동으로 (PROJECT_SPEC §5)
export default async function OnboardingPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // 클레임(대리 등록 연동)된 프로필이 있고 편집 권한 공유가 미결정이면 먼저 묻는다
  const claimed = userId
    ? await prisma.profile.findFirst({
        where: { userId, isSelf: false, claimedAt: { not: null }, editShareDecidedAt: null },
        include: { owner: { select: { name: true } } },
      })
    : null;

  const cards = [
    { href: "/me/profile", emoji: "💘", title: "나 소개팅 할래요", desc: "내 프로필을 만들고 인연을 찾아요" },
    { href: "/deck/new", emoji: "🃏", title: "지인 추천할래요", desc: "아까운 내 지인, 카드덱에 등록해요" },
    { href: "/me/profile", emoji: "🙌", title: "둘 다 할래요", desc: "내 프로필부터 만들고 지인도 등록해요" },
  ];

  return (
    <main className="px-6 py-12">
      <h1 className="text-[22px] font-extrabold tracking-tight">환영해요! 무엇부터 할까요?</h1>
      <p className="mt-1 text-sm text-sub">언제든 바꿀 수 있어요.</p>

      {claimed && (
        <div className="mt-6">
          <ClaimEditDecision profileId={claimed.id} ownerName={claimed.owner.name} />
        </div>
      )}

      <div className="mt-8 space-y-3">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(28,27,24,0.06)] active:scale-[0.98]"
          >
            <span className="text-3xl">{c.emoji}</span>
            <span>
              <span className="block text-base font-extrabold">{c.title}</span>
              <span className="block text-[13px] text-sub">{c.desc}</span>
            </span>
          </Link>
        ))}
        <Link href="/home" className="block py-3 text-center text-sm font-semibold text-sub">
          나중에 하기
        </Link>
      </div>
    </main>
  );
}
