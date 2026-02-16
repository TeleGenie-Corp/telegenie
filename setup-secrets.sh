#!/bin/bash
# Setup Firebase App Hosting Secrets
# Automatically reads values from .env.local

set -e

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

echo "🔐 Creating Firebase App Hosting secrets from $ENV_FILE..."
echo ""

# Function to get value from .env.local
get_env_value() {
    grep "^$1=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '\r'
}

# Extract values
GEMINI_KEY=$(get_env_value "NEXT_PUBLIC_GEMINI_API_KEY")
TELEGRAM_TOKEN=$(get_env_value "NEXT_PUBLIC_TELEGRAM_BOT_TOKEN")
CLOUDPAYMENTS_ID=$(get_env_value "NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID")

# Create secrets
echo "Creating NEXT_PUBLIC_GEMINI_API_KEY..."
echo "$GEMINI_KEY" | firebase apphosting:secrets:set NEXT_PUBLIC_GEMINI_API_KEY

echo "Creating NEXT_PUBLIC_TELEGRAM_BOT_TOKEN..."
echo "$TELEGRAM_TOKEN" | firebase apphosting:secrets:set NEXT_PUBLIC_TELEGRAM_BOT_TOKEN

echo "Creating NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID..."
echo "$CLOUDPAYMENTS_ID" | firebase apphosting:secrets:set NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID

echo ""
echo "✅ Secrets created successfully!"
echo ""
echo "Now granting App Hosting backend access..."

# Grant access
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_GEMINI_API_KEY --backend=telegenie
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_TELEGRAM_BOT_TOKEN --backend=telegenie
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID --backend=telegenie

echo ""
echo "🎉 Done! You can now deploy:"
echo "firebase deploy --only apphosting"
