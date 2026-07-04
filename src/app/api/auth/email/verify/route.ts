import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 코드 유효성 확인 (소비하지 않음 — 최종 소비는 로그인/가입 시점)
export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  const normalized = String(email ?? "").toLowerCase().trim();

  const found = await prisma.emailVerification.findFirst({
    where: {
      email: normalized,
      code: String(code ?? "").trim(),
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });
  if (!found) {
    return NextResponse.json({ error: "코드가 올바르지 않거나 만료됐어요" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, isExistingUser: !!existingUser });
}
