import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContactBlockManager, AvoidCompanyToggle } from "@/components/ContactBlockManager";
import { CompanyBlockManager } from "@/components/CompanyBlockManager";

export const dynamic = "force-dynamic";

// 아는 사람 피하기 (PROJECT_SPEC §7.3)
export default async function AvoidPage() {
  const session = await auth();
  const userId = session!.user.id;

  const self = await prisma.profile.findFirst({
    where: { userId },
    select: { id: true, avoidSameCompany: true },
  });

  return (
    <main className="px-5 py-6">
      <h1 className="text-[22px] font-extrabold tracking-tight">아는 사람 피하기 🙈</h1>
      <p className="mb-5 mt-0.5 text-sm text-sub">
        등록한 번호·회사의 회원과는 <b>서로의 프로필이 보이지 않아요.</b>
        <br />
        번호는 저장하지 않고 암호화된 지문만 보관해요.
      </p>

      {self ? (
        <div className="mb-5">
          <AvoidCompanyToggle profileId={self.id} initial={self.avoidSameCompany} />
        </div>
      ) : (
        <p className="mb-5 rounded-[20px] bg-white px-4.5 py-4 text-[13.5px] font-semibold text-sub shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          🏢 <b className="text-ink">같은 회사 사람과 서로 안 보이기</b>는 기본으로 켜져 있어요.
          내 프로필을 만들면 끄고 켤 수 있어요.
        </p>
      )}

      <h2 className="mb-2 text-sm font-extrabold text-sub">피하고 싶은 번호</h2>
      <ContactBlockManager />

      <h2 className="mb-2 mt-7 text-sm font-extrabold text-sub">
        피하고 싶은 회사 <span className="font-medium">(전 직장, 거래처 등)</span>
      </h2>
      <CompanyBlockManager />
    </main>
  );
}
