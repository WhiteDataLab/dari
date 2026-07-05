-- 지인의 지인: 당사자 인적사항을 모를 때 다리 역할 지인 정보로 등록 (PROJECT_SPEC §7.9)
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_IDENTITY_NEEDED';
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_IDENTITY_FILLED';

ALTER TABLE "Profile" ADD COLUMN "identityPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "viaName" TEXT,
ADD COLUMN "viaPhone" TEXT,
ADD COLUMN "viaPhoneHash" TEXT;

CREATE INDEX "Profile_viaPhoneHash_idx" ON "Profile"("viaPhoneHash");
