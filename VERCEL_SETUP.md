# Vercel Deployment Setup Guide

## 🚨 Critical Issue: Missing Environment Variables

Your Vercel deployment is currently failing authentication because the Whop environment variables are not set in production.

## Quick Fix (5 minutes)

### Step 1: Go to Vercel Dashboard

1. Open https://vercel.com/dashboard
2. Click on your **comvault** project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add These Variables

Add each of these variables one by one:

#### Variable 1: NEXT_PUBLIC_WHOP_APP_ID
```
Name: NEXT_PUBLIC_WHOP_APP_ID
Value: app_15Lm948YMSsUNC
Environment: Production, Preview, Development (select all)
```

#### Variable 2: WHOP_SERVER_API_KEY
```
Name: WHOP_SERVER_API_KEY
Value: bD5NHVmfjr_ODAU3btpLxCzm7G-XDKkvncXcrCcA3Rw
Environment: Production, Preview, Development (select all)
```

#### Variable 3: WHOP_SIGNING_SECRET
```
Name: WHOP_SIGNING_SECRET
Value: ws_8559ad3266e46acde128b33b3406fef8e9de17f1cfb074f93789ecc399997bee
Environment: Production, Preview, Development (select all)
```

#### Variable 4: WHOP_CHECKOUT_URL
```
Name: WHOP_CHECKOUT_URL
Value: https://whop.com/checkout
Environment: Production, Preview, Development (select all)
```

### Step 3: Redeploy

After adding all variables, trigger a new deployment:

**Option A: Push a dummy commit**
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push origin master
```

**Option B: Manual redeploy in Vercel**
1. Go to **Deployments** tab
2. Click the **⋮** (three dots) on the latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** (faster)

### Step 4: Verify

1. Wait 2-3 minutes for deployment to complete
2. Visit your app at comvault.vercel.app
3. Check that users can now authenticate with their Whop accounts
4. Check Vercel logs - should see "User authenticated via Whop" instead of errors

---

## Current Issue Explained

### What's Happening:
```
Error: Invalid app id provided to verifyUserToken
```

This means `NEXT_PUBLIC_WHOP_APP_ID` is `undefined` in production.

### Why It's Happening:
- ✅ Variables exist in `.env.local` (for local development)
- ❌ Variables NOT in Vercel environment (for production)
- Result: Production app can't authenticate with Whop

### Impact:
- All users see "Authentication Required" message
- No one can access the app through Whop
- Whop integration is completely broken

---

## Verification Checklist

After deploying, verify these in Vercel dashboard:

### Environment Variables Tab
- [ ] `NEXT_PUBLIC_WHOP_APP_ID` = `app_15Lm948YMSsUNC`
- [ ] `WHOP_SERVER_API_KEY` = starts with `bD5N...`
- [ ] `WHOP_SIGNING_SECRET` = starts with `ws_85...`
- [ ] `WHOP_CHECKOUT_URL` = `https://whop.com/checkout`
- [ ] All variables set for **Production** environment
- [ ] All variables set for **Preview** environment (optional but recommended)

### Logs Tab (after redeploy)
Look for these messages:
- ✅ `[AUTH] User authenticated via Whop: [user_id]`
- ❌ Should NOT see: `Invalid app id provided`
- ❌ Should NOT see: `NEXT_PUBLIC_WHOP_APP_ID is not set`

### Deployment Tab
- [ ] Latest deployment shows "Ready"
- [ ] Build completed successfully
- [ ] No environment variable warnings

---

## Additional Environment Variables (Already Set)

These are already configured via Neon/Vercel integration:
- ✅ `DATABASE_URL`
- ✅ `POSTGRES_URL`
- ✅ All Neon database credentials

These are optional (not needed yet):
- ⚠️ `AWS_ACCESS_KEY_ID` - Only needed when you set up S3
- ⚠️ `AWS_SECRET_ACCESS_KEY` - Only needed when you set up S3
- ⚠️ `OPENAI_API_KEY` - Only if using AI features
- ⚠️ `ANTHROPIC_API_KEY` - Only if using AI features

---

## Troubleshooting

### Still seeing "Invalid app id" after setting variables?
1. Make sure you clicked **Save** after adding each variable
2. Verify you selected **Production** environment
3. Trigger a **new deployment** (variables only apply to new builds)
4. Clear your browser cache and cookies
5. Check variable name has no typos: `NEXT_PUBLIC_WHOP_APP_ID` (exact case)

### Users still can't authenticate?
1. Check Vercel logs for actual error messages
2. Verify the Whop app ID is correct in your Whop dashboard
3. Ensure your app is approved/published in Whop
4. Check that your Whop app URL matches your Vercel domain

### Environment variable showing as "undefined" in logs?
- Variables starting with `NEXT_PUBLIC_` must be set **before build time**
- After adding them, you MUST redeploy (not just restart)
- They get baked into the client-side bundle during build

---

## Security Note

⚠️ **NEVER commit these values to git!**

The values above are shown for convenience in setting up Vercel, but:
- `.env.local` is in `.gitignore` ✅
- `.env.production` is in `.gitignore` ✅
- These values are only in Vercel's secure environment storage ✅

If these secrets are ever compromised:
1. Go to Whop dashboard
2. Regenerate API keys
3. Update Vercel environment variables
4. Redeploy

---

## Quick Commands

```bash
# Trigger redeploy with empty commit
git commit --allow-empty -m "chore: trigger redeploy with new env vars"
git push origin master

# Check Vercel logs (if using CLI)
vercel logs

# List environment variables (if using CLI)
vercel env ls
```

---

**After completing these steps, your Community Vault app will be fully functional in production!** 🎉
