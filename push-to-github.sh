#!/bin/bash

# Script to push to GitHub using a Personal Access Token
# This avoids keychain issues

echo "=== GitHub Push Helper ==="
echo ""
echo "This will help you push using a GitHub Personal Access Token"
echo ""
echo "If you don't have a token yet:"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Click 'Generate new token' → 'Generate new token (classic)'"
echo "3. Name it: 'Cursor Git Push'"
echo "4. Select scope: 'repo' (full control)"
echo "5. Click 'Generate token'"
echo "6. COPY THE TOKEN"
echo ""
read -sp "Enter your GitHub Personal Access Token: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
  echo "❌ No token provided. Exiting."
  exit 1
fi

# Temporarily set the remote URL with the token
git remote set-url origin https://${TOKEN}@github.com/saunamo/product-configurator.git

echo "✅ Remote URL updated with token"
echo "🚀 Pushing to GitHub..."
git push origin main

# Restore original remote URL (without token in URL)
git remote set-url origin https://github.com/saunamo/product-configurator.git

echo ""
echo "✅ Done! Netlify will automatically deploy in 2-5 minutes."
