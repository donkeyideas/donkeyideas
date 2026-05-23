-- CreateTable: daily AdMob revenue/impressions per platform, synced from AdMob Reporting API
CREATE TABLE "game_admob_daily_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "platform" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "earningsUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "ecpmUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "matchRate" DOUBLE PRECISION,
    "showRate" DOUBLE PRECISION,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_admob_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_admob_daily_metrics_date_platform_key" ON "game_admob_daily_metrics"("date", "platform");
CREATE INDEX "game_admob_daily_metrics_date_idx" ON "game_admob_daily_metrics"("date");
