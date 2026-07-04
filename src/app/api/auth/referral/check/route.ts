import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailCode } from "@/lib/emailCode";

// 추천코드 유효성 + 추천인 이름 반환 — STEP 2 "추천인 확인 카드" (PAGE_IA §2.2)
// 이메일 인증을 통과한 요청만 허용 — 무차별 대입으로 회원 이름을 수집하는 것 방지
export async function POST(req: Request) {
  const { code, email, verifyCode } = await req.json().catch(() => ({}));

  const normalized = String(email ?? "").toLowerCase().trim();
  const gate = await verifyEmailCode(normalized, String(verifyCode ?? "").trim(), {
    consume: false,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: "이메일 인증을 먼저 완료해 주세요" }, { status: 401 });
  }

  const referrer = await prisma.user.findUnique({
    where: { referralCode: String(code ?? "").trim().toUpperCase() },
    select: { name: true },
  });
  if (!referrer) {
    return NextResponse.json({ error: "존재하지 않는 추천코드예요" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, referrerName: referrer.name });
}
