import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/crypto";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const normalized = String(email ?? "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return NextResponse.json({ error: "이메일 형식을 확인해 주세요" }, { status: 400 });
  }

  // 레이트 리밋: 같은 이메일 10분 내 3회
  const recent = await prisma.emailVerification.count({
    where: { email: normalized, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recent >= 3) {
    return NextResponse.json(
      { error: "요청이 너무 잦아요. 10분 후 다시 시도해 주세요" },
      { status: 429 },
    );
  }

  const code = generateCode();
  await prisma.emailVerification.create({
    data: { email: normalized, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });
  await sendVerificationEmail(normalized, code);

  return NextResponse.json({ ok: true });
}
