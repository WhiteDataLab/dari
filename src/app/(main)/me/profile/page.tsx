import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";
import { PhotoUploader } from "@/components/PhotoUploader";
import { HideToggle } from "@/components/HideToggle";
import { ClaimEditDecision } from "@/components/ClaimEditDecision";

export const dynamic = "force-dynamic";

// 내 소개팅 프로필 — 없으면 등록 폼, 있으면 관리 화면 (클레임 연동 프로필 포함)
export default async function MyProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const profile = await prisma.profile.findFirst({
    where: { userId },
    include: {
      photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      owner: { select: { id: true, name: true } },
    },
  });

  if (!profile) return <ProfileForm isSelf />;

  const isClaimed = !profile.isSelf && !!profile.claimedAt;

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

      {isClaimed && !profile.editShareDecidedAt && (
        <div className="mt-5">
          <ClaimEditDecision profileId={profile.id} ownerName={profile.owner.name} />
        </div>
      )}

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
        <p className="mt-1 text-xs font-semibold text-sub">
          🎭 다른 회원에게는 <b className="text-ink">{profile.nickname}</b>(으)로 보여요 — 실명·연락처는
          성사되면 공개돼요
        </p>
        {isClaimed && (
          <p className="mt-1.5 text-xs font-semibold text-thread">
            🔗 {profile.owner.name}님이 등록해준 프로필이에요
            {profile.editShareDecidedAt
              ? profile.ownerCanEdit
                ? " · 함께 수정 중"
                : ` · ${profile.owner.name}님은 열람만 가능`
              : ""}
          </p>
        )}
        <div className="mt-2 flex gap-4">
          <Link href={`/p/${profile.id}`} className="text-sm font-bold text-blue">
            상세 미리보기 ›
          </Link>
          <Link href={`/p/${profile.id}/edit`} className="text-sm font-bold text-blue">
            ✏️ 항목 수정하기 ›
          </Link>
        </div>
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
    </main>
  );
}
