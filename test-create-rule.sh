#!/bin/bash
# Script to create a test auto-reply rule

# You'll need to replace USER_ID with your actual Convex user _id
# Get it from your Convex dashboard: https://dashboard.convex.dev

echo "Creating test auto-reply rules..."

# Example: Reply to DMs containing 'price' or 'pricing'
echo "Rule 1: Price inquiry (DM)"
# You'll need to call this via your app UI or Convex dashboard

echo "Rule 2: Hello greeting (Comment)"
# You'll need to call this via your app UI or Convex dashboard

echo ""
echo "To create rules, you can:"
echo "1. Use Convex dashboard: https://dashboard.convex.dev"
echo "2. Or create a UI component (recommended)"
echo ""
echo "Example rule for testing:"
echo "  Type: dm"
echo "  Pattern: price"
echo "  Reply: Our prices start at $99/month. Visit our website for details!"
echo "  Enabled: true"
