-- AlterTable: push token fields on game_players
ALTER TABLE "game_players" ADD COLUMN "pushToken" TEXT;
ALTER TABLE "game_players" ADD COLUMN "pushTokenPlatform" TEXT;
ALTER TABLE "game_players" ADD COLUMN "pushTokenUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "game_players_pushToken_idx" ON "game_players"("pushToken");

-- CreateTable: per-device push delivery results
CREATE TABLE "game_announcement_deliveries" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'expo',
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "providerMessageId" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "game_announcement_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_announcement_deliveries_announcementId_platform_status_idx" ON "game_announcement_deliveries"("announcementId", "platform", "status");
CREATE INDEX "game_announcement_deliveries_playerId_idx" ON "game_announcement_deliveries"("playerId");
CREATE INDEX "game_announcement_deliveries_attemptedAt_idx" ON "game_announcement_deliveries"("attemptedAt");

-- AddForeignKey
ALTER TABLE "game_announcement_deliveries" ADD CONSTRAINT "game_announcement_deliveries_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "game_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "game_announcement_deliveries" ADD CONSTRAINT "game_announcement_deliveries_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
