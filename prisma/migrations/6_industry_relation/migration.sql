-- 지인의 지인 등록 + 산업 분야 (PROJECT_SPEC §7.1)
ALTER TYPE "RelationType" ADD VALUE 'FRIEND_OF_FRIEND';

ALTER TABLE "Profile" ADD COLUMN "industry" TEXT;
