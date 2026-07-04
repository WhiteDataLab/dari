import crypto from "crypto";

// 전화번호 AES-256-GCM 암호화 (DB_SCHEMA §5)
// 복호화 허용 경로: ① 본인/등록 중매인 조회 ② Match 성사 응답

function getKey(): Buffer {
  const hex = process.env.PHONE_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("PHONE_ENC_KEY 환경변수가 없거나 64자리 hex가 아닙니다");
  }
  return Buffer.from(hex, "hex");
}

export function encryptPhone(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptPhone(encrypted: string): string {
  const [ivB64, tagB64, dataB64] = encrypted.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function generateCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function generateReferralCode(): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `DARI-${rand}`;
}
