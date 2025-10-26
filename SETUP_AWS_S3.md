# AWS S3 Setup Guide for Community Vault

## Current Status

✅ **Development Mode:** Local file system storage is configured and working
⚠️ **Production Mode:** AWS S3 credentials needed

## File Upload System

The app uses a **hybrid storage system**:

- **Development (no S3):** Files stored in `/uploads` directory
- **Production (with S3):** Files stored in AWS S3 bucket

## Quick Setup for Development

**You're all set!** The app will automatically use local file storage when S3 is not configured.

Files will be stored in: `./uploads/`

## Setting Up AWS S3 for Production

### Step 1: Create AWS Account & S3 Bucket

1. Sign up for AWS: https://aws.amazon.com/
2. Go to S3 Console: https://console.aws.amazon.com/s3
3. Click "Create bucket"
4. Configure:
   - **Bucket name:** `community-vault-uploads` (or your preferred name)
   - **Region:** `us-east-1` (or your preferred region)
   - **Block Public Access:** Uncheck (or configure CORS for specific access)
   - **Bucket versioning:** Disabled
   - **Encryption:** AES-256 (default)

### Step 2: Create IAM User with S3 Access

1. Go to IAM Console: https://console.aws.amazon.com/iam
2. Click "Users" → "Create user"
3. User name: `community-vault-s3-uploader`
4. Select "Attach policies directly"
5. Search for and attach: `AmazonS3FullAccess` (or create custom policy below)

**Custom Policy (Recommended):**
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
        "arn:aws:s3:::community-vault-uploads",
        "arn:aws:s3:::community-vault-uploads/*"
      ]
    }
  ]
}
```

6. Click "Create access key"
7. Select "Application running outside AWS"
8. **Save credentials securely!**

### Step 3: Configure CORS (Optional)

If using direct browser uploads, add CORS policy to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Step 4: Add Credentials to .env.local

```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="secret..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="community-vault-uploads"
NEXT_PUBLIC_S3_PUBLIC_HOST="https://community-vault-uploads.s3.us-east-1.amazonaws.com"
```

### Step 5: Test Upload

1. Restart your development server
2. Try uploading a file through the app
3. Check S3 console to verify file appeared

## Troubleshooting

### "S3 is not configured" Error
- Check `.env.local` has all 4 AWS variables
- Restart dev server after adding variables

### "Access Denied" Error
- Verify IAM user has correct permissions
- Check bucket policy allows your IAM user
- Verify AWS credentials are correct

### Files Upload But Can't Be Viewed
- Check bucket's "Block public access" settings
- Verify CORS configuration
- Check `NEXT_PUBLIC_S3_PUBLIC_HOST` is correct

## Cost Estimate

**AWS S3 Pricing (us-east-1):**
- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Example:** 1,000 users uploading 10MB each = 10GB storage
- Storage cost: ~$0.23/month
- Upload cost: ~$0.005/month
- Total: **~$0.25/month**

## Alternative: Other Storage Providers

The storage system can be adapted for:
- **Cloudflare R2** (S3-compatible, cheaper)
- **Backblaze B2** (S3-compatible, cheaper)
- **DigitalOcean Spaces** (S3-compatible)
- **Supabase Storage** (PostgreSQL-based)

Just update the S3 client configuration with their endpoint URLs.

## Security Best Practices

1. ✅ Use IAM users with minimal permissions
2. ✅ Enable bucket versioning for file recovery
3. ✅ Set up lifecycle policies to delete old files
4. ✅ Use signed URLs for uploads (already implemented)
5. ✅ Never commit AWS keys to git
6. ✅ Rotate access keys every 90 days

## Support

For issues, check:
- AWS S3 documentation: https://docs.aws.amazon.com/s3/
- Next.js file upload guide: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Community Vault GitHub issues
