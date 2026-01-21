-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('BUDGET', 'FORECAST', 'ACTUALS');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "accountCode" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "type" "BudgetType" NOT NULL,
    "status" "BudgetStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balance" DECIMAL(65,30),
    "notes" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_categories_companyId_idx" ON "budget_categories"("companyId");

-- CreateIndex
CREATE INDEX "budget_periods_companyId_startDate_idx" ON "budget_periods"("companyId", "startDate");

-- CreateIndex
CREATE INDEX "budget_periods_companyId_type_status_idx" ON "budget_periods"("companyId", "type", "status");

-- CreateIndex
CREATE INDEX "budget_lines_periodId_date_idx" ON "budget_lines"("periodId", "date");

-- CreateIndex
CREATE INDEX "budget_lines_companyId_date_idx" ON "budget_lines"("companyId", "date");

-- CreateIndex
CREATE INDEX "budget_lines_categoryId_idx" ON "budget_lines"("categoryId");

-- CreateIndex
CREATE INDEX "budget_lines_isApproved_idx" ON "budget_lines"("isApproved");

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_periods" ADD CONSTRAINT "budget_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "budget_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
