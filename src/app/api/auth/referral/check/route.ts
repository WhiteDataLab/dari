import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 추천코드 유효성 + 추천인 이름 반환 — STEP 2 "추천인 확인 카드" (PAGE_IA §2.2)
export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({}));
  const referrer = await prisma.user.findUnique({
    where: { referralCode: String(code ?? "").trim().toUpperCase() },
    select: { name: true },
  });
  if (!referrer) {
    return NextResponse.json({ error: "존재하지 않는 추천코드예요" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, referrerName: referrer.name });
}
