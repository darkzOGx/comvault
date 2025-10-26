# Development Scripts

## seed-test-user.ts

Creates a test user in the database for local development.

**User Details:**
- WhopUserId: `test_user_local`
- Email: `test@comvault.local`
- Name: `Test User`
- Role: `ADMIN`

**Usage:**
```bash
npx tsx scripts/seed-test-user.ts
```

**When to use:**
- First time setting up local development
- After resetting your database
- When `lib/auth/session.ts` shows "No test user found - run seed script"

**What it does:**
- Connects to your PostgreSQL database (uses `DATABASE_URL` from `.env.local`)
- Creates or updates the test user
- Allows you to bypass Whop authentication in development mode
- Session will be automatically created when you refresh the app

**Note:** This user only works in `NODE_ENV=development` mode. Production environments will always require real Whop authentication.
