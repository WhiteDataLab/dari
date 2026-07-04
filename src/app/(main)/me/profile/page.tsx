import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { PhotoUploader } from "@/components/PhotoUploader";
import { HideToggle } from "@/components/HideToggle";

export const dynamic = "force-dynamic";

// 내 소개팅 프로필 — 없으면 등록 폼, 있으면 관리 화면
export default async function MyProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const profile = await prisma.profile.findFirst({
    where: { userId, isSelf: true },
    include: { photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } },
  });

  if (!profile) return <ProfileForm isSelf />;

  return (
    <main className="px-6 py-8">
      <h1 className="text-[20px] font-extrabold tracking-tight">내 소개팅 프로필</h1>
      <p className="mt-1 text-sm text-sub">
        {profile.status === "MATCHED"
          ? "성사된 프로필이에요 🎓 축하해요!"
          : profile.status === "HIDDEN"
            ? "지금은 탐색에서 숨겨져 있어요"
            : "탐색 피드에 노출 중이에요"}
      </p>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
        <p className="text-base font-extrabold">
          {profile.name}{" "}
          <span className="text-sm font-semibold text-sub">
            {new Date().getFullYear() - profile.birthYear + 1}
          </span>
        </p>
        <p className="mt-0.5 text-sm text-sub">
          {profile.areaSido} {profile.areaGugun} · {profile.jobTitle}
        </p>
        <Link href={`/p/${profile.id}`} className="mt-2 inline-block text-sm font-bold text-blue">
          상세 미리보기 ›
        </Link>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-extrabold text-sub">사진 관리</h2>
      <PhotoUploader
        profileId={profile.id}
        initialPhotos={profile.photos.map((p) => ({ id: p.id, url: p.url }))}
      />

      {profile.status !== "MATCHED" && (
        <div className="mt-6">
          <HideToggle profileId={profile.id} hidden={profile.status === "HIDDEN"} />
        </div>
      )}
      {/* TODO(phase-1.5): 프로필 항목 수정 폼 */}
    </main>
  );
}
