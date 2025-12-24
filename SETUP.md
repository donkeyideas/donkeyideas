# Donkey Ideas Platform - Setup Guide

## Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Generate a random 32+ character string
- `JWT_REFRESH_SECRET` - Generate another random 32+ character string
- `NEXTAUTH_SECRET` - Generate another random 32+ character string

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Start Development Servers

```bash
# Start all apps
npm run dev

# Or start individually:
# Dashboard (port 3001)
cd apps/dashboard && npm run dev
```

## Project Structure

```
donkey-ideas/
├── apps/
│   ├── web/              # Public website (Next.js)
│   └── dashboard/        # Admin dashboard (Next.js) - Port 3001
├── packages/
│   ├── database/         # Prisma schema & client
│   ├── ui/              # Shared UI components
│   ├── auth/            # Authentication utilities
│   └── config/          # Shared configuration
└── package.json
```

## Development

- Dashboard: http://localhost:3001
- Prisma Studio: `npm run db:studio` (in packages/database)

## Next Steps

1. Create your first user account (authentication endpoints to be implemented)
2. Create your first company
3. Start adding financial data

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists: `createdb donkey_ideas`

### Port Already in Use
- Change port in `apps/dashboard/package.json` scripts
- Or kill process using port 3001

### Module Resolution Errors
- Run `npm install` from root
- Clear node_modules and reinstall if needed


