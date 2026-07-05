import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { normalizeCompany } from "@/lib/visibility";

// 특정 회사 피하기 — 정규화된 회사명이 일치하는 프로필/회원과 상호 비노출 (§7.3)

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const blocks = await prisma.companyBlock.findMany({
    where: { userId },
    select: { id: true, label: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ blocks });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { company } = await req.json().catch(() => ({}));
  const label = String(company ?? "").trim();
  const companyNorm = normalizeCompany(label);
  if (!companyNorm || label.length > 50) {
    return NextResponse.json({ error: "회사명을 확인해 주세요" }, { status: 400 });
  }

  const count = await prisma.companyBlock.count({ where: { userId } });
  if (count >= 50) {
    return NextResponse.json({ error: "최대 50개까지 등록할 수 있어요" }, { status: 400 });
  }

  const block = await prisma.companyBlock.upsert({
    where: { userId_companyNorm: { userId, companyNorm } },
    create: { userId, companyNorm, label },
    update: {},
  });

  return NextResponse.json({ ok: true, block: { id: block.id, label: block.label } });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });

  await prisma.companyBlock.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
