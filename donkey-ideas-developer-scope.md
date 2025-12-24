# DONKEY IDEAS - DEVELOPER SCOPE DOCUMENT
## Website + Admin Dashboard - Full Stack Development

**Project:** Donkey Ideas Platform  
**Version:** 1.0  
**Date:** November 21, 2024  
**Classification:** Internal Development

---

## 🚨 CRITICAL REQUIREMENTS - READ FIRST

### **ZERO HARD-CODED DATA POLICY**

**THIS IS MANDATORY AND NON-NEGOTIABLE:**

1. ❌ **NO MOCK DATA** - Do not include ANY sample/demo/mock data in the codebase
2. ❌ **NO HARD-CODED VALUES** - All data must come from the database
3. ❌ **NO PLACEHOLDER CONTENT** - No "Lorem ipsum" or fake data
4. ✅ **ONLY EXCEPTION** - Website public content CAN be pre-populated in the database

**What this means:**

```javascript
// ❌ WRONG - Hard-coded data
const companies = [
  { name: "AI Workflow Engine", revenue: 850000 },
  { name: "Market Intelligence", revenue: 120000 }
];

// ✅ CORRECT - From database
const companies = await db.companies.findMany({
  where: { userId: currentUser.id }
});
```

**If the database is empty, the system should show:**
- Empty states with clear CTAs ("Create your first company")
- Onboarding flows
- Tutorial prompts
- Zero data, not fake data

**The ONLY pre-populated data allowed:**
- Website homepage content (hero text, about us, etc.)
- System configuration (feature flags, settings)
- Email templates
- Error messages

---

## 1. PROJECT OVERVIEW

### 1.1 What We're Building

**Two Applications:**

1. **Public Website** (donkeyideas.com)
   - Marketing site showcasing Donkey Ideas
   - Company information and services
   - Portfolio/ventures showcase
   - Contact forms and lead generation

2. **Admin Dashboard** (app.donkeyideas.com)
   - Venture operating system
   - Multi-company management
   - Financial tracking and analytics
   - Team collaboration tools
   - Investor portal
   - AI-powered features

### 1.2 Target Completion

**Timeline:** 16 weeks (4 months)  
**Team Size:** 4-6 developers  
**Launch Date:** Q1 2025

---

## 2. TECHNICAL ARCHITECTURE

### 2.1 Technology Stack

**Frontend (Both Website & Dashboard)**
```
Framework:        Next.js 14+ (App Router)
Language:         TypeScript 5+
Styling:          Tailwind CSS 3+
UI Components:    shadcn/ui (Radix primitives)
State Management: Zustand or React Context
Forms:            React Hook Form + Zod
HTTP Client:      Axios + React Query (TanStack Query)
Charts:           Recharts
Auth:             NextAuth.js v5
```

**Backend**
```
Runtime:          Node.js 20+ LTS
Framework:        Next.js API Routes OR Express.js (separate)
Language:         TypeScript 5+
Validation:       Zod schemas
Authentication:   NextAuth.js with JWT
API Style:        RESTful (with clear versioning)
```

**Database**
```
Primary:          PostgreSQL 15+
ORM:             Prisma 5+
Caching:         Redis 7+ (for sessions, rate limiting)
Search:          PostgreSQL full-text search (initially)
```

**File Storage**
```
Service:         AWS S3 OR Cloudflare R2
Access:          Pre-signed URLs for security
CDN:            CloudFront or Cloudflare
```

**AI Services**
```
Provider:        OpenAI API (GPT-4)
Use Cases:       Deck generation, forecasting, content
Cost Control:    Request caching, rate limiting
```

**Infrastructure**
```
Hosting:         Vercel (frontend) + Railway/Render (backend if separate)
Database:        Railway or Supabase
Monitoring:      Sentry (errors) + Vercel Analytics
Email:           SendGrid or Postmark
Queue:           BullMQ (for async jobs)
```

### 2.2 Architecture Pattern

**Monorepo Structure (Recommended):**
```
donkey-ideas/
├── apps/
│   ├── web/              # Public website (Next.js)
│   └── dashboard/        # Admin dashboard (Next.js)
├── packages/
│   ├── database/         # Prisma schema, client
│   ├── ui/              # Shared UI components
│   ├── auth/            # Authentication logic
│   ├── email/           # Email templates
│   └── config/          # Shared config
├── docker-compose.yml   # Local development
└── package.json
```

**Alternative: Separate Repos**
```
- donkey-ideas-web       (Public website)
- donkey-ideas-dashboard (Admin dashboard)
- donkey-ideas-api       (Optional separate backend)
```

---

## 3. DATABASE SCHEMA

### 3.1 Core Tables

**CRITICAL: All data is DYNAMIC - no seeding except website content**

