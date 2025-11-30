-- CreateTable
CREATE TABLE "ManpowerRequest" (
    "id" SERIAL NOT NULL,
    "requestNo" TEXT NOT NULL,
    "selectedResumeIds" JSONB NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "positionTitle" TEXT NOT NULL,
    "jobDescription" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "salaryRange" TEXT,
    "expectedStartDate" TIMESTAMP(3),
    "workLocation" TEXT,
    "additionalRequirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManpowerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManpowerRequest_requestNo_key" ON "ManpowerRequest"("requestNo");

-- CreateIndex
CREATE INDEX "ManpowerRequest_status_createdAt_idx" ON "ManpowerRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ManpowerRequest_contactEmail_idx" ON "ManpowerRequest"("contactEmail");

-- CreateIndex
CREATE INDEX "ManpowerRequest_requestNo_idx" ON "ManpowerRequest"("requestNo");
