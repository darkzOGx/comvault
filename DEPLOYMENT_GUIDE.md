# Community Vault - Complete Deployment Guide

**Generated:** October 24, 2025
**Status:** Production Deployment Preparation
**Framework:** Next.js 14 (App Router) + Vercel Serverless

---

## 🎯 Overview

This guide provides step-by-step instructions to deploy Community Vault from development to production on Vercel with all required third-party services configured.

**Estimated Setup Time:** 2-3 hours
**Required Services:** PostgreSQL, AWS S3, Stripe, Whop, OpenAI, Anthropic, Pinecone, (Optional) Resend

---

## 📋 Pre-Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] Vercel account created (free tier supports this app)
- [ ] Payment method for paid services (OpenAI, Anthropic, Pinecone, AWS, Stripe)
- [ ] Domain name (optional, Vercel provides `*.vercel.app`)

---

## 🔧 PHASE 1: Infrastructure Setup

### 1.1 PostgreSQL Database Provisioning

**Recommended Providers:**
- **Vercel Postgres** (easiest integration)
- **Neon** (generous free tier)
- **Supabase** (includes additional features)
- **Railway** (simple pricing)

#### Option A: Vercel Postgres (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Add Postgres storage
vercel storage create postgres
```

**Export Connection String:**
```bash
# After creation, Vercel adds DATABASE_URL automatically
# Verify in Vercel Dashboard → Project → Settings → Environment Variables
```

#### Option B: External Provider (Neon Example)

1. Visit https://neon.tech
2. Create new project: `community-vault-prod`
3. Copy connection string:
```
postgresql://user:password@hostname.neon.tech/neondb?sslmode=require
```
4. Save as `DATABASE_URL` for later

**Connection String Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

**Security Notes:**
- Enable SSL mode (`?sslmode=require`)
- Use connection pooling for serverless (Prisma Data Proxy or PgBouncer)
- Configure IP whitelist if provider supports it

---

### 1.2 AWS S3 Configuration

#### Step 1: Create S3 Bucket

```bash
# AWS Console > S3 > Create Bucket
Bucket Name: community-vault-uploads-prod
Region: us-east-1 (or your preferred region)
Block Public Access: ❌ Uncheck (we need public reads)
Versioning: ✅ Enable (recommended for rollback)
Encryption: ✅ SSE-S3 (default encryption)
```

#### Step 2: Configure CORS

Navigate to bucket → Permissions → CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://your-deployment-url.vercel.app",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Important:** Update `AllowedOrigins` after Vercel deployment!

#### Step 3: Create IAM User

```bash
# AWS Console > IAM > Users > Create User
User Name: community-vault-s3-uploader
Access Type: Programmatic access (API key)
```

**Attach Policy (Create Inline Policy):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::community-vault-uploads-prod",
        "arn:aws:s3:::community-vault-uploads-prod/*"
      ]
    }
  ]
}
```

**Save Credentials:**
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

#### Step 4: Configure Bucket Policy (Public Read)

