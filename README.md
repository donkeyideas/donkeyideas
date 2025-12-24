# Donkey Ideas Platform

Full-stack venture operating system with public website and admin dashboard.

## Project Structure

```
donkey-ideas/
├── apps/
│   ├── web/              # Public website (Next.js)
│   └── dashboard/        # Admin dashboard (Next.js)
├── packages/
│   ├── database/         # Prisma schema, client
│   ├── ui/              # Shared UI components
│   ├── auth/            # Authentication logic
│   └── config/          # Shared config
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 15+
- Redis 7+ (optional, for caching)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

## Development

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps for production
- `npm run lint` - Lint all apps
- `npm run db:studio` - Open Prisma Studio

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15+
- **Auth**: NextAuth.js v5
- **AI**: OpenAI API
- **Storage**: AWS S3 / Cloudflare R2

## License

© 2024 Donkey Ideas LLC. All rights reserved.


