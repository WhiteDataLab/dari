import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 내가 다리 역할인 "지인의 지인" 프로필 목록 — 이름·연락처 입력 대기 (§7.9)
export default async function MyIdentifyListPage() {
  const session = await auth();
  const userId = session!.user.id;

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phoneHash: true },
  });

  const profiles = me?.phoneHash
    ? await prisma.profile.findMany({
        where: { identityPending: true, viaPhoneHash: me.phoneHash, viaName: me.name },
        include: { owner: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-tight">입력을 기다리는 지인 ✍️</h1>
      <p className="mb-5 mt-0.5 text-sm text-sub">
        나를 다리 삼아 등록된 프로필이에요. 당사자의 이름·연락처를 입력해 주세요.
      </p>

      {profiles.length === 0 && (
        <p className="py-16 text-center text-sm text-sub">입력을 기다리는 프로필이 없어요 🧵</p>
      )}

      {profiles.map((p) => (
        <Link
          key={p.id}
          href={`/p/${p.id}/identify`}
          className="mb-3 block rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)]"
        >
          <p className="text-base font-extrabold">
            {p.nickname}{" "}
            <span className="text-sm font-semibold text-sub">
              {new Date().getFullYear() - p.birthYear + 1}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-sub">
            {p.areaSido} {p.areaGugun} · {p.jobTitle}
          </p>
          <p className="mt-1.5 text-xs font-semibold text-thread">
            {p.owner.name}님이 등록 · 이름·연락처 입력하기 ›
          </p>
        </Link>
      ))}
    </main>
  );
}
