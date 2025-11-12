# ChatWise.AI MVP – Web Application Project Spec

## 1. Project Overview

**Product:** ChatWise.AI  
**Goal:** Automate customer replies on Instagram (post comments and DMs) for small e-commerce sellers.

**Scope (MVP):**  
- Web application only (no mobile app)
- Sellers connect Instagram account
- Auto-reply to post comments (one reply per comment, within 7 days)
- Auto-reply to DMs
- Basic dashboard for managing comments, DMs, and settings

---

## 2. Tech Stack

| Layer               | Technology                  | Rationale                       |
|---------------------|----------------------------|----------------------------------|
| Web Frontend        | Next.js + TypeScript      | Fast, robust UI, scalable        |
| UI Library          | shadcn/ui    | Modern, consistent design        |

| HTTP Client         | Axios or Fetch             | REST API requests                |
| Real-Time           | Socket.io (future-proof)   | For updates/notifications        |
| Auth                | JWT (localStorage)         | Secure sessions                  |

| Database            | Convex           | ACID, SQL, scalable              |

| Cache/Queue         | Redis + Bull               | Async jobs, rate limiting        |
| Instagram API       | Graph API (official, REST) | Official integration             |
| AI Integration      | OpenAI GPT-4 API           | Contextual replies               |
| Deployment          | Docker, AWS/GCP/Azure      | Fast deployment, scalable        |
| Monitoring          | LogRocket (FE), Winston (BE) | Error monitoring               |

---

## 3. MVP Requirements

### 3.1 Seller Onboarding
- Signup, login (email/password)
- Dashboard walkthrough
- Connect Instagram Business/Creator account (OAuth)
- Store access tokens securely

### 3.2 Instagram Comments
- Fetch new comments on seller’s posts (webhooks first, poll as fallback)
- Show comment, author, post, timestamp in DB/UI
- For each comment:  
  - Generate AI-powered reply (via OpenAI GPT-4)
  - Post reply using Instagram Graph API (quote comment, follow reply window/rate rules)
  - Record reply status (sent, failed, skipped)

- *Extra:* Allow seller to edit reply before sending (optional for MVP, required in v2)

### 3.3 Instagram DMs
- Fetch DMs (Inbox, unread, recipient info)
- Show DM list in dashboard
- For new DMs:
  - Generate AI reply (OpenAI GPT-4)
  - Send reply via API
  - Store reply status and log

- *Extra:* Seller can approve/edit before send or opt-in to fully automatic mode

### 3.4 Dashboard & Logs
- Central feed: all incoming comments/DMs with statuses
- Log of all automated replies
- Error/edge case handling: failed, expired, API error
- Basic metrics: number auto-replied, pending, failed

### 3.5 Settings
- Upload catalog/FAQs, set brand voice guidelines
- Edit profile/business info, disconnect Instagram

---

## 4. Non-Functional Requirements

- Security: Use JWT, encrypt stored tokens
- Rate limiting: Enforce Instagram API limits, queue if limits hit
- Resilience: Retry failed sends, show errors clearly to seller
- Performance: <1s dashboard load (for under 200 tickets)
- Scalability: 1000+ seller accounts capable
- >70% automated test coverage (backend critical paths)

---

## 5. APIs & References

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram/)
- [OpenAI GPT-4 API](https://platform.openai.com/docs/api-reference)
- [OAuth IG Connect](https://developers.facebook.com/docs/instagram-api/getting-started)

---

## 6. MVP Out of Scope

- WhatsApp automation
- Mobile apps (no PWA for MVP)
- Multiple IG account linking per user
- Team/user management
- E-commerce checkout/payment gateway integration

---

## 7. User Stories

- As a seller, I can connect my Instagram account to automate replies.
- As a seller, I see a live feed of all comments and DMs.
- System automatically replies to comments and DMs, and logs all interactions.
- System clearly marks failed, succeeded, and pending replies.
- As a seller, I can define product catalog and FAQ for better AI answers.

---

## 8. Deliverables

- React web app (seller onboarding, IG connect, dashboard)
- Node.js API (seller management, IG/AI integration, auth)
- PostgreSQL schema (sellers, IG accounts, comments, DMs, logs)
- Integration with Instagram Graph API  
- AI integration: OpenAI GPT-4
- Dockerized deployment
- Test ≧3 sellers in production (staging) for 1 week

---

## 9. Success Criteria

- Automated IG reply setup in <10 minutes
- >80% new comments/DMs handled automatically within 30s
- All failures/errors are logged and actionable
- 3+ test sellers onboarded successfully during MVP phase

---

**End of project.md – ChatWise.AI Web Application MVP**
