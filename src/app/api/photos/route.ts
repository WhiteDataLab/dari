import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { uploadProfilePhoto, deletePhotoByUrl } from "@/lib/storage";
import { canEditProfile } from "@/lib/profileAccess";

const MAX_PHOTOS = 10;

// POST /api/photos — multipart: profileId + file
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const profileId = form?.get("profileId");
  const file = form?.get("file");
  if (!form || typeof profileId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "사진은 15MB 이하로 올려 주세요" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 올릴 수 있어요" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { _count: { select: { photos: true } } },
  });
  if (!profile || !canEditProfile(userId, profile)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }
  if (profile._count.photos >= MAX_PHOTOS) {
    return NextResponse.json({ error: `사진은 최대 ${MAX_PHOTOS}장이에요` }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let result: Awaited<ReturnType<typeof uploadProfilePhoto>>;
  try {
    result = await uploadProfilePhoto(buffer);
  } catch {
    // sharp가 디코딩 못 하는 파일 (확장자 위장 등)
    return NextResponse.json({ error: "이미지 파일을 읽을 수 없어요" }, { status: 400 });
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const photo = await prisma.profilePhoto.create({
    data: {
      profileId,
      url: result.url,
      isMain: profile._count.photos === 0,
      sortOrder: profile._count.photos,
    },
  });

  return NextResponse.json({ ok: true, photo: { id: photo.id, url: photo.url } });
}

// DELETE /api/photos?id=...
export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "잘못된 요청이에요" }, { status: 400 });

  const photo = await prisma.profilePhoto.findUnique({
    where: { id },
    include: { profile: { select: { ownerId: true, userId: true, ownerCanEdit: true } } },
  });
  if (!photo || !canEditProfile(userId, photo.profile)) {
    return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
  }

  await prisma.profilePhoto.delete({ where: { id } });
  await deletePhotoByUrl(photo.url); // Storage 파일 동반 삭제 (DB_SCHEMA §5-4)

  // 대표사진 삭제 시 다음 사진을 대표로
  if (photo.isMain) {
    const next = await prisma.profilePhoto.findFirst({
      where: { profileId: photo.profileId },
      orderBy: { sortOrder: "asc" },
    });
    if (next) {
      await prisma.profilePhoto.update({ where: { id: next.id }, data: { isMain: true } });
    }
  }

  return NextResponse.json({ ok: true });
}
