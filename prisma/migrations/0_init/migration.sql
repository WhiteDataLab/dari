-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RelationType" AS ENUM ('FRIEND', 'FAMILY', 'COWORKER', 'SENIOR', 'JUNIOR', 'COUSIN', 'ETC', 'SELF');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('COMPANY_EMAIL', 'VOUCH');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "VouchStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "BodyType" AS ENUM ('SLIM', 'SLENDER', 'NORMAL', 'CHUBBY', 'MUSCULAR', 'GLAMOROUS');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('NONE', 'PROTESTANT', 'CATHOLIC', 'BUDDHIST', 'ETC');

-- CreateEnum
CREATE TYPE "DrinkingHabit" AS ENUM ('NEVER', 'SOMETIMES', 'OFTEN');

-- CreateEnum
CREATE TYPE "SmokingHabit" AS ENUM ('NON_SMOKER', 'E_CIGARETTE', 'SMOKER');

-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('ACTIVE', 'ENGAGED', 'MATCHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "LikeStatus" AS ENUM ('PENDING', 'PHOTO_GRANTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RejectReason" AS ENUM ('NOT_READY', 'NOT_MY_TYPE', 'KNOW_EACH_OTHER', 'TOO_FAR', 'NO_REASON');

-- CreateEnum
CREATE TYPE "PhotoAccessSource" AS ENUM ('FEMALE_GRANT', 'FEMALE_INITIATE', 'MATCH');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'MATCHED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LIKE_RECEIVED', 'LIKE_ACCEPTED', 'LIKE_REJECTED', 'LIKE_EXPIRED', 'PROPOSAL_RECEIVED', 'MATCH_CREATED', 'VOUCH_REQUESTED', 'PROFILE_REGISTERED_CONSENT');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('OBSCENE', 'AD_SPAM', 'ILLEGAL', 'FAKE_INFO', 'NO_CONSENT', 'CONTACT_LEAK', 'ETC');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED_REMOVED', 'RESOLVED_DISMISSED');

-- CreateEnum
CREATE TYPE "FlagSource" AS ENUM ('AUTO_TEXT', 'AUTO_IMAGE', 'USER_REPORT', 'RATE_LIMIT');

-- CreateEnum
CREATE TYPE "FlagLabel" AS ENUM ('OBSCENE', 'AD_SPAM', 'ILLEGAL', 'CONTACT_LEAK');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('PENDING', 'DISMISSED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('WARNING', 'SUSPEND_7D', 'BAN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'COMPANY_EMAIL',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "company" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "relationToReferrer" "RelationType",
    "allowNameInPath" BOOLEAN NOT NULL DEFAULT true,
    "agreedTermsAt" TIMESTAMP(3) NOT NULL,
    "agreedPrivacyAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VouchRequest" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "voucheeId" TEXT NOT NULL,
    "status" "VouchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "VouchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "relationToOwner" "RelationType" NOT NULL,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "consentNotifiedAt" TIMESTAMP(3),
    "delegatePhotoConsent" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "bodyType" "BodyType" NOT NULL,
    "phone" TEXT NOT NULL,
    "areaSido" TEXT NOT NULL,
    "areaGugun" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companyMasked" BOOLEAN NOT NULL DEFAULT false,
    "jobTitle" TEXT NOT NULL,
    "religion" "Religion" NOT NULL,
    "drinking" "DrinkingHabit" NOT NULL,
    "drinkCapacity" TEXT,
    "smoking" "SmokingHabit" NOT NULL,
    "isDivorced" BOOLEAN NOT NULL DEFAULT false,
    "mbti" TEXT,
    "hobbies" TEXT[],
    "idealType" VARCHAR(200),
    "loveView" VARCHAR(200),
    "recommenderComment" VARCHAR(100),
    "status" "ProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilePhoto" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "fromProfileId" TEXT NOT NULL,
    "toProfileId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "status" "LikeStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" "RejectReason",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "photoGrantedAt" TIMESTAMP(3),
    "finalDeadline" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoAccess" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "source" "PhotoAccessSource" NOT NULL,
    "likeId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PhotoAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchProposal" (
    "id" TEXT NOT NULL,
    "matchmakerId" TEXT NOT NULL,
    "profileAId" TEXT NOT NULL,
    "profileBId" TEXT NOT NULL,
    "acceptedA" BOOLEAN,
    "acceptedB" BOOLEAN,
    "rejectReason" "RejectReason",
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "MatchProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "profileAId" TEXT NOT NULL,
    "profileBId" TEXT NOT NULL,
    "sourceLikeId" TEXT,
    "sourceProposalId" TEXT,
    "matchmakerId" TEXT,
    "degreeOfSeparation" INTEGER,
    "phoneRevealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "photoId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationFlag" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "photoId" TEXT,
    "field" TEXT,
    "source" "FlagSource" NOT NULL,
    "labels" "FlagLabel"[],
    "score" DOUBLE PRECISION,
    "autoBlocked" BOOLEAN NOT NULL DEFAULT false,
    "status" "FlagStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sanction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SanctionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "flagId" TEXT,
    "issuedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sanction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- CreateIndex
CREATE INDEX "EmailVerification_email_code_idx" ON "EmailVerification"("email", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VouchRequest_voucheeId_key" ON "VouchRequest"("voucheeId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_ownerId_idx" ON "Profile"("ownerId");

-- CreateIndex
CREATE INDEX "Profile_status_gender_idx" ON "Profile"("status", "gender");

-- CreateIndex
CREATE INDEX "ProfilePhoto_profileId_idx" ON "ProfilePhoto"("profileId");

-- CreateIndex
CREATE INDEX "Like_toProfileId_status_idx" ON "Like"("toProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Like_fromProfileId_toProfileId_key" ON "Like"("fromProfileId", "toProfileId");

-- CreateIndex
CREATE INDEX "PhotoAccess_viewerId_revokedAt_idx" ON "PhotoAccess"("viewerId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoAccess_profileId_viewerId_key" ON "PhotoAccess"("profileId", "viewerId");

-- CreateIndex
CREATE INDEX "MatchProposal_matchmakerId_status_idx" ON "MatchProposal"("matchmakerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Match_sourceLikeId_key" ON "Match"("sourceLikeId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_sourceProposalId_key" ON "Match"("sourceProposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_profileAId_profileBId_key" ON "Match"("profileAId", "profileBId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ModerationFlag_status_createdAt_idx" ON "ModerationFlag"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Sanction_userId_idx" ON "Sanction"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VouchRequest" ADD CONSTRAINT "VouchRequest_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VouchRequest" ADD CONSTRAINT "VouchRequest_voucheeId_fkey" FOREIGN KEY ("voucheeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_fromProfileId_fkey" FOREIGN KEY ("fromProfileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchProposal" ADD CONSTRAINT "MatchProposal_matchmakerId_fkey" FOREIGN KEY ("matchmakerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchProposal" ADD CONSTRAINT "MatchProposal_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchProposal" ADD CONSTRAINT "MatchProposal_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationFlag" ADD CONSTRAINT "ModerationFlag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

