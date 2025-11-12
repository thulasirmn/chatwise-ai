#!/bin/bash

# Subscribe your Facebook Page to Instagram webhook fields
# This tells Facebook to send DM/comment events to your webhook URL

echo "Subscribing page to Instagram webhook fields..."

# Call the subscribe API (authenticated via Clerk session cookie)
RESPONSE=$(curl -s -X POST http://localhost:3000/api/instagram/subscribe \
  -H "Content-Type: application/json" \
  -H "Cookie: ${CLERK_COOKIE:-}")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "To check current subscriptions:"
echo "curl -X GET http://localhost:3000/api/instagram/subscribe"
