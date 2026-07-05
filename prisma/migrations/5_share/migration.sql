-- 비가입자 공유 링크: 카드덱 프로필을 카카오톡 등으로 공유 (PROJECT_SPEC §7.7)
ALTER TABLE "Profile" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Profile_shareToken_key" ON "Profile"("shareToken");
