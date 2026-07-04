import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encryptPhone, generateReferralCode, hashPhone } from "@/lib/crypto";
import { RelationType } from "@prisma/client";

// GET /api/signup — 첫 회원(운영자)인지 여부. 첫 회원은 추천코드 단계를 건너뛴다
export async function GET() {
  const userCount = await prisma.user.count();
  return NextResponse.json({ needsReferral: userCount > 0 });
}

const signupSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  name: z.string().min(1).max(30),
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  company: z.string().min(1).max(50),
  referralCode: z.string().optional(),
  relationToReferrer: z.nativeEnum(RelationType).optional(),
  allowNameInPath: z.boolean(),
  agreedTerms: z.literal(true),
  agreedPrivacy: z.literal(true),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  // 이메일 인증 재검증 (서버 사이드)
  const verification = await prisma.emailVerification.findFirst({
    where: { email, code: data.code, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) {
    return NextResponse.json({ error: "이메일 인증이 만료됐어요. 처음부터 다시 진행해 주세요" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 가입된 이메일이에요. 로그인해 주세요" }, { status: 409 });
  }

  // 추천코드 (첫 회원 = 운영자는 예외, ADMIN 부여)
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;

  let referredById: string | null = null;
  if (!isFirstUser) {
    if (!data.referralCode || !data.relationToReferrer) {
      return NextResponse.json({ error: "추천코드가 필요해요" }, { status: 400 });
    }
    const referrer = await prisma.user.findUnique({
      where: { referralCode: data.referralCode.trim().toUpperCase() },
    });
    if (!referrer) {
      return NextResponse.json({ error: "존재하지 않는 추천코드예요" }, { status: 400 });
    }
    referredById = referrer.id;
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      email,
      emailVerifiedAt: now,
      name: data.name.trim(),
      phone: encryptPhone(data.phone.replace(/-/g, "")),
      phoneHash: hashPhone(data.phone),
      birthDate: new Date(data.birthDate),
      company: data.company.trim(),
      referralCode: generateReferralCode(),
      referredById,
      relationToReferrer: isFirstUser ? null : data.relationToReferrer,
      allowNameInPath: data.allowNameInPath,
      agreedTermsAt: now,
      agreedPrivacyAt: now,
      role: isFirstUser ? "ADMIN" : "MEMBER",
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