```prisma
// User Management
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  companies     Company[]
  sessions      Session[]
  activities    Activity[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Company Management
model Company {
  id          String   @id @default(cuid())
  userId      String
  name        String
  tagline     String?
  description String?
  status      String   @default("active") // active, beta, paused, archived
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user               User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  plStatements       PLStatement[]
  balanceSheets      BalanceSheet[]
  kpis               KPI[]
  businessProfile    BusinessProfile?
  boards             Board[]
  documents          Document[]
  decks              Deck[]
  pages              Page[]
  teamMembers        TeamMember[]
  investorAccess     InvestorAccess[]
  valuations         Valuation[]
}

// Financial Data
model PLStatement {
  id                  String   @id @default(cuid())
  companyId           String
  period              DateTime // First day of month/quarter
  productRevenue      Decimal  @default(0)
  serviceRevenue      Decimal  @default(0)
  otherRevenue        Decimal  @default(0)
  directCosts         Decimal  @default(0)
  infrastructureCosts Decimal  @default(0)
  salesMarketing      Decimal  @default(0)
  rdExpenses          Decimal  @default(0)
  adminExpenses       Decimal  @default(0)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, period])
}

model BalanceSheet {
  id                   String   @id @default(cuid())
  companyId            String
  period               DateTime
  cashEquivalents      Decimal  @default(0)
  accountsReceivable   Decimal  @default(0)
  fixedAssets          Decimal  @default(0)
  accountsPayable      Decimal  @default(0)
  shortTermDebt        Decimal  @default(0)
  longTermDebt         Decimal  @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, period])
}

model KPI {
  id            String   @id @default(cuid())
  companyId     String
  period        DateTime
  mrr           Decimal? // Monthly Recurring Revenue
  cac           Decimal? // Customer Acquisition Cost
  ltv           Decimal? // Lifetime Value
  churnRate     Decimal? // Percentage
  nps           Int?     // Net Promoter Score
  activeUsers   Int?
  growthRate    Decimal? // Percentage MoM
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, period])
}

// Business Profile
model BusinessProfile {
  id                   String   @id @default(cuid())
  companyId            String   @unique
  mission              String?
  about                String?
  targetMarket         String?
  competitiveAdvantage String?
  keyCompetitors       String?
  totalCustomers       Int?
  monthlyRevenue       Decimal?
  momGrowth            Decimal?
  retentionRate        Decimal?
  teamSize             Int?
  totalFunding         Decimal?
  keyAchievements      String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}

// Project Management
model Board {
  id        String   @id @default(cuid())
  companyId String
  name      String
  createdAt DateTime @default(now())
  
  company Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  columns Column[]
}

model Column {
  id       String @id @default(cuid())
  boardId  String
  name     String
  position Int
  
  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  cards Card[]
}

model Card {
  id          String   @id @default(cuid())
  columnId    String
  title       String
  description String?
  position    Int
  tags        String[] // Array of tag strings
  createdAt   DateTime @default(now())
  
  column Column @relation(fields: [columnId], references: [id], onDelete: Cascade)
}

// Document Management
model Document {
  id         String   @id @default(cuid())
  companyId  String
  filename   String
  fileUrl    String
  fileType   String
  fileSize   Int      // bytes
  version    Int      @default(1)
  uploadedBy String
  createdAt  DateTime @default(now())
  
  company  Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  versions DocumentVersion[]
}

model DocumentVersion {
  id          String   @id @default(cuid())
  documentId  String
  version     Int
  fileUrl     String
  changes     String?
  uploadedBy  String
  createdAt   DateTime @default(now())
  
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}

// Team Management
model TeamMember {
  id          String   @id @default(cuid())
  companyId   String
  userId      String?  // Null if invite not accepted
  email       String
  role        String   // owner, admin, member, viewer
  permissions Json     // Flexible permission object
  status      String   @default("pending") // pending, active, inactive
  invitedBy   String
  createdAt   DateTime @default(now())
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, email])
}

// Investor Portal
model InvestorAccess {
  id          String   @id @default(cuid())
  companyId   String
  email       String
  accessLevel String   @default("read_only")
  investment  String?
  status      String   @default("pending")
  lastLogin   DateTime?
  createdAt   DateTime @default(now())
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  updates InvestorUpdate[]
  
  @@unique([companyId, email])
}

model InvestorUpdate {
  id              String   @id @default(cuid())
  companyId       String
  investorId      String
  title           String
  content         String
  metricsIncluded Json     // Array of metric keys
  sentAt          DateTime @default(now())
  openedAt        DateTime?
  
  investor InvestorAccess @relation(fields: [investorId], references: [id], onDelete: Cascade)
}

// Valuation
model Valuation {
  id         String   @id @default(cuid())
  companyId  String
  method     String   // revenue_multiple, dcf, market_comps
  amount     Decimal
  score      Int      // AI score 0-100
  parameters Json     // Method-specific params
  createdAt  DateTime @default(now())
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}

// Pitch Decks
model Deck {
  id         String   @id @default(cuid())
  companyId  String
  title      String
  deckType   String   // investor, sales, partnership
  content    Json     // Array of slide objects
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}

// Activity Logs
model Activity {
  id         String   @id @default(cuid())
  userId     String
  companyId  String?
  action     String   // create, update, delete, etc.
  entityType String   // company, financial, document, etc.
  entityId   String?
  changes    Json?    // Before/after values
  ipAddress  String?
  createdAt  DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@index([companyId, createdAt])
}

// Website Content (ONLY EXCEPTION FOR PRE-POPULATION)
model WebsiteContent {
  id        String   @id @default(cuid())
  section   String   @unique // hero, about, services, etc.
  content   Json     // Flexible content structure
  published Boolean  @default(true)
  updatedAt DateTime @updatedAt
}

model Page {
  id        String   @id @default(cuid())
  companyId String?  // Null for main website pages
  slug      String
  title     String
  content   Json
  layout    String   @default("default")
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  company Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  @@unique([companyId, slug])
}
```

