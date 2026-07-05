import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encryptPhone, hashPhone } from "@/lib/crypto";
import { profileCreateSchema, checkProfileFreeText } from "@/lib/profileInput";
import { generateNickname } from "@/lib/nickname";

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

  // 당사자 인적사항 미상 등록 — 모든 대리 등록 관계에서 가능, 호칭으로 관리 (§7.9)
  const pending = !d.isSelf && !!d.identityPending;

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

  if (pending) {
    if (!d.pendingLabel?.trim()) {
      return NextResponse.json({ error: "이 분을 부를 호칭을 적어 주세요 (예: 회사 후배)" }, { status: 400 });
    }
    // 다리 역할 지인 정보는 선택 — 입력 시 이름·연락처 세트로
    if ((d.viaName?.trim() && !d.viaPhone) || (!d.viaName?.trim() && d.viaPhone)) {
      return NextResponse.json({ error: "다리 지인의 이름과 연락처를 함께 적어 주세요" }, { status: 400 });
    }
  } else if (!d.name?.trim() || !d.phone) {
    return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: {
      ownerId: userId,
      isSelf: d.isSelf,
      userId: d.isSelf ? userId : null,
      relationToOwner: d.isSelf ? "SELF" : d.relationToOwner,
      // pending은 당사자 동의를 아직 못 받은 상태 — 다리 지인이 정보 입력 시 확인
      consentConfirmed: d.isSelf ? true : pending ? false : !!d.consentConfirmed,
      consentNotifiedAt: d.isSelf || pending ? null : new Date(), // TODO(phase-2): 당사자 SMS 통지
      delegatePhotoConsent: !!d.delegatePhotoConsent,
      name: pending ? "" : d.name!.trim(),
      nickname: generateNickname(),
      gender: d.gender,
      birthYear: d.birthYear,
      heightCm: d.heightCm,
      bodyType: d.bodyType,
      phone: pending ? encryptPhone("") : encryptPhone(d.phone!.replace(/-/g, "")),
      phoneHash: pending ? null : hashPhone(d.phone!),
      identityPending: pending,
      pendingLabel: pending ? d.pendingLabel!.trim() : null,
      viaName: pending && d.viaName?.trim() ? d.viaName.trim() : null,
      viaPhone: pending && d.viaPhone ? encryptPhone(d.viaPhone.replace(/-/g, "")) : null,
      viaPhoneHash: pending && d.viaPhone ? hashPhone(d.viaPhone) : null,
      avoidSameCompany: d.avoidSameCompany ?? true,
      areaSido: d.areaSido,
      areaGugun: d.areaGugun,
      company: d.company.trim(),
      companyMasked: !!d.companyMasked,
      industry: d.industry,
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
