-- 프로필 클레임: 대리 등록 당사자가 직접 가입하면 이름+연락처 일치 시 계정 연동 (PROJECT_SPEC §7.4)
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE 'EDIT_SHARE_DECIDED';

ALTER TABLE "Profile" ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "ownerCanEdit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "editShareDecidedAt" TIMESTAMP(3);
