#!/bin/bash
# Test script to simulate Instagram webhook events locally

# Test incoming comment event
curl -X POST http://localhost:3000/api/instagram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "test_instagram_account_id",
      "time": 1699564800,
      "changes": [{
        "field": "comments",
        "value": {
          "id": "test_comment_123",
          "text": "Hello, what are your prices?",
          "from": {
            "id": "test_user_456",
            "username": "testuser"
          },
          "media": {
            "id": "test_media_789"
          }
        }
      }]
    }]
  }'

echo "\n\n--- Testing DM event ---\n"

# Test incoming message event
curl -X POST http://localhost:3000/api/instagram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "id": "test_instagram_account_id",
      "time": 1699564800,
      "messaging": [{
        "sender": {
          "id": "test_sender_123"
        },
        "recipient": {
          "id": "test_instagram_account_id"
        },
        "timestamp": 1699564800000,
        "message": {
          "mid": "test_msg_456",
          "text": "Do you ship internationally?"
        }
      }]
    }]
  }'
