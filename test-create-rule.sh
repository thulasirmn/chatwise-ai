#!/bin/bash
# Script to create a test auto-reply rule via API

PATTERN="${1:-hi}"
REPLY="${2:-Thanks for reaching out! We will get back to you shortly.}"
TYPE="${3:-dm}"

echo "Creating auto-reply rule..."
echo "  Pattern: $PATTERN"
echo "  Reply: $REPLY"
echo "  Type: $TYPE"
echo ""

# Call the rules API (needs authentication via browser session)
RESPONSE=$(curl -s -X POST https://ensnaringly-volcanological-yun.ngrok-free.dev/api/rules \
  -H "Content-Type: application/json" \
  -d "{\"pattern\":\"$PATTERN\",\"replyText\":\"$REPLY\",\"type\":\"$TYPE\"}")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "To verify, check: http://localhost:3000/api/instagram/status"
echo "You should see the rule in the 'rules' section."
