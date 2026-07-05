import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// POST /api/views — 탐색 카드 열람 기록 (NEW 마크 해제, §9.0)
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { profileId } = await req.json().catch(() => ({}));
  if (typeof profileId !== "string" || !profileId) {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  const exists = await prisma.profile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });

  await prisma.profileView.upsert({
    where: { userId_profileId: { userId, profileId } },
    create: { userId, profileId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
