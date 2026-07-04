import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailCode } from "@/lib/emailCode";

// 코드 유효성 확인 (소비하지 않음 — 최종 소비는 로그인 시점)
// 5회 실패 시 코드 무효화 (무차별 대입 방지)
export async function POST(req: Request) {
  const { email, code } = await req.json().catch(() => ({}));
  const normalized = String(email ?? "").toLowerCase().trim();

  const result = await verifyEmailCode(normalized, String(code ?? "").trim(), {
    consume: false,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, isExistingUser: !!existingUser });
}
