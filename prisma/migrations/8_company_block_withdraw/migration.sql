-- 특정 회사 피하기 + 회원 탈퇴 (PROJECT_SPEC §7.3, §7.10)
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "CompanyBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyNorm" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyBlock_userId_companyNorm_key" ON "CompanyBlock"("userId", "companyNorm");
CREATE INDEX "CompanyBlock_companyNorm_idx" ON "CompanyBlock"("companyNorm");

ALTER TABLE "CompanyBlock" ADD CONSTRAINT "CompanyBlock_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