### 3.2 Data Seeding (ONLY FOR WEBSITE)

**File:** `prisma/seeds/website-content.ts`

```typescript
// ONLY website content can be pre-populated
const websiteContent = [
  {
    section: 'hero',
    content: {
      label: 'Innovation Laboratory / Venture Builder',
      headline: 'Transforming\nUnconventional\nIdeas Into\nIntelligent Systems',
      description: 'We architect and deploy AI-powered products...',
      cta: {
        primary: { text: 'EXPLORE VENTURES', link: '#ventures' },
        secondary: { text: 'VIEW SERVICES', link: '#services' }
      }
    }
  },
  {
    section: 'about',
    content: {
      title: 'Who We Are',
      text: 'Donkey Ideas is an AI-powered innovation lab...'
    }
  }
  // ... more website sections
];

// NO OTHER DATA SEEDING ALLOWED
```

---

## 4. PUBLIC WEBSITE SPECIFICATION

### 4.1 Website Structure

**Route:** `donkeyideas.com` (or `web.` subdomain)

**Pages Required:**
1. Homepage (`/`)
2. About Us (`/about`)
3. Services (`/services`)
4. Ventures/Portfolio (`/ventures`)
5. Contact (`/contact`)
6. Blog (Optional) (`/blog`)
7. Legal (`/privacy`, `/terms`)

### 4.2 Homepage Sections

#### Section 1: Hero
```typescript
interface HeroSection {
  label: string;        // "Innovation Laboratory"
  headline: string[];   // Multi-line headline
  description: string;
  primaryCTA: {
    text: string;
    link: string;
  };
  secondaryCTA?: {
    text: string;
    link: string;
  };
  backgroundImage?: string;
}
```

