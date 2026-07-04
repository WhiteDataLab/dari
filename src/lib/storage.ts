import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import crypto from "crypto";

// Supabase Storage 사진 업로드 — 키 미설정 시 명확한 에러 (빌드는 통과)
function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const BUCKET = () => process.env.SUPABASE_STORAGE_BUCKET ?? "photos";

// 리사이징(장변 1600px) + WebP 변환 + EXIF 제거 (PROJECT_SPEC §7.2)
export async function uploadProfilePhoto(
  file: Buffer,
): Promise<{ url: string } | { error: string }> {
  const supabase = getClient();
  if (!supabase) {
    return { error: "사진 저장소가 아직 설정되지 않았어요 (SUPABASE_URL 필요)" };
  }

  const processed = await sharp(file)
    .rotate() // EXIF orientation 반영 후 메타데이터 제거
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const path = `profiles/${crypto.randomBytes(16).toString("hex")}.webp`;
  const { error } = await supabase.storage
    .from(BUCKET())
    .upload(path, processed, { contentType: "image/webp" });

  if (error) return { error: `업로드 실패: ${error.message}` };

  const { data } = supabase.storage.from(BUCKET()).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function deletePhotoByUrl(url: string) {
  const supabase = getClient();
  if (!supabase) return;
  const marker = `/object/public/${BUCKET()}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET()).remove([path]);
}
