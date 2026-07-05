import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { InviteCard, NamePathToggle, MenuLinks, LogoutButton } from "@/components/MyMenu";

export const dynamic = "force-dynamic";

// MY — 추천코드 공유가 성장 엔진이므로 최상단 (PAGE_IA §2.11)
export default async function MyPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { name: true, referralCode: true, allowNameInPath: true },
  });
  if (!user) return null;

  return (
    <main className="px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-tight">MY</h1>
      <p className="mb-5 mt-0.5 text-sm text-sub">
        {user.name}님, 지인이 늘수록 인연도 늘어요.
      </p>

      <InviteCard code={user.referralCode} />

      <div className="mt-4 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <MenuLinks />
        <NamePathToggle initial={user.allowNameInPath} />
        <LogoutButton />
      </div>

      <Link
        href="/me/delete"
        className="mt-4 block py-2 text-center text-[13px] font-medium text-[#B4AB9B]"
      >
        회원 탈퇴
      </Link>
    </main>
  );
}
