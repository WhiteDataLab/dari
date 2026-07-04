import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// PATCH /api/me — 이름 경로 노출 동의 토글
export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (typeof body.allowNameInPath !== "boolean") {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { allowNameInPath: body.allowNameInPath },
  });
  return NextResponse.json({ ok: true });
}
