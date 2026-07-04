-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avoidSameCompany" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phoneHash" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneHash" TEXT;

-- CreateTable
CREATE TABLE "ContactBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactBlock_phoneHash_idx" ON "ContactBlock"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContactBlock_userId_phoneHash_key" ON "ContactBlock"("userId", "phoneHash");

-- CreateIndex
CREATE INDEX "Profile_phoneHash_idx" ON "Profile"("phoneHash");

-- CreateIndex
CREATE INDEX "User_phoneHash_idx" ON "User"("phoneHash");

-- AddForeignKey
ALTER TABLE "ContactBlock" ADD CONSTRAINT "ContactBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

