-- CreateEnum
CREATE TYPE "AccountingEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "accounting_entries" (
    "id" TEXT NOT NULL,
    "type" "AccountingEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounting_entries_type_idx" ON "accounting_entries"("type");

-- CreateIndex
CREATE INDEX "accounting_entries_entryDate_idx" ON "accounting_entries"("entryDate");
