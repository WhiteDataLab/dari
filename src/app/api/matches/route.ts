import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { decryptPhone } from "@/lib/crypto";

// GET /api/matches — 성사 목록. 전화번호 복호화 포함 (유일한 노출 경로)
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const myProfiles = await prisma.profile.findMany({
    where: { OR: [{ ownerId: userId }, { userId }] },
    select: { id: true },
  });
  const ids = myProfiles.map((p) => p.id);
  if (ids.length === 0) return NextResponse.json({ matches: [] });

  const matches = await prisma.match.findMany({
    where: { OR: [{ profileAId: { in: ids } }, { profileBId: { in: ids } }] },
    include: {
      profileA: { include: { photos: { where: { isMain: true }, take: 1 } } },
      profileB: { include: { photos: { where: { isMain: true }, take: 1 } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = matches.map((m) => {
    const mineIsA = ids.includes(m.profileAId);
    const mine = mineIsA ? m.profileA : m.profileB;
    const other = mineIsA ? m.profileB : m.profileA;
    return {
      id: m.id,
      createdAt: m.createdAt,
      degreeOfSeparation: m.degreeOfSeparation,
      mine: { id: mine.id, name: mine.name },
      other: {
        id: other.id,
        name: other.name,
        birthYear: other.birthYear,
        photoUrl: other.photos[0]?.url ?? null, // 성사 후 상호 공개
        phone: decryptPhone(other.phone),
      },
    };
  });

  return NextResponse.json({ matches: result });
}
