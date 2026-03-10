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
TELEGRAM_TOKEN=$(get_env_value "TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT=$(get_env_value "TELEGRAM_CHAT_ID")
CLOUDPAYMENTS_ID=$(get_env_value "NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID")
YOOKASSA_ID=$(get_env_value "YOOKASSA_SHOP_ID")
YOOKASSA_KEY=$(get_env_value "YOOKASSA_SECRET_KEY")

# Create secrets
echo "Creating NEXT_PUBLIC_GEMINI_API_KEY..."
echo "$GEMINI_KEY" | firebase apphosting:secrets:set NEXT_PUBLIC_GEMINI_API_KEY --force || true

echo "Creating TELEGRAM_BOT_TOKEN..."
echo "$TELEGRAM_TOKEN" | firebase apphosting:secrets:set TELEGRAM_BOT_TOKEN --force || true

echo "Creating TELEGRAM_CHAT_ID..."
echo "$TELEGRAM_CHAT" | firebase apphosting:secrets:set TELEGRAM_CHAT_ID --force || true

echo "Creating NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID..."
echo "$CLOUDPAYMENTS_ID" | firebase apphosting:secrets:set NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID --force || true

echo "Creating YOOKASSA_SHOP_ID..."
echo "$YOOKASSA_ID" | firebase apphosting:secrets:set YOOKASSA_SHOP_ID --force || true

echo "Creating YOOKASSA_SECRET_KEY..."
echo "$YOOKASSA_KEY" | firebase apphosting:secrets:set YOOKASSA_SECRET_KEY --force || true

echo ""
echo "✅ Secrets created successfully!"
echo ""
echo "Now granting App Hosting backend access..."

# Grant access
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_GEMINI_API_KEY --backend=telegenie
firebase apphosting:secrets:grantaccess TELEGRAM_BOT_TOKEN --backend=telegenie
firebase apphosting:secrets:grantaccess TELEGRAM_CHAT_ID --backend=telegenie
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID --backend=telegenie
firebase apphosting:secrets:grantaccess YOOKASSA_SHOP_ID --backend=telegenie
firebase apphosting:secrets:grantaccess YOOKASSA_SECRET_KEY --backend=telegenie

echo ""
echo "🎉 Done! You can now deploy:"
echo "firebase deploy --only apphosting"
