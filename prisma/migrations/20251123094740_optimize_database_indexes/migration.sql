-- DropIndex
DROP INDEX "ActivityLog_entity_entityId_idx";

-- DropIndex
DROP INDEX "ActivityLog_userId_createdAt_idx";

-- DropIndex
DROP INDEX "FormSubmission_createdAt_idx";

-- DropIndex
DROP INDEX "FormSubmission_formType_status_idx";

-- DropIndex
DROP INDEX "FormSubmission_submitterEmail_idx";

-- DropIndex
DROP INDEX "ManpowerRequest_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_entity_entityId_createdAt_idx" ON "ActivityLog"("entity", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_action_createdAt_idx" ON "ActivityLog"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Contract_createdBy_createdAt_idx" ON "Contract"("createdBy", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FormSubmission_formType_status_createdAt_idx" ON "FormSubmission"("formType", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FormSubmission_submitterEmail_idx" ON "FormSubmission"("submitterEmail" varchar_pattern_ops);

-- CreateIndex
CREATE INDEX "FormSubmission_processedBy_idx" ON "FormSubmission"("processedBy");

-- CreateIndex
CREATE INDEX "ManpowerRequest_status_createdAt_idx" ON "ManpowerRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ManpowerRequest_processedBy_status_idx" ON "ManpowerRequest"("processedBy", "status");
