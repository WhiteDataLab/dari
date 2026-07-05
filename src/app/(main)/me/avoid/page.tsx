import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ContactBlockManager, AvoidCompanyToggle } from "@/components/ContactBlockManager";

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
        등록한 번호의 회원과는 <b>서로의 프로필이 보이지 않아요.</b>
        <br />
        번호는 저장하지 않고 암호화된 지문만 보관해요.
      </p>

      {self && (
        <div className="mb-5">
          <AvoidCompanyToggle profileId={self.id} initial={self.avoidSameCompany} />
        </div>
      )}

      <h2 className="mb-2 text-sm font-extrabold text-sub">피하고 싶은 번호</h2>
      <ContactBlockManager />
    </main>
  );
}
