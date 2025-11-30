-- DropIndex
DROP INDEX "FormSubmission_submitterEmail_idx";

-- AlterTable
ALTER TABLE "ManpowerRequest" ALTER COLUMN "positionTitle" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "FormSubmission_submitterEmail_idx" ON "FormSubmission"("submitterEmail" varchar_pattern_ops);
