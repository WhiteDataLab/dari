import { z } from "zod";
import { checkFreeText } from "@/lib/moderation";
import {
  BodyType,
  DrinkingHabit,
  Gender,
  RelationType,
  Religion,
  SmokingHabit,
} from "@prisma/client";

export const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

// 프로필 공통 입력 필드 — 생성(POST /api/profiles)과 수정(PATCH update)이 공유
export const profileFieldsSchema = z.object({
  name: z.string().min(1).max(30),
  gender: z.nativeEnum(Gender),
  birthYear: z.number().int().min(1960).max(2010),
  heightCm: z.number().int().min(120).max(230),
  bodyType: z.nativeEnum(BodyType),
  phone: z.string().regex(PHONE_RE),
  areaSido: z.string().min(1).max(20),
  areaGugun: z.string().min(1).max(20),
  company: z.string().min(1).max(50),
  companyMasked: z.boolean().optional(),
  industry: z.string().min(1).max(30), // 산업 분야 — 직장명 숨겨도 업계는 노출
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

export const profileCreateSchema = profileFieldsSchema
  .omit({ name: true, phone: true })
  .extend({
    isSelf: z.boolean(),
    relationToOwner: z.nativeEnum(RelationType),
    consentConfirmed: z.boolean().optional(),
    delegatePhotoConsent: z.boolean().optional(),
    // 당사자 이름·연락처 — 지인의 지인(identityPending)일 땐 생략, 대신 via* 필수 (라우트에서 검증)
    name: z.string().min(1).max(30).optional(),
    phone: z.string().regex(PHONE_RE).optional(),
    identityPending: z.boolean().optional(),
    viaName: z.string().min(1).max(30).optional(),
    viaPhone: z.string().regex(PHONE_RE).optional(),
  });

// 수정용 — 이름·연락처는 최초 등록 후 변경 불가 (도용 방지, PROJECT_SPEC §7.5)
export const profileUpdateSchema = profileFieldsSchema.omit({ name: true, phone: true });

export type ProfileFields = z.infer<typeof profileFieldsSchema>;
export type ProfileUpdateFields = z.infer<typeof profileUpdateSchema>;

// 자유 텍스트 연락처 우회 감지 — 위반 필드가 있으면 에러 메시지 반환
export function checkProfileFreeText(d: ProfileUpdateFields): string | null {
  for (const [field, value] of [
    ["이상형", d.idealType],
    ["연애관", d.loveView],
    ["한 줄 소개", d.recommenderComment],
  ] as const) {
    const violation = checkFreeText(value);
    if (violation) return `${field}: ${violation}`;
  }
  return null;
}
