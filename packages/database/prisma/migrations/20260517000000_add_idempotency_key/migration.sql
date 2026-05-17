-- AlterTable
ALTER TABLE "game_coin_transactions" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "game_coin_transactions_idempotencyKey_key" ON "game_coin_transactions"("idempotencyKey");
