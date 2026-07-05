import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

// PATCH /api/admin/reports — 신고 처리 (ADMIN 전용, 스펙 §12.1)
// dismiss: 기각 (남은 미처리 신고가 없으면 자동 숨김 해제)
// remove: 삭제 확정 (프로필 영구 숨김)
export async function PATCH(req: Request) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { id, action } = body as { id?: string; action?: string };
  if (!id || (action !== "dismiss" && action !== "remove")) {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.status !== "PENDING") {
    return NextResponse.json({ error: "이미 처리된 신고예요" }, { status: 400 });
  }

  await prisma.report.update({
    where: { id },
    data: {
      status: action === "remove" ? "RESOLVED_REMOVED" : "RESOLVED_DISMISSED",
      resolvedById: adminId,
      resolvedAt: new Date(),
    },
  });

  if (action === "remove") {
    await prisma.profile.update({
      where: { id: report.profileId },
      data: { status: "HIDDEN" },
    });
  } else {
    // 기각: 미처리 신고가 더 없으면 자동 숨김 해제 (소유자가 직접 숨긴 경우도 재공개될 수 있음 — 소규모 운영 리스크 수용)
    const remaining = await prisma.report.count({
      where: { profileId: report.profileId, status: "PENDING" },
    });
    if (remaining === 0) {
      const profile = await prisma.profile.findUnique({ where: { id: report.profileId } });
      if (profile?.status === "HIDDEN") {
        await prisma.profile.update({
          where: { id: report.profileId },
          data: { status: "ACTIVE" },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