**Design Requirements:**
- Full viewport height
- Large, bold typography (64-80px headline)
- Gradient background (#0A0A0A to dark blue)
- Smooth scroll to sections
- Responsive (mobile: 32-40px headline)

#### Section 2: What We Do
```typescript
interface ServicesSection {
  title: string;
  description: string;
  services: Array<{
    icon: string;      // Emoji or icon name
    title: string;
    description: string;
    features: string[];
  }>;
}
```

**Services to Display:**
1. **Venture Operating System**
   - Financial management
   - Team collaboration
   - AI-powered tools
   
2. **Venture Building**
   - MVP development
   - AI implementation
   - Go-to-market strategy
   
3. **Innovation Lab**
   - Concept validation
   - Rapid prototyping
   - Market research

#### Section 3: Portfolio/Ventures
```typescript
// Dynamic from database
interface VentureCard {
  id: string;
  name: string;
  tagline: string;
  status: 'active' | 'beta' | 'development';
  arr?: number;        // Show if > 0
  teamSize?: number;
  logo?: string;
}
```

**Data Source:** `Company` table where `status != 'archived'`

**Display:**
- Grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Hover effect with details
- Click to view more (optional detail page)

#### Section 4: How We Work
```typescript
interface ProcessStep {
  number: number;
  title: string;
  description: string;
  duration: string;
}
```

**Steps:**
1. Discovery (Week 1-2)
2. Design (Week 2-4)
3. Development (Week 4-12)
4. Launch (Week 12-16)
5. Scale (Ongoing)

#### Section 5: Contact/CTA
```typescript
interface ContactForm {
  name: string;
  email: string;
  company?: string;
  message: string;
  interest: 'platform' | 'services' | 'partnership' | 'other';
}
```

**Form Handling:**
- Validate all fields (Zod schema)
- Store in `ContactSubmission` table
- Send notification email
- Auto-reply to user
- Spam protection (reCAPTCHA or similar)

### 4.3 Responsive Design

**Breakpoints:**
```css
mobile:  320px - 768px
tablet:  769px - 1024px
desktop: 1025px+
```

**Requirements:**
- All sections must be fully responsive
- Touch-friendly on mobile (44px+ tap targets)
- Optimized images (WebP format, lazy loading)
- Smooth animations (60fps)

### 4.4 Performance Requirements

- Lighthouse score: 90+ (all categories)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- SEO: Complete meta tags, OpenGraph, structured data

---

## 5. ADMIN DASHBOARD SPECIFICATION

### 5.1 Authentication System

**Route:** `app.donkeyideas.com` OR `donkeyideas.com/app`

#### Registration Flow
```typescript
POST /api/auth/register
{
  name: string;
  email: string;
  password: string;  // Min 8 chars, 1 uppercase, 1 number
}

Response:
{
  user: { id, email, name };
  accessToken: string;
  refreshToken: string;
}
```

**Requirements:**
- Email verification required
- Password hashing with bcrypt (cost: 12)
- Rate limiting: 5 attempts per 15 minutes
- No registration if email exists

#### Login Flow
```typescript
POST /api/auth/login
{
  email: string;
  password: string;
}

Response: Same as registration
```

#### Session Management
- JWT access token (15-minute expiry)
- Refresh token (7-day expiry, HTTP-only cookie)
- Auto-refresh before expiry
- Logout clears all tokens

### 5.2 Dashboard Layout

**Components:**

1. **Sidebar** (Fixed, 280px width)
   - Logo
   - Global company selector (dropdown)
   - Navigation menu
   - User profile (bottom)

2. **Top Bar** (Sticky)
   - Breadcrumb navigation
   - Auto-save indicator
   - Notifications icon
   - User menu

3. **Main Content Area**
   - Dynamic based on route
   - Max width: 1600px
   - Padding: 2rem

### 5.3 Global Company Selector

**CRITICAL:** This is a single component used throughout the app

```typescript
interface CompanySelector {
  companies: Company[];          // From database
  currentCompany: Company | null;
  onChange: (companyId: string) => void;
}
```

**Behavior:**
- Loads user's companies on mount
- Stores selection in Zustand store
- Persists selection in localStorage
- Updates all dashboard views on change
- Shows "All Companies" option for consolidated view

**Empty State:**
```tsx
if (companies.length === 0) {
  return (
    <EmptyState
      title="No companies yet"
      description="Create your first company to get started"
      action={<Button onClick={openCreateModal}>Create Company</Button>}
    />
  );
}
```

### 5.4 Dashboard Sections (All Dynamic)

#### A. Dashboard Overview

**Route:** `/app/dashboard`

**Data Sources:**
```typescript
// All from database, NO hard-coded values
const stats = {
  totalRevenue: await calculateTotalRevenue(userId),
  portfolioValue: await calculatePortfolioValue(userId),
  activeProjects: await countActiveCompanies(userId),
  teamMembers: await countTeamMembers(userId)
};

const recentActivity = await getRecentActivity(userId, { limit: 10 });
```

**Empty State:**
```tsx
if (!hasAnyData) {
  return <OnboardingWizard />;
}
```

#### B. Financial Hub

**Route:** `/app/financials`

**Tabs:**
1. P&L Statement
2. Balance Sheet
3. KPIs
4. Consolidated View (if multiple companies)

**Data Flow:**
```typescript
// P&L Form
const handleSave = async (data: PLStatementInput) => {
  // Validate with Zod
  const validated = plStatementSchema.parse(data);
  
  // Save to database
  await db.pLStatement.upsert({
    where: {
      companyId_period: {
        companyId: currentCompany.id,
        period: data.period
      }
    },
    create: validated,
    update: validated
  });
  
  // Auto-save indicator
  showSaveSuccess();
};
```

**Auto-Calculations:**
```typescript
// Frontend calculations (also validated on backend)
const totalRevenue = productRevenue + serviceRevenue + otherRevenue;
const totalCOGS = directCosts + infrastructureCosts;
const grossProfit = totalRevenue - totalCOGS;
const totalOpEx = salesMarketing + rdExpenses + adminExpenses;
const netProfit = grossProfit - totalOpEx;
const profitMargin = (netProfit / totalRevenue) * 100;
const grossMargin = (grossProfit / totalRevenue) * 100;
```

**Empty State:**
```tsx
if (!hasFinancialData) {
  return (
    <EmptyState
      title="No financial data yet"
      description="Add your first P&L statement to get started"
      action={<Button>Add Financial Data</Button>}
    />
  );
}
```

#### C. Valuation Engine

**Route:** `/app/valuation`

**Calculation Methods:**

```typescript
// Revenue Multiple
function calculateRevenueMultiple(company: Company, kpis: KPI): Valuation {
  const arr = kpis.mrr * 12;
  let multiple = 5; // Base multiple
  
  // Adjust for growth
  if (kpis.growthRate >= 40) multiple = 10;
  else if (kpis.growthRate >= 30) multiple = 8;
  else if (kpis.growthRate >= 20) multiple = 6;
  
  // Adjust for profitability
  const profitMargin = calculateProfitMargin(company);
  if (profitMargin > 30) multiple += 1;
  else if (profitMargin < 0) multiple -= 1;
  
  // Adjust for retention
  if (kpis.churnRate < 2) multiple += 0.5;
  else if (kpis.churnRate > 5) multiple -= 0.5;
  
  return {
    method: 'revenue_multiple',
    amount: arr * multiple,
    multiple,
    arr
  };
}

// AI Score
function calculateAIScore(company: Company, kpis: KPI): number {
  const growthScore = normalize(kpis.growthRate, 0, 100);
  const profitScore = normalize(profitMargin, 0, 50);
  const retentionScore = normalize(100 - kpis.churnRate, 80, 100);
  const marketScore = 75; // Based on TAM analysis
  
  return Math.round((growthScore + profitScore + retentionScore + marketScore) / 4);
}
```

**API Endpoint:**
```typescript
POST /api/companies/:id/valuations/calculate

// Calculates all 3 methods, returns recommendation
```

**Empty State:** Show if no financial data exists

#### D. Business Profile

**Route:** `/app/business-profile`

**Form Sections:**
1. Company Information
2. Traction & Metrics
3. Market & Competition

**All fields editable, save to `BusinessProfile` table**

**Empty State:** Blank form with placeholders

#### E. Project Board

**Route:** `/app/projects`

**Drag & Drop:**
```typescript
// Use @dnd-kit/core for drag and drop
import { DndContext, closestCenter } from '@dnd-kit/core';

const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  if (active.id !== over.id) {
    // Update card position in database
    await updateCardPosition(active.id, over.id);
  }
};
```

**Data Structure:**
```typescript
// Each board has columns, each column has cards
const board = await db.board.findFirst({
  where: { companyId },
  include: {
    columns: {
      include: {
        cards: true
      },
      orderBy: { position: 'asc' }
    }
  }
});
```

**Empty State:**
```tsx
if (columns.length === 0) {
  return (
    <EmptyState
      title="No project board yet"
      description="Create columns to organize your tasks"
      action={<Button>Create Board</Button>}
    />
  );
}
```

#### F. Document Library

**Route:** `/app/documents`

**File Upload Flow:**
```typescript
1. Client: Select file(s)
2. Validate: Size (< 10MB), type (whitelist)
3. Generate: Pre-signed S3 URL
4. Upload: Direct to S3 (client-side)
5. Webhook: S3 confirms upload
6. Process: Create thumbnail (images), extract text (PDFs)
7. Save: Metadata to database
```

**Version Control:**
```typescript
// When file is updated
const newVersion = await db.document.update({
  where: { id: documentId },
  data: {
    version: { increment: 1 },
    fileUrl: newFileUrl,
    versions: {
      create: {
        version: currentVersion + 1,
        fileUrl: newFileUrl,
        changes: changeDescription,
        uploadedBy: userId
      }
    }
  }
});
```

**Empty State:**
```tsx
if (documents.length === 0) {
  return (
    <EmptyState
      title="No documents yet"
      description="Upload your first file to get started"
      action={<UploadButton />}
    />
  );
}
```

#### G. AI Deck Builder

**Route:** `/app/deck-builder`

**Generation Flow:**
```typescript
POST /api/companies/:id/decks/generate

// 1. Fetch data from database
const company = await db.company.findUnique({
  where: { id: companyId },
  include: {
    businessProfile: true,
    plStatements: { take: 12, orderBy: { period: 'desc' } },
    kpis: { take: 12, orderBy: { period: 'desc' } }
  }
});

// 2. Generate slides with AI
const slides = await generateDeckContent(company);

// 3. Save to database
const deck = await db.deck.create({
  data: {
    companyId,
    title: `${company.name} - Investor Deck`,
    deckType: 'investor',
    content: slides
  }
});
```

**AI Prompt Structure:**
```typescript
const prompt = `
Generate a ${slideType} slide for a pitch deck.

Company: ${company.name}
Tagline: ${company.tagline}
Context: ${relevantData}

Format response as JSON:
{
  "title": "...",
  "content": ["bullet point 1", "bullet point 2"],
  "notes": "speaker notes"
}
`;
```

**Empty State:** Always shows template, generates on click

#### H. Team Management

**Route:** `/app/team`

**Invite Flow:**
```typescript
POST /api/team/invite

{
  email: string;
  role: 'admin' | 'member' | 'viewer';
  companyIds: string[];
}

// Creates TeamMember with status 'pending'
// Sends invitation email with magic link
// On accept, creates User and updates TeamMember
```

**Permission Check:**
```typescript
// Middleware for every route
async function checkPermission(userId, companyId, action) {
  const member = await db.teamMember.findFirst({
    where: { userId, companyId }
  });
  
  return hasPermission(member.role, action);
}
```

**Empty State:**
```tsx
if (teamMembers.length === 1) { // Only owner
  return (
    <EmptyState
      title="You're the only team member"
      description="Invite colleagues to collaborate"
      action={<Button>Invite Team Member</Button>}
    />
  );
}
```

#### I. Investor Portal

**Route:** `/app/investor-portal`

**Monthly Update Composer:**
```typescript
POST /api/investor-updates

{
  companyId: string;
  title: string;
  content: string;
  metricsIncluded: string[];  // ['mrr', 'arr', 'growthRate']
  recipients: string[];       // investor emails
  attachments?: string[];     // document IDs
}

// Fetches current metrics from database
// Renders email template with metrics
// Sends via SendGrid
// Tracks opens (tracking pixel)
```

**Empty State:**
```tsx
if (investors.length === 0) {
  return (
    <EmptyState
      title="No investors yet"
      description="Invite investors to share updates"
      action={<Button>Invite Investor</Button>}
    />
  );
}
```

#### J. Activity Logs

**Route:** `/app/activity`

**Logging System:**
```typescript
// Middleware to log all actions
async function logActivity(req, action, entityType, entityId, changes) {
  await db.activity.create({
    data: {
      userId: req.user.id,
      companyId: req.currentCompany?.id,
      action,
      entityType,
      entityId,
      changes,
      ipAddress: req.ip,
      createdAt: new Date()
    }
  });
}

// Usage
await logActivity(req, 'update', 'financial', plStatement.id, {
  before: { revenue: 82000 },
  after: { revenue: 85000 }
});
```

**Timeline Display:**
```typescript
const activities = await db.activity.findMany({
  where: {
    userId: req.user.id,
    ...(filters.companyId && { companyId: filters.companyId }),
    ...(filters.action && { action: filters.action })
  },
  orderBy: { createdAt: 'desc' },
  take: 50
});
```

**Empty State:**
```tsx
if (activities.length === 0) {
  return (
    <EmptyState
      title="No activity yet"
      description="Actions will appear here as you use the platform"
    />
  );
}
```

#### K. Analytics & Reports

**Route:** `/app/analytics`

**Custom Reports:**
```typescript
// Report builder
interface CustomReport {
  name: string;
  type: 'financial' | 'customer' | 'comprehensive';
  schedule: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  metrics: string[];
  format: 'pdf' | 'excel' | 'csv';
}

// Generation
async function generateReport(reportConfig: CustomReport) {
  // Query database for metrics
  const data = await fetchReportData(reportConfig);
  
  // Generate file
  if (reportConfig.format === 'pdf') {
    return generatePDF(data);
  } else {
    return generateExcel(data);
  }
}
```

**Empty State:** Shows sample charts with CTA to add data

#### L. Website Manager

**Route:** `/app/website`

**Content Editor:**
```typescript
// Edit website sections
PUT /api/website-content/:section

{
  content: Json;  // Flexible structure per section
  published: boolean;
}

// Immediately updates public website
// No deploy needed (served from DB)
```

**Empty State:** Shows current website content, always editable

---

## 6. API ENDPOINTS SPECIFICATION

### 6.1 API Design Principles

**Rules:**
1. RESTful conventions
2. JSON request/response
3. Proper HTTP status codes
4. Consistent error format
5. Pagination for lists
6. Rate limiting (100 req/min per user)
7. API versioning (/api/v1/)

**Error Response Format:**
```typescript
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input data",
    details: [
      { field: "email", message: "Invalid email format" }
    ]
  }
}
```

### 6.2 Complete API List

**Authentication**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
PUT    /api/auth/me
```

**Companies**
```
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id
```

**Financials - P&L**
```
POST   /api/companies/:id/financials/pl
GET    /api/companies/:id/financials/pl
GET    /api/companies/:id/financials/pl/:period
PUT    /api/companies/:id/financials/pl/:period
DELETE /api/companies/:id/financials/pl/:period
```

**Financials - Balance Sheet**
```
POST   /api/companies/:id/financials/balance-sheet
GET    /api/companies/:id/financials/balance-sheet/:period
PUT    /api/companies/:id/financials/balance-sheet/:period
```

**KPIs**
```
POST   /api/companies/:id/kpis
GET    /api/companies/:id/kpis/:period
PUT    /api/companies/:id/kpis/:period
```

**Consolidated**
```
GET    /api/financials/consolidated
```

**Business Profile**
```
GET    /api/companies/:id/profile
PUT    /api/companies/:id/profile
```

**Valuation**
```
POST   /api/companies/:id/valuations/calculate
GET    /api/companies/:id/valuations/latest
GET    /api/companies/:id/valuations/history
```

**Project Board**
```
GET    /api/companies/:id/boards
POST   /api/companies/:id/boards
GET    /api/boards/:id
PUT    /api/boards/:id
DELETE /api/boards/:id
POST   /api/boards/:id/columns
PUT    /api/columns/:id
DELETE /api/columns/:id
POST   /api/columns/:id/cards
PUT    /api/cards/:id
DELETE /api/cards/:id
PUT    /api/cards/:id/move
```

**Documents**
```
GET    /api/companies/:id/documents
POST   /api/companies/:id/documents/upload-url  // Returns pre-signed URL
POST   /api/companies/:id/documents             // After S3 upload
GET    /api/documents/:id
DELETE /api/documents/:id
GET    /api/documents/:id/versions
POST   /api/documents/:id/restore/:version
```

**Deck Builder**
```
POST   /api/companies/:id/decks/generate
GET    /api/companies/:id/decks
GET    /api/decks/:id
PUT    /api/decks/:id
DELETE /api/decks/:id
GET    /api/decks/:id/export/pdf
GET    /api/decks/:id/export/pptx
```

**Team**
```
GET    /api/companies/:id/team
POST   /api/companies/:id/team/invite
DELETE /api/team/:memberId
PUT    /api/team/:memberId/role
```

**Investor Portal**
```
GET    /api/companies/:id/investors
POST   /api/companies/:id/investors/invite
PUT    /api/investors/:id
DELETE /api/investors/:id
POST   /api/investors/update/send
GET    /api/investors/updates/history
```

**Activity**
```
GET    /api/activity
GET    /api/activity/export
```

**Analytics**
```
GET    /api/analytics/dashboard
GET    /api/analytics/revenue-trends
GET    /api/analytics/customer-metrics
POST   /api/analytics/reports
GET    /api/analytics/reports/:id/run
```

**Website Content**
```
GET    /api/website-content/:section
PUT    /api/website-content/:section
GET    /api/website-content/preview
```

**Contact**
```
POST   /api/contact
```

---

## 7. FRONTEND COMPONENTS

### 7.1 Component Library

**Build with shadcn/ui (Radix primitives + Tailwind)**

**Core Components:**
```
- Button (primary, secondary, ghost, danger)
- Input (text, email, number, password)
- Textarea
- Select (single, multi)
- Checkbox
- Radio
- Switch
- Card
- Table
- Modal/Dialog
- Dropdown Menu
- Tabs
- Badge
- Alert
- Toast/Notification
- Loading Spinner
- Skeleton Loader
- Empty State
- Form (with validation)
```

### 7.2 Empty State Pattern

**CRITICAL: Every section needs an empty state**

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

// Example usage
if (companies.length === 0) {
  return (
    <EmptyState
      icon={<BuildingIcon />}
      title="No companies yet"
      description="Create your first company to start tracking your ventures"
      action={
        <Button onClick={openCreateModal}>
          Create Your First Company
        </Button>
      }
    />
  );
}
```

**Required Empty States:**
- No companies
- No financial data
- No documents
- No team members
- No investors
- No activity
- No project cards
- No decks
- No reports
- Search results not found

### 7.3 Loading States

```tsx
// Skeleton loaders for all data fetching
import { Skeleton } from '@/components/ui/skeleton';

if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
```

### 7.4 Auto-Save Implementation

```tsx
import { useDebounce } from '@/hooks/useDebounce';

const [data, setData] = useState(initialData);
const debouncedData = useDebounce(data, 1000); // 1 second delay

useEffect(() => {
  if (debouncedData !== initialData) {
    saveData(debouncedData);
    showAutoSaveIndicator();
  }
}, [debouncedData]);
```

---

## 8. SECURITY REQUIREMENTS

### 8.1 Authentication Security

```typescript
// Password requirements
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'At least 1 uppercase letter')
  .regex(/[0-9]/, 'At least 1 number')
  .regex(/[^A-Za-z0-9]/, 'At least 1 special character');

// Bcrypt hashing
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);

// JWT tokens
const accessToken = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### 8.2 Authorization

```typescript
// Middleware for protected routes
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await db.user.findUnique({ where: { id: decoded.userId } });
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Permission check
async function requirePermission(action: string) {
  return async (req, res, next) => {
    const hasPermission = await checkUserPermission(
      req.user.id,
      req.params.companyId,
      action
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}
```

### 8.3 Data Protection

```typescript
// Input sanitization
import { z } from 'zod';

// Validate all inputs
const plStatementSchema = z.object({
  period: z.date(),
  productRevenue: z.number().min(0),
  serviceRevenue: z.number().min(0),
  // ... all fields
});

// SQL injection prevention (Prisma handles this)
// XSS prevention
import DOMPurify from 'isomorphic-dompurify';

const sanitized = DOMPurify.sanitize(userInput);

// CSRF protection
// Use SameSite cookies and CSRF tokens
```

### 8.4 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

---

## 9. PERFORMANCE OPTIMIZATION

### 9.1 Database Optimization

```typescript
// Add indexes
@@index([userId, createdAt])
@@index([companyId, period])

// Use select to fetch only needed fields
const companies = await db.company.findMany({
  select: {
    id: true,
    name: true,
    status: true
  }
});

// Pagination
const companies = await db.company.findMany({
  skip: (page - 1) * pageSize,
  take: pageSize
});
```

### 9.2 Caching Strategy

```typescript
// Redis cache for expensive queries
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedData(key: string, fetchFn: () => Promise<any>) {
  // Check cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const data = await fetchFn();
  
  // Cache for 5 minutes
  await redis.setex(key, 300, JSON.stringify(data));
  
  return data;
}

// Usage
const stats = await getCachedData(
  `dashboard:${userId}`,
  () => calculateDashboardStats(userId)
);
```

### 9.3 Frontend Optimization

```typescript
// Code splitting
const DeckBuilder = lazy(() => import('./pages/DeckBuilder'));

// Image optimization (Next.js Image component)
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  loading="lazy"
/>

// Virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

---

## 10. TESTING REQUIREMENTS

### 10.1 Unit Tests

**Target Coverage: 80%+**

```typescript
// Example: Financial calculations
describe('Financial Calculations', () => {
  it('should calculate net profit correctly', () => {
    const result = calculateNetProfit({
      revenue: 1000,
      cogs: 300,
      opex: 200
    });
    
    expect(result).toBe(500);
  });
  
  it('should calculate profit margin', () => {
    const result = calculateProfitMargin({
      netProfit: 500,
      revenue: 1000
    });
    
    expect(result).toBe(50);
  });
});
```

### 10.2 Integration Tests

```typescript
// Example: API endpoint test
describe('POST /api/companies', () => {
  it('should create a company', async () => {
    const response = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Company',
        tagline: 'Test tagline'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.company.name).toBe('Test Company');
  });
  
  it('should return 401 without auth', async () => {
    const response = await request(app)
      .post('/api/companies')
      .send({ name: 'Test' });
    
    expect(response.status).toBe(401);
  });
});
```

### 10.3 E2E Tests

```typescript
// Example: User flow test (Playwright)
test('complete onboarding flow', async ({ page }) => {
  // Register
  await page.goto('/register');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'SecurePass123!');
  await page.click('button[type=submit]');
  
  // Create company
  await page.waitForURL('/app/dashboard');
  await page.click('text=Create Company');
  await page.fill('[name=name]', 'Test Company');
  await page.click('text=Create');
  
  // Verify dashboard shows company
  await expect(page.locator('text=Test Company')).toBeVisible();
});
```

---

## 11. DEPLOYMENT

### 11.1 Environment Variables

```bash
# .env.example (NEVER commit actual .env)

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/donkey_ideas"
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-super-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# AWS
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="donkey-ideas-uploads"

# OpenAI
OPENAI_API_KEY="sk-..."

# Email
SENDGRID_API_KEY="SG...."
EMAIL_FROM="noreply@donkeyideas.com"

# Monitoring
SENTRY_DSN="https://..."

# Environment
NODE_ENV="production"
```

### 11.2 Deployment Process

**Staging:**
```bash
git push staging develop
# Auto-deploy via GitHub Actions
# Run migrations: npx prisma migrate deploy
# Verify on staging.donkeyideas.com
```

**Production:**
```bash
git push production main
# Manual approval required
# Zero-downtime deployment
# Run migrations in transaction
# Health check before routing traffic
```

### 11.3 Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Seed website content
- [ ] SSL certificates valid
- [ ] Error monitoring active (Sentry)
- [ ] Uptime monitoring configured
- [ ] Backup schedule active
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Email sending works
- [ ] File uploads work
- [ ] AI features functional
- [ ] Performance metrics baseline

---

## 12. DOCUMENTATION REQUIREMENTS

### 12.1 Code Documentation

**Required:**
- JSDoc comments for all functions
- README in each major directory
- API endpoint documentation
- Component prop documentation

```typescript
/**
 * Calculate company valuation using revenue multiple method
 * @param arr - Annual Recurring Revenue in dollars
 * @param growthRate - Month-over-month growth rate (decimal)
 * @param profitMargin - Net profit margin (decimal)
 * @returns Valuation object with amount and multiple
 */
function calculateValuation(
  arr: number,
  growthRate: number,
  profitMargin: number
): Valuation {
  // ...
}
```

### 12.2 API Documentation

**Use OpenAPI/Swagger:**

```yaml
# swagger.yaml
openapi: 3.0.0
info:
  title: Donkey Ideas API
  version: 1.0.0

paths:
  /api/companies:
    get:
      summary: List all companies
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Company'
```

### 12.3 User Documentation

**Required:**
- Getting Started guide
- Feature tutorials
- Video walkthroughs
- FAQ section
- Troubleshooting guide

---

## 13. MAINTENANCE & SUPPORT

### 13.1 Monitoring

**Required Metrics:**
- Response times (p50, p95, p99)
- Error rates
- Database query times
- API endpoint usage
- User activity
- Disk/memory usage
- Database connection pool

**Alerts:**
- Response time > 500ms
- Error rate > 1%
- Disk usage > 80%
- Database connections > 80%
- SSL certificate expiring < 30 days

### 13.2 Backup Strategy

**Database:**
- Automated daily backups
- 30-day retention
- Point-in-time recovery (PITR)
- Weekly backup verification

**Files:**
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies

### 13.3 Error Handling

```typescript
// Global error handler
app.use((err, req, res, next) => {
  // Log to Sentry
  Sentry.captureException(err);
  
  // Log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }
  
  // Send appropriate response
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});
```

---

## 14. FINAL CHECKLIST

### Before Development Starts:
- [ ] Technology stack approved
- [ ] Design mockups reviewed
- [ ] Database schema finalized
- [ ] API contracts agreed
- [ ] Timeline confirmed
- [ ] Team assembled
- [ ] Development environment setup
- [ ] Git repository created
- [ ] CI/CD pipeline configured

### During Development:
- [ ] NO hard-coded data (except website content)
- [ ] NO mock data anywhere
- [ ] All empty states implemented
- [ ] All loading states implemented
- [ ] All error states implemented
- [ ] Auto-save on all forms
- [ ] Permission checks on all routes
- [ ] Activity logging on all actions
- [ ] Input validation on all forms
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting enabled

### Before Launch:
- [ ] All tests passing (unit, integration, E2E)
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Load testing passed (1000 concurrent users)
- [ ] Database migrations tested
- [ ] Backup/restore tested
- [ ] Error monitoring configured
- [ ] Analytics tracking active
- [ ] User documentation complete
- [ ] Legal pages (Privacy, Terms) added
- [ ] SSL certificates installed
- [ ] Domain configured
- [ ] Email sending verified

---

## 15. SUPPORT & QUESTIONS

**For Technical Questions:**
- Review this document first
- Check API documentation
- Review database schema
- Check existing code examples

**For Clarifications:**
- Create GitHub issue with label "question"
- Tag relevant team members
- Include context and examples

**For Bug Reports:**
- Use GitHub issue template
- Include steps to reproduce
- Include screenshots/videos
- Include error logs

**For Feature Requests:**
- Not during MVP development
- Document for Phase 2
- Must be approved by product owner

---

## 🚨 FINAL REMINDER: NO HARD-CODED DATA

**This cannot be stressed enough:**

Every number, every name, every piece of data you see in the mockups is just for demonstration. 

**In the actual application:**
- If there's no data, show empty state
- If user hasn't created companies, prompt them to create one
- If user hasn't added financials, show empty table with CTA
- If database query returns [], show "No results found"

**The ONLY exception is the public website content**, which should be pre-populated in the database during deployment.

**Everything else MUST be dynamic from the database.**

---

**Document Version:** 1.0  
**Last Updated:** November 21, 2024  
**Status:** Ready for Development

**© 2024 Donkey Ideas LLC. All rights reserved.**
