-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "intercompanyTransferId" TEXT;

-- CreateIndex
CREATE INDEX "transactions_intercompanyTransferId_idx" ON "transactions"("intercompanyTransferId");
