import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptPhone } from "@/lib/crypto";
import { canEditProfile } from "@/lib/profileAccess";
import { ProfileForm } from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

function formatPhone(digits: string): string {
  if (/^01\d{9}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (/^01\d{8}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

// 프로필 수정 — 당사자(본인/클레임) 또는 편집 권한 있는 등록자만
export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { profileId } = await params;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } },
  });
  if (!profile || !canEditProfile(userId, profile)) notFound();

  let phone = "";
  try {
    phone = formatPhone(decryptPhone(profile.phone));
  } catch {
    // 키 불일치 등 복호화 실패 → 빈 값으로 두고 재입력 유도
  }

  return (
    <ProfileForm
      isSelf={profile.isSelf}
      editId={profile.id}
      initial={{
        name: profile.name,
        gender: profile.gender,
        birthYear: profile.birthYear,
        heightCm: profile.heightCm,
        bodyType: profile.bodyType,
        phone,
        areaSido: profile.areaSido,
        areaGugun: profile.areaGugun,
        company: profile.company,
        companyMasked: profile.companyMasked,
        avoidSameCompany: profile.avoidSameCompany,
        jobTitle: profile.jobTitle,
        religion: profile.religion,
        drinking: profile.drinking,
        drinkCapacity: profile.drinkCapacity,
        smoking: profile.smoking,
        isDivorced: profile.isDivorced,
        mbti: profile.mbti,
        hobbies: profile.hobbies,
        idealType: profile.idealType,
        loveView: profile.loveView,
        recommenderComment: profile.recommenderComment,
      }}
      initialPhotos={profile.photos.map((p) => ({ id: p.id, url: p.url }))}
    />
  );
}
