#!/bin/bash
# Script to set Vercel environment variables
# Run this with: vercel env add VARIABLE_NAME production

echo "Setting up Vercel environment variables for Community Vault"
echo "Make sure you're logged in to Vercel CLI first (vercel login)"
echo ""

# Whop Configuration
vercel env add NEXT_PUBLIC_WHOP_APP_ID production
# Enter: app_15Lm948YMSsUNC

vercel env add WHOP_SERVER_API_KEY production
# Enter: bD5NHVmfjr_ODAU3btpLxCzm7G-XDKkvncXcrCcA3Rw

vercel env add WHOP_SIGNING_SECRET production
# Enter: ws_8559ad3266e46acde128b33b3406fef8e9de17f1cfb074f93789ecc399997bee

vercel env add WHOP_CHECKOUT_URL production
# Enter: https://whop.com/checkout

echo ""
echo "Environment variables set! Now redeploy your app:"
echo "vercel --prod"
