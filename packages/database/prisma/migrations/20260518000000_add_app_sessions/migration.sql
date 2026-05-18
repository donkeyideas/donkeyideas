-- CreateTable: in-app foreground/background sessions for avg-session telemetry
CREATE TABLE "game_app_sessions" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "durationSecs" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_app_sessions_playerId_createdAt_idx" ON "game_app_sessions"("playerId", "createdAt");
CREATE INDEX "game_app_sessions_createdAt_idx" ON "game_app_sessions"("createdAt");

-- AddForeignKey
ALTER TABLE "game_app_sessions" ADD CONSTRAINT "game_app_sessions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "game_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
