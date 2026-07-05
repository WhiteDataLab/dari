-- 대칭 사진 교환(§9.0 v1.5) + 미상 등록 호칭(§7.9 확대)
ALTER TYPE "PhotoAccessSource" ADD VALUE 'EXCHANGE';

ALTER TABLE "Profile" ADD COLUMN "pendingLabel" TEXT;