Bucket → Permissions → Bucket Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::community-vault-uploads-prod/*"
    }
  ]
}
```

**Environment Variables to Collect:**
```bash
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="community-vault-uploads-prod"
NEXT_PUBLIC_S3_PUBLIC_HOST="community-vault-uploads-prod.s3.us-east-1.amazonaws.com"
```

---

### 1.3 Stripe Payment Configuration

#### Step 1: Create Stripe Account

1. Visit https://stripe.com
2. Create account or login
3. Switch to **Test Mode** (toggle in dashboard)

#### Step 2: Get API Keys

```bash
# Stripe Dashboard > Developers > API Keys
# Copy both keys:
Publishable Key: pk_test_...
Secret Key: sk_test_...
```

**Save for environment:**
```bash
STRIPE_SECRET_KEY="sk_test_..."
```

#### Step 3: Create Webhook Endpoint (After Vercel Deployment)

**For now, note this will be configured in Phase 3:**
```
Webhook URL: https://YOUR-DEPLOYMENT-URL.vercel.app/api/stripe/webhook
Events to listen: checkout.session.completed
```

You'll get the webhook secret (`whsec_...`) after creating the endpoint.

---

### 1.4 Whop Platform Integration

#### Step 1: Create Whop App

1. Visit https://whop.com/apps (or Whop Developer Portal)
2. Create New App
3. Fill in details:
   - **App Name:** Community Vault
   - **App Type:** iframe
   - **Description:** AI-powered multimedia knowledge base

#### Step 2: Configure App Settings

```bash
# Required Permissions (check these):
- Read user profile
- Manage purchases
- Access checkout
```

**Allowed Domains:**
```
http://localhost:3000
https://your-deployment-url.vercel.app
```

**Iframe Settings:**
```
Default URL: https://your-deployment-url.vercel.app/dashboard
```

#### Step 3: Get Credentials

```bash
# Whop App Dashboard > Settings > API Credentials
NEXT_PUBLIC_WHOP_APP_ID="app_xxxxx"
WHOP_SERVER_API_KEY="whop_api_key_xxxxx"
WHOP_SIGNING_SECRET="whop_webhook_signing_secret"
```

#### Step 4: Test Token Exchange

After deployment, verify Whop authentication works:
```bash
# The app uses verifyUserToken() from @whop/api
# Test by loading your app in Whop's iframe sandbox
```

---

### 1.5 AI Services Configuration

#### OpenAI (Embeddings & Transcription)

1. Visit https://platform.openai.com
2. Navigate to **API Keys**
3. Create new secret key: `community-vault-prod`
4. Copy key:
```bash
OPENAI_API_KEY="sk-proj-..."
```

**Usage Estimate:**
- Embeddings (text-embedding-3-large): ~$0.13 per 1M tokens
- Transcription (gpt-4o-mini): ~$0.15 per 1M tokens
- Budget $50-100/month for moderate usage

**Set Billing Limits:**
- OpenAI Dashboard → Billing → Usage limits → Set monthly cap

#### Anthropic (AI Summarization)

1. Visit https://console.anthropic.com
2. Navigate to **API Keys**
3. Create new key: `community-vault-prod`
4. Copy key:
```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Usage Estimate:**
- Claude 3.5 Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens
- Budget $50-150/month for moderate usage

**Set Spending Limits:**
- Anthropic Console → Settings → Spending limits

#### Pinecone (Vector Database)

1. Visit https://www.pinecone.io
2. Create account (free tier: 1 index, 5M vectors)
3. Create new index:
```
Index Name: community-vault
Dimensions: 3072 (MUST match OpenAI text-embedding-3-large)
Metric: cosine
Region: us-east-1 (or nearest to your app)
```

4. Get API Key:
```bash
# Pinecone Console > API Keys
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX="community-vault"
```

**Verify Index Configuration:**
```bash
# After creation, check:
# - Dimensions: 3072 ✓
# - Metric: cosine ✓
# - Status: Ready ✓
```

---

### 1.6 Email Notifications (Optional - Resend)

**Skip this section if you don't need email notifications initially.**

#### Setup Resend

1. Visit https://resend.com
2. Create account (free tier: 100 emails/day)
3. Add domain or use Resend's test domain
4. Get API key:
```bash
# Resend Dashboard > API Keys
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

**Domain Verification (if using custom domain):**
- Add DNS records provided by Resend
- Verify SPF, DKIM, DMARC

---

## 🔐 PHASE 2: Environment Configuration

### 2.1 Create Local Environment File

```bash
# In project root
cp .env.example .env.local
```

### 2.2 Fill in All Variables

Edit `.env.local` with values from Phase 1:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/community_vault"

# Whop App Configuration
NEXT_PUBLIC_WHOP_APP_ID="app_xxxxx"
WHOP_SERVER_API_KEY="whop_api_key_xxxxx"
WHOP_SIGNING_SECRET="whop_webhook_signing_secret"

# AI Providers
OPENAI_API_KEY="sk-proj-..."
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Vector Store (Pinecone)
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX="community-vault"

# Storage (AWS S3)
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="community-vault-uploads-prod"
NEXT_PUBLIC_S3_PUBLIC_HOST="community-vault-uploads-prod.s3.us-east-1.amazonaws.com"

# Notifications (Resend) - OPTIONAL
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# Payments
WHOP_CHECKOUT_URL="https://whop.com/checkout"
CREATOR_SPLIT_PERCENT="0.89"
COMMUNITY_SPLIT_PERCENT="0.10"
PLATFORM_SPLIT_PERCENT="0.01"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # Will add after webhook creation

# App URL (update after Vercel deployment)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2.3 Validate Configuration

```bash
# Test database connection
npx prisma db pull

# Expected output: "Introspecting based on your database..."
# If error: Check DATABASE_URL format and network access
```

---

## 🏗️ PHASE 3: Database Initialization

### 3.1 Install Dependencies

```bash
npm install
```

**Expected Output:**
```
added 300+ packages in 45s
```

### 3.2 Generate Prisma Client

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.18.0) to ./node_modules/@prisma/client
```

### 3.3 Push Database Schema

```bash
npx prisma db push
```

**Expected Output:**
```
Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client

Running generate...
✔ Generated Prisma Client
```

**This creates all 7 tables:**
- User
- Project
- File
- Transaction
- FileView
- Notification
- Plus enum types and indexes

### 3.4 Verify Database Tables

```bash
npx prisma studio
```

Opens Prisma Studio at http://localhost:5555
**Verify all tables exist (should be empty):**
- User ✓
- Project ✓
- File ✓
- Transaction ✓
- FileView ✓
- Notification ✓

---

## 🧪 PHASE 4: Local Testing

### 4.1 Run Development Server

```bash
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.2.5
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Ready in 2.5s
```

### 4.2 Test S3 Upload (Optional)

**Create test script:** `test-s3.js`

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const command = new PutObjectCommand({
  Bucket: process.env.S3_BUCKET_NAME,
  Key: 'test/sample.txt',
  ContentType: 'text/plain',
});

const url = await getSignedUrl(s3, command, { expiresIn: 300 });
console.log('Presigned URL:', url);

// Test upload with curl:
// curl -X PUT -T sample.txt "URL_HERE"
```

**Run test:**
```bash
node test-s3.js
```

### 4.3 Test Endpoints

**Using curl or Postman:**

```bash
# Test presign endpoint (requires Whop auth in production)
curl -X POST http://localhost:3000/api/upload/presign \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.pdf","contentType":"application/pdf"}'

# Expected: { "url": "https://...", "key": "...", "publicUrl": "..." }
```

---

## 🚀 PHASE 5: Vercel Deployment

### 5.1 Push to GitHub

```bash
# Initialize git if not already
git init
git add .
git commit -m "Initial deployment setup"

# Create GitHub repo (via GitHub CLI or web)
gh repo create community-vault --public --source=. --remote=origin --push

# Or push to existing repo
git remote add origin https://github.com/YOUR-USERNAME/community-vault.git
git branch -M main
git push -u origin main
```

### 5.2 Import to Vercel

**Option A: Vercel Dashboard**
1. Visit https://vercel.com/new
2. Import Git Repository → Select `community-vault`
3. **Framework Preset:** Next.js (auto-detected)
4. **Root Directory:** `./` (default)
5. Click "Deploy" (will fail first time - need env vars)

**Option B: Vercel CLI**
```bash
vercel
# Follow prompts to link project
```

### 5.3 Add Environment Variables

**Vercel Dashboard → Project Settings → Environment Variables**

**Add ALL variables from `.env.local`:**

| Variable | Environment | Value |
|----------|------------|-------|
| `DATABASE_URL` | Production | `postgresql://...` |
| `NEXT_PUBLIC_WHOP_APP_ID` | Production, Preview | `app_xxxxx` |
| `WHOP_SERVER_API_KEY` | Production | `whop_api_key_xxxxx` |
| `WHOP_SIGNING_SECRET` | Production | `whop_webhook_signing_secret` |
| `OPENAI_API_KEY` | Production | `sk-proj-...` |
| `ANTHROPIC_API_KEY` | Production | `sk-ant-api03-...` |
| `PINECONE_API_KEY` | Production | `pcsk_...` |
| `PINECONE_INDEX` | Production | `community-vault` |
| `AWS_ACCESS_KEY_ID` | Production | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Production | (secret) |
| `AWS_REGION` | Production | `us-east-1` |
| `S3_BUCKET_NAME` | Production | `community-vault-uploads-prod` |
| `NEXT_PUBLIC_S3_PUBLIC_HOST` | Production, Preview | `community-vault-uploads-prod.s3.us-east-1.amazonaws.com` |
| `RESEND_API_KEY` | Production | `re_xxxxx` (optional) |
| `RESEND_FROM_EMAIL` | Production | `noreply@yourdomain.com` (optional) |
| `WHOP_CHECKOUT_URL` | Production | `https://whop.com/checkout` |
| `CREATOR_SPLIT_PERCENT` | Production | `0.89` |
| `COMMUNITY_SPLIT_PERCENT` | Production | `0.10` |
| `PLATFORM_SPLIT_PERCENT` | Production | `0.01` |
| `STRIPE_SECRET_KEY` | Production | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Production | (will add after webhook setup) |
| `NEXT_PUBLIC_APP_URL` | Production | `https://YOUR-DEPLOYMENT.vercel.app` |

**Important:**
- For `NEXT_PUBLIC_*` vars, add to **Preview** environment too
- Secrets (`*_SECRET_KEY`, `*_API_KEY`) → Production only
- Update `NEXT_PUBLIC_APP_URL` to actual Vercel URL after deployment

### 5.4 Configure Build Settings

**Vercel Dashboard → Project Settings → General**

**Build Command:**
```bash
npm run build
```

**Output Directory:** `.next` (auto-detected)

**Install Command:**
```bash
npm install
```

**Build Command (with Prisma generation):**
```bash
npx prisma generate && npm run build
```

**Add this to `package.json` scripts:**
```json
{
  "scripts": {
    "vercel-build": "prisma generate && next build"
  }
}
```

Update build command to: `npm run vercel-build`

### 5.5 Redeploy

```bash
# Trigger redeploy via dashboard or CLI
vercel --prod
```

**Monitor deployment:**
- Check build logs for errors
- Verify Prisma generation succeeded
- Check for API route compilation

**Expected deployment time:** 2-4 minutes

### 5.6 Get Deployment URL

```
https://community-vault-xxxxx.vercel.app
```

**Update these configurations:**
1. **S3 CORS** → Add Vercel URL to `AllowedOrigins`
2. **Whop App** → Add Vercel URL to allowed domains
3. **Environment Variable** → Update `NEXT_PUBLIC_APP_URL`

---

## 🔗 PHASE 6: Webhook Configuration

### 6.1 Configure Stripe Webhook

**Stripe Dashboard → Developers → Webhooks → Add endpoint**

```
Endpoint URL: https://YOUR-DEPLOYMENT.vercel.app/api/stripe/webhook
Events to listen to: checkout.session.completed
```

**After creation:**
1. Copy **Signing Secret** (starts with `whsec_...`)
2. Add to Vercel environment variables:
```bash
STRIPE_WEBHOOK_SECRET="whsec_..."
```
3. Redeploy Vercel app

### 6.2 Test Stripe Webhook

**Using Stripe CLI:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

**Expected output in webhook logs:**
```
✔ Received checkout.session.completed event
✔ Transaction created
✔ User earnings updated
✔ Notification sent
```

### 6.3 Configure Whop Webhooks (Optional)

If using Whop webhooks for user events:

**Whop App Dashboard → Webhooks → Add endpoint**

```
Webhook URL: https://YOUR-DEPLOYMENT.vercel.app/api/whop/webhook
Events: user.updated, membership.created
Secret: Use WHOP_SIGNING_SECRET
```

---

## ✅ PHASE 7: Smoke Testing

### 7.1 Test Authentication

1. Load app in Whop iframe: `https://whop.com/apps/YOUR-APP-ID`
2. Verify user authentication works
3. Check Prisma Studio - User record should be created

### 7.2 Test File Upload (PDF)

1. Navigate to `/upload`
2. Select "PDF" file type
3. Upload a sample PDF (< 5MB for testing)
4. Wait for processing (30-60 seconds)
5. Verify:
   - ✓ File appears in S3 bucket
   - ✓ File record created in database
   - ✓ Summary generated
   - ✓ Embeddings stored in Pinecone
   - ✓ File visible in dashboard

**Check Logs:**
```bash
# Vercel Dashboard → Deployment → Functions → /api/upload/complete
# Should show:
# - PDF parsed successfully
# - Summary generated
# - Embeddings created
# - Pinecone upsert succeeded
```

### 7.3 Test Video Upload

1. Upload a short video (< 50MB, < 2 minutes)
2. Wait for processing (can take 2-5 minutes)
3. Verify:
   - ✓ Video appears in S3
   - ✓ Transcription generated (check File.transcript)
   - ✓ Summary from transcript
   - ✓ Video playable in preview

**Note:** Large video files may timeout (Vercel function limit: 10s hobby, 60s pro). Consider async processing for production.

### 7.4 Test Text Upload

1. Paste or upload text content
2. Verify immediate processing (< 10 seconds)
3. Check summary quality

### 7.5 Test Premium Purchase Flow

1. Toggle a file to "Premium" with price $5.00
2. Open file detail page
3. Click "Purchase" button
4. Should redirect to Stripe checkout
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify:
   - ✓ Redirected back to app
   - ✓ Transaction record created
   - ✓ Revenue splits calculated correctly (89/10/1)
   - ✓ Creator earnings updated
   - ✓ Notification created
   - ✓ Email sent (if Resend configured)
   - ✓ File.totalPurchases incremented

**Check Database:**
```sql
SELECT * FROM "Transaction" WHERE "externalReference" = 'cs_test_...';
-- Should show correct split amounts
```

### 7.6 Test Analytics Dashboard

1. Navigate to `/dashboard`
2. Verify metrics display:
   - ✓ Total files count
   - ✓ Total views count
   - ✓ Total earnings (from purchases)
   - ✓ Top performing files

### 7.7 Test Semantic Search (if implemented)

1. Upload multiple related files
2. Use search feature with semantic query
3. Verify relevant results returned

---

## 🔍 PHASE 8: Monitoring & Validation

### 8.1 Check Vercel Function Logs

**Vercel Dashboard → Deployment → Functions**

Monitor these routes:
- `/api/upload/presign` - Should complete in < 500ms
- `/api/upload/complete` - May take 5-30s (AI processing)
- `/api/stripe/webhook` - Should complete in < 2s
- `/api/files` - Should complete in < 1s

**Look for errors:**
- Timeout errors → Increase function timeout (Vercel Pro)
- Memory errors → Optimize file processing
- Database connection errors → Check DATABASE_URL and connection pooling

### 8.2 Verify S3 Storage

**AWS Console → S3 → community-vault-uploads-prod**

- Files should be organized by userId
- Public URLs should be accessible
- No orphaned files (files without database records)

### 8.3 Check Pinecone Index

**Pinecone Console → Indexes → community-vault**

- Vector count should match File count
- Namespaces should match user IDs
- Index should be "Ready" status

### 8.4 Monitor AI Usage

**OpenAI Dashboard → Usage**
- Track embedding API calls
- Monitor spending

**Anthropic Console → Usage**
- Track Claude API calls
- Monitor token usage

**Set up alerts:**
- OpenAI: Set usage limit to prevent runaway costs
- Anthropic: Enable spending notifications

### 8.5 Stripe Dashboard Monitoring

**Stripe Dashboard → Payments**
- Verify test payments appear
- Check webhook delivery status (should be 100%)
- Review failed webhooks (retry if any)

---

## 🐛 Troubleshooting

### Issue: Database Connection Error

**Error:** `Can't reach database server`

**Solutions:**
1. Verify `DATABASE_URL` is correct
2. Check database server is running
3. Verify IP whitelist (add Vercel IPs if required)
4. Test connection with `npx prisma db pull`

**Vercel-specific:**
- Enable connection pooling for serverless
- Use Prisma Data Proxy or PgBouncer

### Issue: S3 Upload Fails

**Error:** `Access Denied` or CORS error

**Solutions:**
1. Verify IAM user has `s3:PutObject` permission
2. Check CORS configuration includes Vercel domain
3. Verify bucket policy allows public read
4. Test presigned URL with curl

### Issue: Stripe Webhook Not Receiving Events

**Error:** Events don't reach `/api/stripe/webhook`

**Solutions:**
1. Verify webhook URL is correct (HTTPS)
2. Check `STRIPE_WEBHOOK_SECRET` matches dashboard
3. Test with Stripe CLI: `stripe listen --forward-to`
4. Check Vercel function logs for errors
5. Verify webhook signature validation logic

### Issue: AI Processing Timeout

**Error:** Function execution timeout

**Solutions:**
1. Upgrade Vercel to Pro (60s timeout vs 10s)
2. Optimize content extraction (limit input size)
3. Implement async processing with queue
4. Use streaming for large files

### Issue: Whop Authentication Fails

**Error:** `Invalid token` or `Unauthorized`

**Solutions:**
1. Verify `NEXT_PUBLIC_WHOP_APP_ID` is correct
2. Check Vercel URL is in Whop allowed domains
3. Test `verifyUserToken()` function
4. Check Whop app permissions

### Issue: Email Notifications Not Sending

**Error:** Notifications created but no emails

**Solutions:**
1. Verify `RESEND_API_KEY` is correct
2. Check `RESEND_FROM_EMAIL` is verified domain
3. Review Resend dashboard for delivery status
4. Check spam folder
5. Verify DNS records (SPF, DKIM)

---

## 🔒 Security Considerations

### Before Going Production

1. **Environment Variables:**
   - Rotate all API keys from test to production
   - Use different database for prod vs staging
   - Never commit `.env.local` to git

2. **Stripe:**
   - Switch from test mode to live mode
   - Update `STRIPE_SECRET_KEY` to live key (`sk_live_...`)
   - Reconfigure webhook with live endpoint

3. **Database:**
   - Enable automated backups
   - Configure connection pooling
   - Review query performance

4. **S3:**
   - Enable versioning (allows rollback)
   - Configure lifecycle policies (auto-delete old files)
   - Enable CloudFront CDN for better performance
   - Consider signed URLs for premium content

5. **Rate Limiting:**
   - Implement rate limiting on API routes
   - Use Vercel edge middleware or Upstash Rate Limit
   - Prevent AI API abuse

6. **Error Handling:**
   - Add Sentry or similar error tracking
   - Configure Vercel error alerts
   - Log all payment errors

7. **GDPR/Privacy:**
   - Add privacy policy
   - Implement user data export
   - Add account deletion functionality

---

## 📊 Cost Estimation

**Monthly Operating Costs (Moderate Usage):**

| Service | Free Tier | Paid Tier | Estimated Cost |
|---------|-----------|-----------|----------------|
| **Vercel** | 100GB bandwidth | Pro: $20/mo | $0-20 |
| **PostgreSQL** (Neon) | 10GB storage | Varies | $0-25 |
| **AWS S3** | 5GB storage | $0.023/GB | $5-20 |
| **OpenAI** | - | Pay-as-go | $20-50 |
| **Anthropic** | - | Pay-as-go | $30-75 |
| **Pinecone** | 1 index free | Standard: $70/mo | $0-70 |
| **Stripe** | Free | 2.9% + $0.30 | $0 (variable) |
| **Resend** | 100/day | Pro: $20/mo | $0-20 |
| **Total** | | | **$55-280/month** |

**Free tier viable for:**
- Development
- Low traffic (< 1000 uploads/mo)
- Testing

**Production tier recommended for:**
- 5000+ uploads/month
- High traffic
- Team collaboration

---

## 🚀 Production Optimization

### Performance Improvements

1. **Enable Vercel Edge Caching:**
```javascript
// app/api/files/route.ts
export const revalidate = 60; // Cache for 60 seconds
```

2. **Optimize Images:**
```javascript
// next.config.mjs
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200],
}
```

3. **Implement Connection Pooling:**
```javascript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL + '?pgbouncer=true',
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

4. **Add CDN for S3:**
- Configure CloudFront distribution
- Update `NEXT_PUBLIC_S3_PUBLIC_HOST` to CloudFront URL
- Enable caching for media files

---

## 📝 Post-Deployment Checklist

- [ ] All environment variables configured in Vercel
- [ ] Database schema deployed and verified
- [ ] S3 CORS configured with production URL
- [ ] Stripe webhook endpoint active and tested
- [ ] Whop app configured with production URL
- [ ] AI services (OpenAI, Anthropic, Pinecone) tested
- [ ] File upload tested (PDF, text, video)
- [ ] Payment flow tested end-to-end
- [ ] Notifications working (in-app + email)
- [ ] Analytics dashboard populating
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Backup strategy implemented
- [ ] Rate limiting enabled
- [ ] Production API keys rotated
- [ ] Security review completed
- [ ] Performance monitoring setup

---

## 📚 Additional Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Vercel: https://vercel.com/docs
- Prisma: https://www.prisma.io/docs
- Whop: https://docs.whop.com
- Stripe: https://stripe.com/docs
- OpenAI: https://platform.openai.com/docs
- Anthropic: https://docs.anthropic.com
- Pinecone: https://docs.pinecone.io

**Community:**
- Discord: [Add your community server]
- GitHub Issues: [Your repo URL]/issues

**Support:**
- Email: support@yourdomain.com
- Documentation: [Your docs URL]

---

## 🎉 Deployment Complete!

Your Community Vault application is now live and ready for users!

**Next Steps:**
1. Invite beta testers
2. Monitor usage and errors
3. Gather feedback
4. Iterate on features
5. Scale infrastructure as needed

Happy building! 🚀
