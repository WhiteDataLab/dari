import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { encryptPhone, hashPhone } from "@/lib/crypto";
import { checkFreeText } from "@/lib/moderation";
import {
  BodyType,
  DrinkingHabit,
  Gender,
  RelationType,
  Religion,
  SmokingHabit,
} from "@prisma/client";

const profileSchema = z.object({
  isSelf: z.boolean(),
  relationToOwner: z.nativeEnum(RelationType),
  consentConfirmed: z.boolean().optional(),
  delegatePhotoConsent: z.boolean().optional(),
  name: z.string().min(1).max(30),
  gender: z.nativeEnum(Gender),
  birthYear: z.number().int().min(1960).max(2010),
  heightCm: z.number().int().min(120).max(230),
  bodyType: z.nativeEnum(BodyType),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/),
  areaSido: z.string().min(1).max(20),
  areaGugun: z.string().min(1).max(20),
  company: z.string().min(1).max(50),
  companyMasked: z.boolean().optional(),
  jobTitle: z.string().min(1).max(50),
  religion: z.nativeEnum(Religion),
  drinking: z.nativeEnum(DrinkingHabit),
  drinkCapacity: z.string().max(30).optional().nullable(),
  smoking: z.nativeEnum(SmokingHabit),
  isDivorced: z.boolean(),
  mbti: z.string().max(4).optional().nullable(),
  hobbies: z.array(z.string().max(15)).min(1).max(5),
  idealType: z.string().max(200).optional().nullable(),
  loveView: z.string().max(200).optional().nullable(),
  recommenderComment: z.string().max(100).optional().nullable(),
  avoidSameCompany: z.boolean().optional(),
});

// POST /api/profiles — 본인 or 지인 프로필 생성
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  }
  const d = parsed.data;

  // 자유 텍스트 연락처 우회 감지
  for (const [field, value] of [
    ["이상형", d.idealType],
    ["연애관", d.loveView],
    ["한 줄 소개", d.recommenderComment],
  ] as const) {
    const violation = checkFreeText(value);
    if (violation) {
      return NextResponse.json({ error: `${field}: ${violation}` }, { status: 400 });
    }
  }

  if (d.isSelf) {
    const existing = await prisma.profile.findFirst({ where: { userId, isSelf: true } });
    if (existing) {
      return NextResponse.json({ error: "이미 본인 프로필이 있어요" }, { status: 409 });
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
