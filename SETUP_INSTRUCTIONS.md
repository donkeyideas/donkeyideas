# Setup Instructions - Donkey Ideas Platform

## Quick Start (Step by Step)

### Step 1: Set Up Database URL

Edit the `.env` file and add your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/donkey_ideas?schema=public"
```

**If you don't have PostgreSQL:**
- You can use a free cloud database like [Supabase](https://supabase.com) or [Railway](https://railway.app)
- Or install PostgreSQL locally
- Or skip database setup for now (app will run but features won't work)

### Step 2: Run Migrations

```powershell
cd "C:\Users\beltr\Donkey Ideas\packages\database"
npm run db:migrate
cd ..\..
```

### Step 3: Create Admin User

```powershell
cd "C:\Users\beltr\Donkey Ideas"
.\CREATE_ADMIN.ps1
```

This will create an admin user with:
- **Email:** admin@donkeyideas.com
- **Password:** Admin123!

### Step 4: Start the Server

```powershell
npm run dev
```

### Step 5: Access the Application

1. Open browser: http://localhost:3001
2. You'll be redirected to `/register` page
3. Either:
   - **Register a new account** (recommended)
   - **Or login with admin credentials:**
     - Email: `admin@donkeyideas.com`
     - Password: `Admin123!`

## Alternative: Register New Account

If you prefer to create your own account:

1. Go to http://localhost:3001
2. You'll see the register page
3. Fill in:
   - Name
   - Email
   - Password (must be 8+ chars, 1 uppercase, 1 number, 1 special char)
4. Click "Create Account"
5. You'll be automatically logged in

## Troubleshooting

### "Environment variable not found: DATABASE_URL"
- Make sure `.env` file exists in the root directory
- Add `DATABASE_URL` to `.env` file
- Format: `DATABASE_URL="postgresql://user:password@host:port/database?schema=public"`

### "Cannot connect to database"
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Test connection: `psql $DATABASE_URL`

### "Redirected to login but no account"
- Run `.\CREATE_ADMIN.ps1` to create admin user
- Or register a new account at `/register`

### Port 3001 already in use
```powershell
# Find process
netstat -ano | findstr :3001

# Kill process (replace PID)
taskkill /PID <PID> /F
```

## All Commands Reference

```powershell
# Navigate to project
cd "C:\Users\beltr\Donkey Ideas"

# Install dependencies (first time)
npm install

# Generate Prisma client
cd packages\database
npm run db:generate
cd ..\..

# Run migrations
cd packages\database
npm run db:migrate
cd ..\..

# Create admin user
.\CREATE_ADMIN.ps1

# Start dev server
npm run dev

# Open Prisma Studio (database GUI)
cd packages\database
npm run db:studio
cd ..\..
```

## First Login

After creating admin user or registering:

1. Login at http://localhost:3001/login
2. You'll be redirected to dashboard
3. Create your first company
4. Start adding financial data!

## Need Help?

- Check `.env` file has DATABASE_URL
- Make sure database is running
- Run migrations before creating admin user
- Check console for error messages


