-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deepSeekApiKey" TEXT,
    "openaiApiKey" TEXT,
    "anthropicApiKey" TEXT,
    "googleApiKey" TEXT,
    "stripeApiKey" TEXT,
    "sendgridApiKey" TEXT,
    "twilioApiKey" TEXT,
    "twilioApiSecret" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "model" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "cost" DECIMAL NOT NULL DEFAULT 0,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "statusCode" INTEGER,
    "error" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pl_statements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "period" DATETIME NOT NULL,
    "productRevenue" DECIMAL NOT NULL DEFAULT 0,
    "serviceRevenue" DECIMAL NOT NULL DEFAULT 0,
    "otherRevenue" DECIMAL NOT NULL DEFAULT 0,
    "directCosts" DECIMAL NOT NULL DEFAULT 0,
    "infrastructureCosts" DECIMAL NOT NULL DEFAULT 0,
    "salesMarketing" DECIMAL NOT NULL DEFAULT 0,
    "rdExpenses" DECIMAL NOT NULL DEFAULT 0,
    "adminExpenses" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pl_statements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "balance_sheets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "period" DATETIME NOT NULL,
    "cashEquivalents" DECIMAL NOT NULL DEFAULT 0,
    "accountsReceivable" DECIMAL NOT NULL DEFAULT 0,
    "fixedAssets" DECIMAL NOT NULL DEFAULT 0,
    "accountsPayable" DECIMAL NOT NULL DEFAULT 0,
    "shortTermDebt" DECIMAL NOT NULL DEFAULT 0,
    "longTermDebt" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "balance_sheets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "period" DATETIME NOT NULL,
    "operatingCashFlow" DECIMAL NOT NULL DEFAULT 0,
    "investingCashFlow" DECIMAL NOT NULL DEFAULT 0,
    "financingCashFlow" DECIMAL NOT NULL DEFAULT 0,
    "netCashFlow" DECIMAL NOT NULL DEFAULT 0,
    "beginningCash" DECIMAL NOT NULL DEFAULT 0,
    "endingCash" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cash_flows_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT,
    "affectsPL" BOOLEAN NOT NULL DEFAULT false,
    "affectsBalance" BOOLEAN NOT NULL DEFAULT true,
    "affectsCashFlow" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "period" DATETIME NOT NULL,
    "mrr" DECIMAL,
    "cac" DECIMAL,
    "ltv" DECIMAL,
    "churnRate" DECIMAL,
    "nps" INTEGER,
    "activeUsers" INTEGER,
    "growthRate" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "kpis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "mission" TEXT,
    "about" TEXT,
    "targetMarket" TEXT,
    "competitiveAdvantage" TEXT,
    "keyCompetitors" TEXT,
    "totalCustomers" INTEGER,
    "monthlyRevenue" DECIMAL,
    "momGrowth" DECIMAL,
    "retentionRate" DECIMAL,
    "teamSize" INTEGER,
    "totalFunding" DECIMAL,
    "keyAchievements" TEXT,
    "projectStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "business_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boards_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "columns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "columns_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cards_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "columns" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "changes" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissions" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_members_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "investor_access" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'read_only',
    "investment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "investor_access_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "investor_updates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metricsIncluded" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" DATETIME,
    CONSTRAINT "investor_updates_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "investor_access" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "valuations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "score" INTEGER NOT NULL,
    "parameters" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "valuations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "decks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deckType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "decks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "whitepapers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "publishedDate" DATETIME,
    "classification" TEXT NOT NULL DEFAULT 'Public',
    "executiveSummary" TEXT,
    "companyOverview" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "coreValues" TEXT,
    "legalName" TEXT,
    "founded" TEXT,
    "headquarters" TEXT,
    "website" TEXT,
    "problemStatement" TEXT,
    "marketOpportunity" TEXT,
    "solution" TEXT,
    "productDescription" TEXT,
    "technologyStack" TEXT,
    "architecture" TEXT,
    "technicalDetails" TEXT,
    "businessModel" TEXT,
    "revenueStreams" TEXT,
    "pricingStrategy" TEXT,
    "goToMarket" TEXT,
    "targetMarket" TEXT,
    "marketSize" TEXT,
    "marketTrends" TEXT,
    "customerSegments" TEXT,
    "competitiveAnalysis" TEXT,
    "competitors" TEXT,
    "competitiveAdvantage" TEXT,
    "teamDescription" TEXT,
    "keyTeamMembers" TEXT,
    "advisors" TEXT,
    "partners" TEXT,
    "roadmap" TEXT,
    "milestones" TEXT,
    "financialProjections" TEXT,
    "fundingHistory" TEXT,
    "useOfFunds" TEXT,
    "financialHighlights" TEXT,
    "tokenomics" TEXT,
    "tokenDistribution" TEXT,
    "economics" TEXT,
    "useCases" TEXT,
    "caseStudies" TEXT,
    "legalConsiderations" TEXT,
    "regulatoryCompliance" TEXT,
    "riskFactors" TEXT,
    "disclaimers" TEXT,
    "appendices" TEXT,
    "references" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewed" DATETIME,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "whitepapers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "website_content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "section" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "layout" TEXT NOT NULL DEFAULT 'default',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "message" TEXT NOT NULL,
    "interest" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE INDEX "api_usage_userId_createdAt_idx" ON "api_usage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "api_usage_provider_createdAt_idx" ON "api_usage"("provider", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "pl_statements_companyId_period_idx" ON "pl_statements"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "pl_statements_companyId_period_key" ON "pl_statements"("companyId", "period");

-- CreateIndex
CREATE INDEX "balance_sheets_companyId_period_idx" ON "balance_sheets"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheets_companyId_period_key" ON "balance_sheets"("companyId", "period");

-- CreateIndex
CREATE INDEX "cash_flows_companyId_period_idx" ON "cash_flows"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flows_companyId_period_key" ON "cash_flows"("companyId", "period");

-- CreateIndex
CREATE INDEX "transactions_companyId_date_idx" ON "transactions"("companyId", "date");

-- CreateIndex
CREATE INDEX "transactions_companyId_type_affectsCashFlow_idx" ON "transactions"("companyId", "type", "affectsCashFlow");

-- CreateIndex
CREATE INDEX "transactions_companyId_date_type_idx" ON "transactions"("companyId", "date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "kpis_companyId_period_key" ON "kpis"("companyId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_companyId_key" ON "business_profiles"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_companyId_email_key" ON "team_members"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "investor_access_companyId_email_key" ON "investor_access"("companyId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "whitepapers_companyId_key" ON "whitepapers"("companyId");

-- CreateIndex
CREATE INDEX "activities_userId_createdAt_idx" ON "activities"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_companyId_createdAt_idx" ON "activities"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "website_content_section_key" ON "website_content"("section");

-- CreateIndex
CREATE UNIQUE INDEX "pages_companyId_slug_key" ON "pages"("companyId", "slug");

-- CreateIndex
CREATE INDEX "chats_userId_updatedAt_idx" ON "chats"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "chat_messages_chatId_createdAt_idx" ON "chat_messages"("chatId", "createdAt");
