-- DropForeignKey
ALTER TABLE "FormSubmission" DROP CONSTRAINT "FormSubmission_submitterEmail_fkey";

-- AlterTable
ALTER TABLE "FormSubmission" ADD COLUMN     "createdById" TEXT;

-- ✅ 資料遷移：將現有的 submitterEmail 轉換為 createdById
-- 這會將已有的表單提交記錄與用戶關聯起來（基於 email 匹配）
UPDATE "FormSubmission" fs
SET "createdById" = u.id
FROM "User" u
WHERE fs."submitterEmail" = u.email
  AND fs."submitterEmail" IS NOT NULL;

-- CreateIndex
CREATE INDEX "FormSubmission_createdById_idx" ON "FormSubmission"("createdById");

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
