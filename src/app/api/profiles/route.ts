import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encryptPhone, hashPhone } from "@/lib/crypto";
import { profileCreateSchema, checkProfileFreeText } from "@/lib/profileInput";

// POST /api/profiles — 본인 or 지인 프로필 생성
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  }
  const d = parsed.data;

  // 자유 텍스트 연락처 우회 감지
  const violation = checkProfileFreeText(d);
  if (violation) {
    return NextResponse.json({ error: violation }, { status: 400 });
  }

  if (d.isSelf) {
    // 본인 프로필 or 클레임(대리 등록 연동)된 프로필이 이미 있으면 중복 생성 금지
    const existing = await prisma.profile.findFirst({ where: { userId } });
    if (existing) {
      const msg = existing.isSelf
        ? "이미 본인 프로필이 있어요"
        : "지인이 등록해준 내 프로필이 이미 연결돼 있어요. 그 프로필을 수정해 주세요";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
  } else {
    if (!d.consentConfirmed) {
      return NextResponse.json({ error: "당사자 등록 동의 확인이 필요해요" }, { status: 400 });
    }
    if (!d.recommenderComment?.trim()) {
      return NextResponse.json({ error: "추천인의 한 줄 소개를 적어 주세요" }, { status: 400 });
    }
  }

  const profile = await prisma.profile.create({
    data: {
      ownerId: userId,
      isSelf: d.isSelf,
      userId: d.isSelf ? userId : null,
      relationToOwner: d.isSelf ? "SELF" : d.relationToOwner,
      consentConfirmed: d.isSelf ? true : !!d.consentConfirmed,
      consentNotifiedAt: d.isSelf ? null : new Date(), // TODO(phase-2): 당사자 SMS 통지
      delegatePhotoConsent: !!d.delegatePhotoConsent,
      name: d.name.trim(),
      gender: d.gender,
      birthYear: d.birthYear,
      heightCm: d.heightCm,
      bodyType: d.bodyType,
      phone: encryptPhone(d.phone.replace(/-/g, "")),
      phoneHash: hashPhone(d.phone),
      avoidSameCompany: d.avoidSameCompany ?? true,
      areaSido: d.areaSido,
      areaGugun: d.areaGugun,
      company: d.company.trim(),
      companyMasked: !!d.companyMasked,
      jobTitle: d.jobTitle.trim(),
      religion: d.religion,
      drinking: d.drinking,
      drinkCapacity: d.drinking === "OFTEN" ? d.drinkCapacity : null,
      smoking: d.smoking,
      isDivorced: d.isDivorced,
      mbti: d.mbti || null,
      hobbies: d.hobbies,
      idealType: d.idealType || null,
      loveView: d.loveView || null,
      recommenderComment: d.recommenderComment || null,
    },
  });

  return NextResponse.json({ ok: true, profileId: profile.id });
}
