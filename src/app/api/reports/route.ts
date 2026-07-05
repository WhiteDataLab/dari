import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ReportReason } from "@prisma/client";

const AUTO_HIDE_THRESHOLD = 3; // 신고 3건 누적 시 자동 임시 숨김 (스펙 §12.1)

const reportSchema = z.object({
  profileId: z.string().min(1),
  reason: z.nativeEnum(ReportReason),
  detail: z.string().max(300).optional().nullable(),
});

// POST /api/reports — 프로필 신고 접수
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  }
  const { profileId, reason, detail } = parsed.data;

  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return NextResponse.json({ error: "프로필을 찾을 수 없어요" }, { status: 404 });
  }
  if (profile.ownerId === userId || profile.userId === userId) {
    return NextResponse.json({ error: "내 프로필은 신고할 수 없어요" }, { status: 400 });
  }

  // 동일인 중복 신고 방지 (미처리 건 기준)
  const dup = await prisma.report.findFirst({
    where: { reporterId: userId, profileId, status: "PENDING" },
  });
  if (dup) {
    return NextResponse.json({ error: "이미 신고를 접수했어요. 검토 중이에요" }, { status: 400 });
  }

  await prisma.report.create({
    data: { reporterId: userId, profileId, reason, detail: detail?.trim() || null },
  });

  // 3건 누적 → 자동 임시 숨김 (선조치 후검토)
  const pendingCount = await prisma.report.count({ where: { profileId, status: "PENDING" } });
  if (pendingCount >= AUTO_HIDE_THRESHOLD && profile.status === "ACTIVE") {
    await prisma.profile.update({ where: { id: profileId }, data: { status: "HIDDEN" } });
  }

  return NextResponse.json({ ok: true });
}
