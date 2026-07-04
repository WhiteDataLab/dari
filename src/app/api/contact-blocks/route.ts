import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { hashPhone } from "@/lib/crypto";

// 아는 사람 피하기 — 원본 번호는 저장하지 않고 해시 + 마스킹 라벨만 보관

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const blocks = await prisma.contactBlock.findMany({
    where: { userId },
    select: { id: true, label: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ blocks });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const { phone } = await req.json().catch(() => ({}));
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return NextResponse.json({ error: "휴대폰 번호 형식을 확인해 주세요" }, { status: 400 });
  }

  const count = await prisma.contactBlock.count({ where: { userId } });
  if (count >= 200) {
    return NextResponse.json({ error: "최대 200개까지 등록할 수 있어요" }, { status: 400 });
  }

  const label = `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
  const block = await prisma.contactBlock.upsert({
    where: { userId_phoneHash: { userId, phoneHash: hashPhone(digits) } },
    create: { userId, phoneHash: hashPhone(digits), label },
    update: {},
  });

  return NextResponse.json({ ok: true, block: { id: block.id, label: block.label } });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });

  await prisma.contactBlock.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
