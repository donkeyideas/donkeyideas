-- Add geo columns to game_players (country, region, city).
-- Populated at register/login time from Vercel edge headers
-- (x-vercel-ip-country, x-vercel-ip-country-region, x-vercel-ip-city).
-- Nullable so existing rows + offline registrations are unaffected.

ALTER TABLE "game_players" ADD COLUMN "country" TEXT;
ALTER TABLE "game_players" ADD COLUMN "region"  TEXT;
ALTER TABLE "game_players" ADD COLUMN "city"    TEXT;

CREATE INDEX "game_players_country_idx" ON "game_players"("country");
