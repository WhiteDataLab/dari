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
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const isAdmin = (session!.user as { role?: string }).role === "ADMIN"; // 관리자는 전체 카드 편집 (§12.4)
  const { profileId } = await params;
  const { step } = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { photos: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] } },
  });
  if (!profile || !(canEditProfile(userId, profile) || isAdmin)) notFound();

  // 연락처는 수정 불가 항목 — 원본 대신 마스킹된 번호만 클라이언트로 전달
  let phone = "";
  try {
    phone = formatPhone(decryptPhone(profile.phone)).replace(/-\d{3,4}-/, "-****-");
  } catch {
    // 복호화 실패 시 빈 값 (폼에서 "등록된 번호 (변경 불가)" 표시)
  }

  return (
    <ProfileForm
      isSelf={profile.isSelf}
      editId={profile.id}
      identityPending={profile.identityPending}
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
        industry: profile.industry,
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
      startAtPhotos={step === "photo"}
    />
  );
}
