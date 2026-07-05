import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { IdentityFillForm } from "@/components/IdentityFillForm";

export const dynamic = "force-dynamic";

// 지인의 지인 — 당사자 이름·연락처 입력 화면 (다리 역할 지인 or 등록자)
export default async function IdentifyPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { owner: { select: { name: true } } },
  });
  if (!profile || !profile.identityPending) notFound();

  let allowed = profile.ownerId === userId;
  if (!allowed) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phoneHash: true },
    });
    allowed = !!me?.phoneHash && me.phoneHash === profile.viaPhoneHash && me.name === profile.viaName;
  }
  if (!allowed) notFound();

  const age = new Date().getFullYear() - profile.birthYear + 1;

  return (
    <main className="px-6 py-8">
      <h1 className="text-[20px] font-extrabold tracking-tight">지인 정보 입력 ✍️</h1>
      <p className="mt-1 text-sm leading-relaxed text-sub">
        {profile.owner.name}님이 회원님을 다리 삼아 등록한 프로필이에요.
        <br />
        당사자의 이름과 연락처를 입력하면 탐색에 공개될 수 있어요.
      </p>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <p className="text-base font-extrabold">
          {profile.nickname} <span className="text-sm font-semibold text-sub">{age}</span>
        </p>
        <p className="mt-0.5 text-sm text-sub">
          {profile.areaSido} {profile.areaGugun} · {profile.jobTitle}
        </p>
      </div>

      <IdentityFillForm profileId={profile.id} />
    </main>
  );
}
