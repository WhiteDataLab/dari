import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;

// 이메일 인증코드 검증 — 무차별 대입 방지 (5회 실패 시 코드 무효화),
// consume=true면 재사용(replay) 차단을 위해 usedAt 세팅
export async function verifyEmailCode(
  email: string,
  code: string,
  { consume }: { consume: boolean },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "코드가 올바르지 않아요" };

  const latest = await prisma.emailVerification.findFirst({
    where: { email, expiresAt: { gt: new Date() }, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!latest || latest.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "코드가 만료됐어요. 다시 받아 주세요" };
  }

  if (latest.code !== code) {
    const updated = await prisma.emailVerification.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return {
      ok: false,
      error:
        updated.attempts >= MAX_ATTEMPTS
          ? "5회 이상 틀려서 코드가 무효화됐어요. 다시 받아 주세요"
          : "코드가 올바르지 않아요",
    };
  }

  if (consume) {
    await prisma.emailVerification.update({
      where: { id: latest.id },
      data: { usedAt: new Date() },
    });
  }
  return { ok: true, id: latest.id };
}

// 로그인 성공 시점에 코드 소진 (재사용 차단)
export async function consumeEmailCode(id: string) {
  await prisma.emailVerification.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
