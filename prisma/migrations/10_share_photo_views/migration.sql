-- 사진 포함 공유 링크 선택 (§7.7) + 카드 열람 기록/NEW 마크 (§9.0)
ALTER TABLE "Profile" ADD COLUMN "sharePhotoToken" TEXT;
CREATE UNIQUE INDEX "Profile_sharePhotoToken_key" ON "Profile"("sharePhotoToken");

CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfileView_userId_profileId_key" ON "ProfileView"("userId", "profileId");
CREATE INDEX "ProfileView_profileId_idx" ON "ProfileView"("profileId");
