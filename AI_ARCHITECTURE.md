# AI Product Recommendation System - Architecture & Implementation Plan

**Architecture**: Convex Actions + OpenAI Function Calling  
**Created**: January 20, 2026  
**Status**: Design Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema Design](#database-schema-design)
4. [Phase 1: Product Management System](#phase-1-product-management-system)
5. [Phase 2: Shopify Integration](#phase-2-shopify-integration)
6. [Phase 3: AI Agent Implementation](#phase-3-ai-agent-implementation)
7. [Phase 4: Product Matching Engine](#phase-4-product-matching-engine)
8. [Phase 5: Integration & Testing](#phase-5-integration--testing)
9. [Deployment Strategy](#deployment-strategy)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Risk Assessment & Mitigation](#risk-assessment--mitigation)

---

## Executive Summary

This document outlines the architecture and implementation plan for an AI-powered product recommendation system integrated with Instagram DMs and comments. The system will:

- ✅ Automatically respond to customer inquiries with relevant product recommendations
- ✅ Understand customer preferences through multi-turn conversations
- ✅ Support both Shopify-synced products and custom product uploads
- ✅ Use semantic search and AI to match customer needs with products
- ✅ Handle variants, pricing inquiries, and product comparisons

### Key Technology Decisions

**Chosen Approach**: Convex Actions + OpenAI Function Calling

**Why This Stack**:
- ✅ No additional infrastructure needed (uses existing Convex)
- ✅ Cost effective (~$0.01 per AI conversation)
- ✅ Type-safe end-to-end
- ✅ Fast execution (direct database access)
- ✅ Easy to debug and maintain

**Not Chosen**:
- ❌ LangGraph - Too complex for MVP, adds infrastructure overhead
- ❌ Inngest - Not needed initially, can add later for complex workflows

### Success Metrics

- **Response Time**: < 5 seconds for AI reply
- **Success Rate**: > 95% successful AI responses
- **Product Match Accuracy**: > 80% relevant recommendations
- **Cost per Conversation**: < $0.015
- **Customer Satisfaction**: Measurable through engagement

### Timeline & Resources

| Phase | Duration | Effort | Blockers |
|-------|----------|--------|----------|
| Phase 1: Product Management | 1-2 weeks | Medium | None |
| Phase 2: Shopify Integration | 1 week | Low | Shopify approval |
| Phase 3: AI Agent Core | 2 weeks | High | OpenAI API setup |
| Phase 4: Product Matching | 1 week | Medium | Embedding generation |
| Phase 5: Testing & Polish | 1 week | Medium | Real data needed |
| **Total** | **6 weeks** | - | - |

### Cost Estimation

**Per Conversation Costs**:

| Component | Cost |
|-----------|------|
| OpenAI Embedding (query) | $0.00002 |
| OpenAI GPT-4 Turbo (analysis + response) | $0.008 |
| Convex Operations | Included |
| Instagram API | Free |
| **Total per AI conversation** | **~$0.01** |

**Monthly Estimates**:

| Volume | OpenAI Cost | Convex Cost | Total |
|--------|-------------|-------------|-------|
| 1,000 conversations | $10 | $25 | $35 |
| 5,000 conversations | $50 | $25 | $75 |
| 10,000 conversations | $100 | $25 | $125 |

---

## Architecture Overview

### System Context Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CUSTOMER                              │
│          (Instagram DM / Comment)                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                Instagram Graph API                       │
│              (Webhook Notifications)                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│           Next.js API Route Handler                      │
│         /api/instagram/webhook                           │
│  - Validates webhook                                     │
│  - Extracts message/comment                              │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│         Convex Backend (Real-time Database)              │
│  - Stores message/comment                                │
│  - Triggers AI processing                                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│           AI Agent Orchestrator                          │
│         (Convex Action)                                  │
│                                                          │
│  1. Load Conversation Context                           │
│  2. Analyze Message Intent (OpenAI)                      │
│  3. Search Products (Vector + Filter)                    │
│  4. Generate Response (OpenAI)                           │
│  5. Send Instagram Reply                                 │
│  6. Update Conversation State                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              OpenAI API Services                         │
│                                                          │
│  - GPT-4 Turbo: Conversation & Response                 │
│  - text-embedding-3-small: Product Search               │
│  - Function Calling: Tool Orchestration                  │
└──────────────────────────────────────────────────────────┘
```

### Data Flow Sequence

**Happy Path Flow**:

```
1. Customer sends Instagram DM: "Do you have blue summer dresses under $80?"

2. Instagram → Webhook → Next.js API
   - Webhook receives message event
   - Extracts: senderId, message text, platform

3. Next.js → Convex Mutation
   - Store message in database
   - Mark status as "pending"

4. Convex → AI Agent Action (async)
   - Triggers processIncomingEvent action
   
5. AI Agent Step 1: Load Context
   - Query: getOrCreateConversation(userId, customerId)
   - Retrieves: Previous messages, customer preferences
   
6. AI Agent Step 2: Intent Analysis (OpenAI Call #1)
   - Input: Customer message + conversation history
   - Output: {
       intent: "product_search",
       query: "blue summer dresses",
       preferences: {
         priceRange: { max: 80 },
         colors: ["blue"],
         categories: ["dresses"]
       }
     }

7. AI Agent Step 3: Product Search
   - Method A: Vector Search (semantic)
     - Generate embedding for "blue summer dresses"
     - Query products.vectorIndex with filters
   - Method B: Text Search + Filters
     - Search by keywords: "blue", "dress", "summer"
     - Filter: price <= 80, color = blue
   - Returns: Top 5 matching products

8. AI Agent Step 4: Response Generation (OpenAI Call #2)
   - Input: Original message, products, brand voice
   - Output: "Hi! I have perfect options for you! Check out our Azure Summer Maxi ($65) and Ocean Blue Sundress ($72). Both available in your size. Which style do you prefer? [links]"

9. AI Agent Step 5: Send Reply
   - Instagram Graph API: POST /messages
   - Sends generated response with product links

10. AI Agent Step 6: Update State
    - Add messages to conversation history
    - Update customer preferences
    - Mark message status as "sent"
    - Log execution metrics

11. Customer receives reply in Instagram DM ✅
```

### Component Architecture

**Frontend Layer** (Next.js):
- `/products` - Product management UI
- `/settings` - Shopify connection, AI settings
- `/analytics` - Performance dashboard
- `/conversations` - View customer conversations

**API Layer** (Next.js API Routes):
- `/api/instagram/webhook` - Receive Instagram events
- `/api/shopify/auth` - OAuth flow
- `/api/shopify/callback` - Token exchange
- `/api/shopify/sync` - Manual sync trigger

**Backend Layer** (Convex):
- **Queries**: Read-only data fetching
  - `products.list` - Get products
  - `products.search` - Text search
  - `conversations.get` - Conversation history
  
- **Mutations**: Data modifications
  - `products.create` - Add product
  - `products.update` - Modify product
  - `conversations.addMessage` - Store message
  - `conversations.updatePreferences` - Learn preferences
  
- **Actions**: External API calls & AI
  - `ai.agent.productRecommendationAgent` - Main orchestrator
  - `products.generateEmbedding` - Create vectors
  - `shopify.syncProducts` - Fetch from Shopify
  - `instagram.sendReply` - Post to Instagram

**AI Services Layer**:
- Intent Analyzer - Understands customer needs
- Product Matcher - Finds relevant products
- Response Generator - Creates natural replies
- Context Manager - Tracks conversations

---

## Database Schema Design

### Core Principles

- **Denormalization**: Store computed data (price ranges, embeddings) for fast reads
- **Indexes**: Every query path has an optimized index
- **Versioning**: Track created/updated timestamps
- **Soft Deletes**: Use `isActive` flags instead of hard deletes
- **Type Safety**: Strict Convex schema validation

### Schema Tables Overview

**1. products** - Product Catalog
- Purpose: Store all products with variants and search metadata
- Key Fields: name, description, category, tags, variants[], searchEmbedding[]
- Indexes: by_user, by_active, search_products (text), by_embedding (vector)
- Volume Estimate: 100-10,000 products per user

**2. productCollections** - Product Groupings
- Purpose: Organize products into collections/campaigns
- Key Fields: name, productIds[], tags[]
- Relationship: One-to-many with products
- Use Cases: "Summer Sale", "New Arrivals"

**3. shopifyIntegrations** - E-commerce Sync
- Purpose: Store Shopify connection and sync state
- Key Fields: shopDomain, accessToken (encrypted), lastSyncAt, syncStatus
- Security: Never expose accessToken to frontend
- Sync Frequency: Webhook-based + manual trigger

**4. conversations** - Customer Interaction State
- Purpose: Track multi-turn conversations with context
- Key Fields: customerId, messages[], customerPreferences{}, recommendedProducts[]
- Message Structure: { role, content, timestamp, productIds[] }
- Retention: Archive after 90 days of inactivity

**5. agentExecutions** - AI Debugging & Analytics
- Purpose: Log every AI agent execution for debugging
- Key Fields: executionId, step, status, stepData, durationMs
- Use Cases: Error analysis, performance monitoring, cost tracking
- Retention: 30 days

**6. productAnalytics** - Product Performance
- Purpose: Track which products get recommended/clicked
- Aggregation: Daily rollup per product
- Metrics: views, recommendations, clicks, conversions

**7. conversationAnalytics** - AI Performance
- Purpose: Daily metrics on AI agent performance
- Metrics: totalConversations, aiCalls, avgResponseTime, aiCost

### Data Relationships

```
users (1) ←→ (N) products
users (1) ←→ (1) shopifyIntegrations
users (1) ←→ (N) conversations
conversations (1) ←→ (N) agentExecutions
products (1) ←→ (N) productAnalytics
```

### Key Design Decisions

**Why Embed Variants in Products?**
- Faster reads (no joins needed)
- Natural grouping (one product, many variants)
- Simplifies vector search (one embedding per product)
- Trade-off: Larger documents, but worth it for performance

**Why Store Conversation History?**
- Context is critical for AI understanding
- Enables multi-turn conversations
- Allows preference learning
- Privacy consideration: Implement data retention policy

**Why Separate agentExecutions Table?**
- Debugging AI failures
- Performance analysis
- Cost attribution
- Can be purged independently

**Vector Embedding Strategy**:
- Generate once per product
- Regenerate on description/tag changes
- Dimension: 1536 (OpenAI text-embedding-3-small)
- Storage: ~6KB per product
- Search: Sub-100ms for 10K products

---

## Phase 1: Product Management System

### Objectives

- ✅ Create database schema for products
- ✅ Build product CRUD operations
- ✅ Implement product upload UI
- ✅ Support product variants (color, size, price)
- ✅ Generate embeddings for semantic search

### Components to Build

**1. Database Functions** (`convex/products.ts`)

Functions to implement:
- `listProducts` (query) - Fetch user's products with filters
- `getProduct` (query) - Get single product by ID
- `searchProducts` (query) - Text search with filters
- `createProduct` (mutation) - Add new product
- `updateProduct` (mutation) - Modify product
- `deleteProduct` (mutation) - Soft delete (set isActive=false)
- `generateProductEmbedding` (action) - Call OpenAI API
- `batchGenerateEmbeddings` (action) - Bulk process

**2. UI Components** (`src/components/products/`)

Components to create:
- `ProductForm` - Add/edit product with variants
- `ProductList` - Display products in table/grid
- `ProductCard` - Single product preview
- `VariantManager` - Add/remove/edit variants
- `ImageUploader` - Handle product images
- `BulkUploader` - CSV import for multiple products

**3. Pages** (`src/app/products/`)

Pages to create:
- `/products` - Main product management page
- `/products/new` - Create product form
- `/products/[id]` - Edit existing product
- `/products/import` - Bulk import interface

### Product Data Model

**Core Fields**:
```
Product {
  Basic Info:
    - name: string
    - description: string (full)
    - shortDescription: string (for listings)
  
  Categorization:
    - category: string[] (hierarchical: ["Clothing", "Dresses"])
    - tags: string[] (searchable keywords)
  
  Pricing:
    - basePrice: number (starting price)
    - priceRange: { min, max } (computed from variants)
    - currency: string
  
  Variants:
    - variants: Array<{
        sku: string (unique identifier)
        name: string
        color?: string
        size?: string
        material?: string
        price: number
        compareAtPrice?: number (for sales)
        stock: number
        images: string[]
        available: boolean
      }>
  
  Media:
    - mainImage: string (primary product photo)
    - images: string[] (gallery)
  
  Links:
    - productUrl: string (buy link/landing page)
  
  AI Search:
    - searchEmbedding: float64[] (1536 dimensions)
  
  Metadata:
    - isActive: boolean
    - isFeatured: boolean
    - shopifyProductId?: string (if synced)
    - metadata: object (custom fields)
}
```

### Variant Management Strategy

**Challenges**:
- How to handle "Show me this in blue"?
- How to filter by size/color efficiently?
- How to manage stock per variant?

**Solution**:
1. Store variants as nested array in product
2. Index product by base attributes
3. Filter variants in application layer
4. AI extracts variant preference and filters programmatically

**Example AI Understanding**:
```
Customer: "Do you have the summer dress in blue, size M?"

AI Processing:
1. Identify product: "summer dress"
2. Extract filters: color=blue, size=M
3. Search products matching "summer dress"
4. Filter variants where color=blue AND size=M
5. Respond with specific variant if available
```

### Image Handling Strategy

**Options**:

**Option A: Convex File Storage** (Recommended for MVP)
- Built-in to Convex
- Simple API
- Automatic CDN
- Limited to 1GB free tier

**Option B: Cloudinary**
- Free tier: 25GB storage
- Advanced transformations
- Better for high volume

**Option C: AWS S3 + CloudFront**
- Most scalable
- Requires more setup
- Better for production

**Recommendation**: Start with Convex File Storage, migrate to Cloudinary if needed.

### Embedding Generation Workflow

**When to Generate**:
- On product creation
- When description/tags change
- On manual trigger (bulk)

**What to Embed**:
```
searchText = [
  product.name,
  product.description,
  product.category.join(" "),
  product.tags.join(" "),
  product.metadata?.brand,
  product.variants.map(v => v.color).join(" ")
].join(" ")
```

**Optimization**:
- Cache embeddings (don't regenerate unless changed)
- Batch generate (process multiple products in parallel)
- Handle failures gracefully (retry logic)

### Testing Checklist

- [ ] Create product with single variant
- [ ] Create product with multiple variants (colors, sizes)
- [ ] Upload product images
- [ ] Edit product details
- [ ] Soft delete product
- [ ] Search products by name
- [ ] Filter products by category
- [ ] Filter products by price range
- [ ] Generate embeddings for products
- [ ] Verify embeddings stored correctly

---

## Phase 2: Shopify Integration

### Objectives

- ✅ Connect user's Shopify store via OAuth
- ✅ Sync products from Shopify to local database
- ✅ Handle product updates via webhooks
- ✅ Support inventory sync
- ✅ Handle multiple Shopify stores (multi-tenant)

### Integration Architecture

**Shopify OAuth Flow**:
```
1. User clicks "Connect Shopify" in settings
   ↓
2. Redirect to Shopify OAuth URL
   - Include: client_id, scopes, redirect_uri, state (CSRF)
   ↓
3. User authorizes in Shopify
   ↓
4. Shopify redirects to /api/shopify/callback?code=...
   ↓
5. Exchange code for access_token
   - POST to Shopify /admin/oauth/access_token
   ↓
6. Store credentials in shopifyIntegrations table
   - Encrypt access_token before storing
   ↓
7. Trigger initial product sync
   ↓
8. Set up webhooks for real-time updates
```

**Webhook Events to Subscribe**:
- `products/create` - New product added
- `products/update` - Product modified
- `products/delete` - Product removed
- `inventory_levels/update` - Stock changed

### Components to Build

**1. API Routes** (`src/app/api/shopify/`)

Routes to implement:
- `/auth` - Initiate OAuth flow
- `/callback` - Handle OAuth callback
- `/sync` - Manual sync trigger
- `/webhook` - Receive Shopify webhooks
- `/disconnect` - Remove integration

**2. Convex Functions** (`convex/shopify.ts`)

Functions to implement:
- `connectStore` (mutation) - Save Shopify credentials
- `getIntegration` (query) - Get connection status
- `syncProducts` (action) - Fetch products from Shopify API
- `syncSingleProduct` (action) - Update one product
- `handleWebhook` (mutation) - Process webhook events
- `updateSyncStatus` (mutation) - Track sync progress

**3. UI Components** (`src/components/shopify/`)

Components to create:
- `ShopifyConnect` - Connection button & status
- `SyncStatus` - Display last sync time & status
- `ProductMapping` - Map Shopify fields to our schema
- `SyncSettings` - Configure auto-sync options

### Data Transformation

**Shopify Product → Our Schema Mapping**:

```
Shopify Product Fields:
- id → shopifyProductId
- title → name
- body_html → description (strip HTML)
- product_type → category[0]
- tags → tags (split by comma)
- variants[] → variants[]
  - id → sku
  - title → name
  - option1 → color (if applicable)
  - option2 → size (if applicable)
  - price → price
  - compare_at_price → compareAtPrice
  - inventory_quantity → stock
- images[] → images[]
- handle → productUrl path
```

**Challenges**:
1. **Option Mapping**: Shopify has generic "option1", "option2", "option3"
   - Solution: Let users configure which option is color/size
   
2. **HTML in Description**: Shopify stores body_html
   - Solution: Strip HTML tags, keep text only
   
3. **Image URLs**: Shopify CDN URLs
   - Solution: Store as-is, they're permanent

4. **Product URLs**: Need to construct full URL
   - Solution: `https://{shopDomain}/products/{handle}`

### Sync Strategy

**Initial Sync** (one-time):
- Fetch all products (paginated, 250 per request)
- Transform each product
- Create new products in database
- Generate embeddings for each
- Update sync status

**Incremental Sync** (webhook-based):
- Receive webhook event
- Fetch updated product from Shopify
- Update existing product in database
- Regenerate embedding if description changed
- Log sync event

**Manual Sync** (user-triggered):
- Useful for troubleshooting
- Re-sync all products
- Show progress indicator

### Error Handling

**Common Errors**:
1. **Token Expired**: Shopify tokens can expire
   - Solution: Show reconnection prompt
   
2. **Rate Limits**: Shopify API has rate limits (2 req/sec)
   - Solution: Implement exponential backoff
   
3. **Network Failures**: API calls can fail
   - Solution: Retry with backoff, log failures
   
4. **Data Inconsistencies**: Missing fields
   - Solution: Provide defaults, log warnings

### Security Considerations

**Access Token Storage**:
- ⚠️ Never expose to frontend
- ✅ Encrypt at rest (use encryption library)
- ✅ Only accessible via Convex actions
- ✅ Rotate on reconnection

**Webhook Verification**:
- ✅ Verify HMAC signature
- ✅ Check webhook origin
- ✅ Rate limit webhook endpoint

### Testing Checklist

- [ ] Connect to Shopify store
- [ ] Sync products from Shopify
- [ ] Verify product data accuracy
- [ ] Test webhook for product create
- [ ] Test webhook for product update
- [ ] Test webhook for product delete
- [ ] Test rate limit handling
- [ ] Disconnect Shopify store
- [ ] Reconnect after token expiry

---

## Phase 3: AI Agent Implementation

### Objectives

- ✅ Build AI conversation orchestrator
- ✅ Implement intent analysis
- ✅ Manage conversation context
- ✅ Generate natural responses
- ✅ Handle multi-turn conversations
- ✅ Implement error handling & fallbacks

### AI Agent Architecture

**Agent Components**:

```
┌────────────────────────────────────────────┐
│       AI Agent Orchestrator                │
│   (Main entry point)                       │
└────────────┬───────────────────────────────┘
             │
    ┌────────┴─────────┬─────────────┬──────────┐
    │                  │             │          │
    ▼                  ▼             ▼          ▼
┌────────┐    ┌────────────┐  ┌──────────┐  ┌─────────┐
│Context │    │  Intent    │  │ Product  │  │Response │
│Manager │    │ Analyzer   │  │ Matcher  │  │Generator│
└────────┘    └────────────┘  └──────────┘  └─────────┘
     │              │               │             │
     └──────────────┴───────────────┴─────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   OpenAI     │
              │   Services   │
              └──────────────┘
```

### Agent Execution Flow

**Detailed Step Breakdown**:

**Step 1: Context Loading**
- Query conversation history (last 10 messages)
- Load customer preferences (if any)
- Identify conversation stage (new vs. ongoing)
- Detect previous product recommendations

**Step 2: Intent Analysis**
- Call OpenAI with message + history
- Extract: intent type, search query, preferences
- Detect: clarification needs, follow-up questions
- Output structured JSON

**Step 3: Product Search**
- If new query: semantic + keyword search
- If follow-up: filter previous results
- Apply preference filters
- Rank by relevance

**Step 4: Response Generation**
- Call OpenAI with products + context
- Apply brand voice guidelines
- Format with product links
- Keep under Instagram character limits

**Step 5: Delivery**
- Send via Instagram API
- Handle rate limits
- Verify delivery

**Step 6: State Update**
- Store messages in conversation
- Update customer preferences
- Log execution metrics
- Track recommended products

### Intent Classification

**Intent Types**:

1. **product_search** - Looking for specific products
   - Example: "Do you have blue dresses?"
   - Action: Search products, return top matches

2. **variant_question** - Asking about specific variant
   - Example: "Do you have this in size M?"
   - Action: Find product from context, filter variants

3. **price_inquiry** - Budget/pricing questions
   - Example: "What's your cheapest option?"
   - Action: Sort by price, apply budget filter

4. **comparison** - Comparing products
   - Example: "What's the difference between A and B?"
   - Action: Fetch both products, highlight differences

5. **general_question** - Non-product queries
   - Example: "What's your return policy?"
   - Action: Use FAQ or fallback response

6. **support** - Needs human assistance
   - Example: "I have a problem with my order"
   - Action: Escalate to human, provide contact info

### Conversation Context Management

**What to Track**:
```
Conversation State {
  Customer Info:
    - customerId (Instagram ID)
    - username
    - platform (DM vs comment)
  
  History:
    - Last 10 messages
    - Message timestamps
    - Products mentioned
  
  Preferences (learned):
    - Price range (min, max)
    - Preferred colors
    - Preferred sizes
    - Style preferences
    - Categories of interest
  
  Session Info:
    - Last interaction time
    - Total messages exchanged
    - Products sent
    - Conversion tracking
}
```

**Context Window Strategy**:
- Keep last 10 messages for AI context
- Summarize older messages
- Reset context after 24 hours of inactivity
- Allow manual context reset

### Multi-Turn Conversation Handling

**Scenario Examples**:

**Example 1: Refining Search**
```
Customer: "Show me dresses"
AI: "Sure! Here are our popular dresses [shows 5 products]"

Customer: "Something more casual"
AI: [Filters previous results by style=casual]

Customer: "Under $50"
AI: [Applies price filter to filtered results]
```

**Example 2: Variant Selection**
```
Customer: "I like the blue summer dress"
AI: "Great choice! It's available in sizes S, M, L. What size?"

Customer: "Medium please"
AI: "Perfect! Here's the Medium Blue: [link, price, stock]"
```

**Example 3: Comparison**
```
Customer: "What's the difference between dress A and B?"
AI: [Compares features, price, materials]

Customer: "I'll take A"
AI: "Excellent! Here's your link to purchase [link]"
```

### Response Generation Strategy

**OpenAI Prompt Structure**:
```
System Prompt:
- Define assistant role
- Specify brand voice
- Set response constraints (length, format)
- Include product formatting rules

User Messages:
- Conversation history (last N messages)
- Current customer message

Function/Tool Results:
- Product search results
- Variant availability
- Pricing information

Instructions:
- Be helpful and friendly
- Keep responses concise
- Always include product links
- Handle "no results" gracefully
```

**Brand Voice Customization**:
- Allow users to define brand personality
- Examples: Professional, Casual, Playful, Luxury
- Store in user settings
- Apply via system prompt

**Response Constraints**:
- Instagram DM: ~1000 characters per message
- Instagram Comment: ~300 characters
- Split long responses if needed
- Prioritize most important info first

### Error Handling & Fallbacks

**Error Scenarios**:

1. **OpenAI API Failure**
   - Retry with exponential backoff (3 attempts)
   - If still fails, use pattern matching fallback
   - Send generic helpful message
   - Log error for investigation

2. **No Products Found**
   - Don't say "no results" directly
   - Suggest: "Let me show you similar items..."
   - Expand search criteria
   - Offer to notify when available

3. **Instagram API Failure**
   - Retry sending (3 attempts)
   - If fails, queue for later retry
   - Don't lose customer message
   - Alert admin

4. **Timeout**
   - Set max execution time (10 seconds)
   - Return partial results if possible
   - Send "still searching..." message
   - Complete search async

**Fallback Hierarchy**:
```
1. AI Agent with full context
   ↓ (if fails)
2. AI Agent with limited context
   ↓ (if fails)
3. Pattern matching (existing system)
   ↓ (if fails)
4. Generic helpful message + human escalation
```

### Execution Logging

**What to Log**:
- Execution ID (for tracing)
- Each step completion
- Step duration
- Step output (for debugging)
- Errors with stack traces
- Final outcome

**Log Levels**:
- INFO: Normal execution flow
- WARN: Retries, slow operations
- ERROR: Failures, exceptions

**Benefits**:
- Debug AI failures
- Optimize performance
- Track costs
- Improve prompts

### Testing Strategy

**Unit Tests**:
- Test intent analyzer with various inputs
- Test product matcher logic
- Test response formatter
- Test error handlers

**Integration Tests**:
- Full flow with mock OpenAI responses
- Test conversation context persistence
- Test multi-turn scenarios
- Test fallback mechanisms

**Manual Tests**:
- Real Instagram messages
- Edge cases (emoji, special chars)
- Long conversations
- Concurrent messages

### Testing Checklist

- [ ] Process simple product query
- [ ] Handle multi-turn conversation
- [ ] Understand price range requests
- [ ] Filter by color/size/category
- [ ] Handle "show me in different color"
- [ ] Compare products when asked
- [ ] Gracefully handle no results
- [ ] Fall back on OpenAI failure
- [ ] Retry on Instagram API failure
- [ ] Track conversation preferences
- [ ] Generate embeddings efficiently
- [ ] Stay within response time SLA

---

## Phase 4: Product Matching Engine

### Objectives

- ✅ Implement semantic search using embeddings
- ✅ Combine with keyword matching
- ✅ Apply metadata filters
- ✅ Implement ranking algorithm
- ✅ Use OpenAI function calling for tool orchestration

### Search Architecture

**Hybrid Search Strategy**:
```
Customer Query
    ↓
┌───────────────────────────┐
│  Query Understanding      │
│  (OpenAI)                 │
└──────────┬────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ Vector  │  │ Keyword  │
│ Search  │  │ Search   │
└────┬────┘  └────┬─────┘
     │            │
     └──────┬─────┘
            ▼
    ┌──────────────┐
    │   Metadata   │
    │   Filters    │
    └──────┬───────┘
           ▼
    ┌──────────────┐
    │   Ranking    │
    │  Algorithm   │
    └──────┬───────┘
           ▼
    Results (Top 5)
```

### Semantic Search Implementation

**Embedding Generation**:
- Model: `text-embedding-3-small` (1536 dimensions)
- Cost: $0.00002 per 1K tokens
- Speed: ~100ms per embedding
- Quality: High semantic understanding

**What Gets Embedded**:
```
Product:
  name + description + category + tags + brand + variant details

Query:
  customer message + conversation context + preferences
```

**Vector Search Process**:
1. Generate embedding for customer query
2. Query Convex vector index
3. Return top K candidates (K=20)
4. Apply metadata filters
5. Rank and return top 5

**Optimization**:
- Pre-compute all product embeddings
- Only recompute on product changes
- Cache query embeddings (if repeated)
- Use approximate nearest neighbor (ANN) for speed

### Keyword Search Implementation

**When to Use**:
- Exact SKU matches
- Brand name searches
- Specific product name queries

**Implementation**:
- Use Convex's built-in text search index
- Search across: name, description, tags
- Support fuzzy matching
- Case-insensitive

**Combining with Vector Search**:
```
Final Results = {
  vectorResults (weight: 0.7) +
  keywordResults (weight: 0.3)
}
```

### Metadata Filtering

**Filter Types**:

1. **Price Range**
   - Apply: priceRange.min >= userMin && priceRange.max <= userMax
   - Handle: "under $50", "between $30-$80"

2. **Color**
   - Check: variants.some(v => v.color matches)
   - Handle: Multiple colors ("blue or red")

3. **Size**
   - Check: variants.some(v => v.size matches)
   - Handle: Size ranges ("M or L")

4. **Category**
   - Check: category includes user category
   - Handle: Hierarchical ("Clothing > Dresses")

5. **Availability**
   - Check: variants.some(v => v.available && v.stock > 0)
   - Always filter: Only show in-stock items

**Filter Application Order**:
1. Search (vector + keyword)
2. Availability filter (must have stock)
3. Price filter
4. Color filter
5. Size filter
6. Category filter

### Ranking Algorithm

**Scoring Components**:

```
finalScore = 
  semanticScore * 0.40 +
  keywordScore * 0.20 +
  popularityScore * 0.15 +
  availabilityScore * 0.10 +
  priceMatchScore * 0.10 +
  recencyScore * 0.05
```

**Component Details**:

1. **semanticScore** (0-1)
   - Cosine similarity from vector search
   - Higher = more semantically similar

2. **keywordScore** (0-1)
   - Exact matches get higher score
   - Normalized by number of matches

3. **popularityScore** (0-1)
   - Based on past recommendations
   - Products recommended more = higher score

4. **availabilityScore** (0-1)
   - High stock = 1.0
   - Low stock = 0.5
   - Out of stock = 0.0

5. **priceMatchScore** (0-1)
   - Perfect budget match = 1.0
   - Outside budget = 0.0

6. **recencyScore** (0-1)
   - Newer products get slight boost
   - Encourages showing new inventory

### OpenAI Function Calling Integration

**Tool Definitions**:

**Tool 1: search_products**
```
Purpose: Search product catalog
Parameters:
  - query: string (search terms)
  - filters: object {
      priceMin?: number
      priceMax?: number
      colors?: string[]
      sizes?: string[]
      categories?: string[]
    }
Returns: Product[]
```

**Tool 2: get_product_variants**
```
Purpose: Get specific variants of a product
Parameters:
  - productName: string
  - color?: string
  - size?: string
Returns: ProductVariant[]
```

**Tool 3: compare_products**
```
Purpose: Compare multiple products
Parameters:
  - productIds: string[]
Returns: ComparisonTable
```

**How It Works**:
1. AI receives customer message
2. AI decides which tool(s) to call
3. AI generates tool arguments from message
4. System executes tools
5. Results returned to AI
6. AI formulates natural response

**Benefits**:
- AI chooses the right search strategy
- Handles complex queries automatically
- Reduces custom prompt engineering
- More maintainable

### Special Cases

**Case 1: "Show me more like this"**
- Extract: Previous product from context
- Action: Find similar products using embedding similarity
- Return: Top 5 most similar

**Case 2: "Cheaper alternatives"**
- Extract: Current product + price
- Action: Search same category, filter price < current
- Return: Sorted by price ascending

**Case 3: "This in different color"**
- Extract: Current product + new color
- Action: Get same product, filter variants by color
- Return: Specific variant

**Case 4: No results found**
- Action 1: Relax filters (expand price, remove color)
- Action 2: Suggest similar categories
- Action 3: Offer to notify when available

### Performance Optimization

**Caching Strategy**:
```
Cache Level 1: Product embeddings (永久)
  - Invalidate on product update
  
Cache Level 2: Popular searches (1 hour)
  - Cache: Query embedding + results
  - Useful for common queries
  
Cache Level 3: User preferences (session)
  - Avoid re-extracting every message
```

**Query Optimization**:
- Batch embedding generation
- Parallel vector + keyword search
- Early filtering (reduce result set)
- Limit results early (top K)

**Expected Performance**:
- Embedding generation: ~100ms
- Vector search: <50ms
- Keyword search: <20ms
- Filtering: <10ms
- **Total: <200ms** for product matching

### Testing Checklist

- [ ] Semantic search finds relevant products
- [ ] Keyword search handles exact matches
- [ ] Price filtering works correctly
- [ ] Color filtering across variants works
- [ ] Size filtering across variants works
- [ ] Category filtering handles hierarchy
- [ ] Availability filtering excludes out-of-stock
- [ ] Ranking produces sensible order
- [ ] "Show more like this" works
- [ ] "Cheaper alternatives" works
- [ ] "Different color" variant switching works
- [ ] No results handled gracefully
- [ ] Performance meets SLA (<200ms)

---

## Phase 5: Integration & Testing

### Objectives

- ✅ Integrate all components
- ✅ End-to-end testing
- ✅ Performance optimization
- ✅ Error handling verification
- ✅ User acceptance testing

### Integration Points

**Component Integration Map**:
```
Instagram Webhook
    ↓
Convex Mutation (store message)
    ↓
Convex Action (trigger AI)
    ↓
AI Agent Orchestrator
    ├→ Conversation Manager
    ├→ Intent Analyzer (OpenAI)
    ├→ Product Matcher
    │   ├→ Vector Search (Convex)
    │   ├→ Keyword Search (Convex)
    │   └→ Filters
    ├→ Response Generator (OpenAI)
    └→ Instagram Reply Sender
    ↓
Conversation State Update
    ↓
Analytics Logging
```

### Testing Strategy

**Level 1: Unit Tests**
- Test individual functions
- Mock external dependencies
- Focus on business logic
- Use Convex test framework

**Level 2: Integration Tests**
- Test component interactions
- Mock only external APIs (OpenAI, Instagram)
- Use test database
- Verify data flow

**Level 3: End-to-End Tests**
- Test full user journey
- Use staging environment
- Real Instagram sandbox
- Measure performance

**Level 4: User Acceptance Testing**
- Real users test in production
- Gather feedback
- Identify edge cases
- Measure satisfaction

### Test Scenarios

**Happy Path Scenarios**:

1. **Simple Product Search**
   - Input: "Show me dresses"
   - Expected: List of 5 dresses with links
   - Verify: Correct products, formatted response

2. **Price-Filtered Search**
   - Input: "Dresses under $50"
   - Expected: Only dresses < $50
   - Verify: All products within budget

3. **Multi-Turn Conversation**
   - Turn 1: "Show me shoes"
   - Turn 2: "Size 8"
   - Turn 3: "In black"
   - Verify: Context maintained, filters applied

4. **Variant Question**
   - Input: "Do you have the blue dress in medium?"
   - Expected: Specific variant info
   - Verify: Correct variant found

5. **Comparison**
   - Input: "Compare dress A and dress B"
   - Expected: Side-by-side comparison
   - Verify: Key differences highlighted

**Edge Case Scenarios**:

6. **No Results**
   - Input: "Purple polka dot tuxedo"
   - Expected: Graceful message + alternatives
   - Verify: No error, helpful response

7. **Ambiguous Query**
   - Input: "Something nice"
   - Expected: Clarifying question
   - Verify: AI asks for details

8. **Multiple Filters**
   - Input: "Blue dresses under $80 size small"
   - Expected: Highly filtered results
   - Verify: All filters applied

9. **Emoji and Special Characters**
   - Input: "👗 💙 party dress"
   - Expected: Handles emoji, finds dresses
   - Verify: No parsing errors

10. **Very Long Message**
    - Input: 500+ character message
    - Expected: Extracts key info
    - Verify: Doesn't timeout

**Error Scenarios**:

11. **OpenAI Timeout**
    - Simulate: API delay
    - Expected: Retry then fallback
    - Verify: User receives response

12. **Instagram API Failure**
    - Simulate: API error
    - Expected: Queue for retry
    - Verify: Message eventually sent

13. **Product Not Found**
    - Input: Reference non-existent product
    - Expected: Polite "not available"
    - Verify: Offers alternatives

14. **Concurrent Messages**
    - Input: Multiple messages rapidly
    - Expected: All processed in order
    - Verify: No race conditions

15. **Token Expired**
    - Simulate: Expired Instagram token
    - Expected: Alert user to reconnect
    - Verify: Clear error message

### Performance Testing

**Metrics to Measure**:

1. **Response Time**
   - Target: < 5 seconds end-to-end
   - Measure: Time from webhook to reply sent
   - Components:
     - Context loading: <100ms
     - Intent analysis: <1s
     - Product search: <200ms
     - Response generation: <1.5s
     - Instagram API: <500ms

2. **Throughput**
   - Target: 100 conversations/minute
   - Test: Parallel message processing
   - Bottleneck: OpenAI rate limits

3. **Accuracy**
   - Target: >80% relevant recommendations
   - Measure: Manual review of 100 conversations
   - Track: Precision, recall, F1 score

4. **Cost**
   - Target: <$0.015 per conversation
   - Track: OpenAI API usage
   - Optimize: Reduce unnecessary calls

**Load Testing**:
- Simulate: 1000 concurrent users
- Tool: Artillery or k6
- Monitor: Response times, error rates
- Identify: Bottlenecks, failure points

### Data Quality Testing

**Product Data**:
- [ ] All products have valid images
- [ ] All prices are positive numbers
- [ ] All variants have SKUs
- [ ] All products have embeddings
- [ ] No orphaned variants

**Conversation Data**:
- [ ] Message history correct order
- [ ] Preferences accurately tracked
- [ ] Timestamps correct
- [ ] Product IDs valid

**Analytics Data**:
- [ ] Metrics aggregate correctly
- [ ] Counts match reality
- [ ] No data loss on errors

### Monitoring Setup

**What to Monitor**:

1. **System Health**
   - API uptime
   - Response times
   - Error rates
   - Queue lengths

2. **Business Metrics**
   - Conversations per day
   - Products recommended
   - Response success rate
   - Customer satisfaction proxy

3. **Cost Metrics**
   - OpenAI API spend
   - Spend per conversation
   - Budget alerts

4. **Quality Metrics**
   - Intent detection accuracy
   - Product match relevance
   - Response quality scores

**Alerting Rules**:
- Error rate > 5%: Page on-call
- Response time > 10s: Warning
- Cost > $200/day: Alert
- OpenAI API failures: Immediate alert

### Rollout Plan

**Phase 1: Internal Testing** (Week 1)
- Team uses staging environment
- Test all scenarios
- Fix critical bugs

**Phase 2: Beta Testing** (Week 2-3)
- 5-10 selected users
- Real Instagram accounts
- Gather feedback
- Iterate quickly

**Phase 3: Limited Release** (Week 4)
- 10% of users
- Monitor closely
- A/B test vs. pattern matching
- Gradual increase

**Phase 4: Full Release** (Week 5-6)
- 100% of users
- Monitor for issues
- Prepare rollback plan
- Celebrate launch! 🎉

### Testing Checklist

**Functional Tests**:
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] End-to-end scenarios work
- [ ] Error scenarios handled
- [ ] Edge cases covered

**Non-Functional Tests**:
- [ ] Performance targets met
- [ ] Load testing successful
- [ ] Security audit passed
- [ ] Accessibility requirements met

**User Tests**:
- [ ] Beta user feedback positive
- [ ] UI intuitive
- [ ] Responses natural
- [ ] Recommendations relevant

**Production Readiness**:
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Runbook created
- [ ] Rollback plan ready

---

## Deployment Strategy

### Pre-Deployment Checklist

**Code Readiness**:
- [ ] All code reviewed
- [ ] Tests passing (>90% coverage)
- [ ] Documentation complete
- [ ] Type errors resolved
- [ ] Linting passes

**Infrastructure**:
- [ ] Environment variables set
- [ ] Secrets encrypted
- [ ] Database migrated
- [ ] Indexes created
- [ ] Backups configured

**External Services**:
- [ ] OpenAI API key valid
- [ ] Instagram app approved
- [ ] Shopify app approved (if applicable)
- [ ] Rate limits understood
- [ ] Fallback plans ready

**Data**:
- [ ] Products imported
- [ ] Embeddings generated
- [ ] Test data cleaned
- [ ] Analytics baseline set

### Environment Setup

**Required Environment Variables**:
```
# Core
NEXT_PUBLIC_CONVEX_URL=<convex-url>
CONVEX_DEPLOYMENT=<deployment-name>

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<key>
CLERK_SECRET_KEY=<key>

# AI
OPENAI_API_KEY=<key>

# Instagram
INSTAGRAM_APP_ID=<id>
INSTAGRAM_APP_SECRET=<secret>
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=<token>

# Shopify (optional)
SHOPIFY_API_KEY=<key>
SHOPIFY_API_SECRET=<secret>

# URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Deployment Environments**:

1. **Development** (`dev`)
   - Local testing
   - Fast iteration
   - No real API calls

2. **Staging** (`staging`)
   - Pre-production testing
   - Real APIs (sandbox mode)
   - Beta users

3. **Production** (`prod`)
   - Live users
   - Real APIs
   - Monitored 24/7

### Database Migration

**Schema Update Process**:
```
1. Deploy schema changes to dev
   $ npx convex dev
   
2. Verify in dev environment
   - Test queries
   - Check indexes
   
3. Deploy to staging
   $ npx convex deploy --staging
   
4. Run migration scripts
   - Backfill data
   - Generate embeddings
   
5. Verify in staging
   - Test with real-like data
   
6. Deploy to production
   $ npx convex deploy --prod
   
7. Monitor closely
   - Watch for errors
   - Check performance
```

**Backward Compatibility**:
- Old schema fields marked optional
- Gradual deprecation
- No breaking changes

### Deployment Steps

**Step 1: Backend Deployment**
```
1. Deploy Convex functions
   $ npx convex deploy --prod
   
2. Verify functions deployed
   - Check Convex dashboard
   - Test queries/mutations
   
3. Generate product embeddings
   $ npx convex run ai:batchGenerateEmbeddings
   
4. Verify database state
   - Check product count
   - Verify embeddings exist
```

**Step 2: Frontend Deployment**
```
1. Build Next.js application
   $ npm run build
   
2. Test build locally
   $ npm start
   
3. Deploy to Vercel/hosting
   $ vercel deploy --prod
   
4. Verify deployment
   - Check all pages load
   - Test API routes
```

**Step 3: Webhook Configuration**
```
1. Update Instagram webhook URL
   - Point to production API
   
2. Test webhook delivery
   - Send test message
   - Verify received
   
3. Subscribe to events
   - messages
   - comments
   - mentions (optional)
```

**Step 4: Monitoring Setup**
```
1. Configure alerts
   - Error rate thresholds
   - Response time SLAs
   
2. Set up dashboards
   - System health
   - Business metrics
   
3. Test alerting
   - Trigger test alert
   - Verify notification
```

### Rollback Plan

**When to Rollback**:
- Error rate > 10%
- Response time > 15s consistently
- Data corruption detected
- Critical bug discovered

**Rollback Steps**:
```
1. Revert frontend deployment
   $ vercel rollback
   
2. Revert Convex functions (if needed)
   $ npx convex deploy --prod --tag previous
   
3. Update Instagram webhooks (if needed)
   - Point to previous API version
   
4. Announce incident
   - Status page
   - User notification
   
5. Post-mortem
   - Identify root cause
   - Document lessons
   - Prevent recurrence
```

### Post-Deployment

**Immediate (First Hour)**:
- Monitor error logs
- Check response times
- Verify AI agent processing
- Test sample conversations

**First Day**:
- Review all conversations
- Check cost metrics
- Gather user feedback
- Fix urgent issues

**First Week**:
- Analyze performance trends
- Optimize slow queries
- Improve prompts based on feedback
- Document common issues

**First Month**:
- Full performance review
- Cost optimization
- Feature improvements
- Scale planning

---

## Monitoring & Maintenance

### Monitoring Strategy

**Three Pillars of Monitoring**:

1. **Logs** - What happened?
   - Application logs (Convex)
   - API logs (OpenAI, Instagram)
   - Error logs with stack traces
   - Audit logs (user actions)

2. **Metrics** - How much/many?
   - Request count
   - Response times
   - Error rates
   - Resource usage

3. **Traces** - Why did it happen?
   - Request flow
   - Function call tree
   - Slow operations
   - Failure points

### Key Metrics Dashboard

**System Health Metrics**:
```
┌─────────────────────────────────────┐
│ Overall System Health               │
├─────────────────────────────────────┤
│ Uptime: 99.9%                       │
│ Avg Response Time: 3.2s             │
│ Error Rate: 0.5%                    │
│ Active Conversations: 145           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ AI Agent Performance                │
├─────────────────────────────────────┤
│ Success Rate: 97.3%                 │
│ Avg Intent Confidence: 0.89         │
│ Avg Products per Response: 3.2      │
│ Fallback Rate: 2.7%                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Product Matching                    │
├─────────────────────────────────────┤
│ Avg Search Time: 187ms              │
│ Avg Results Returned: 4.8           │
│ Zero Results Rate: 3.1%             │
│ Cache Hit Rate: 68%                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Cost Tracking                       │
├─────────────────────────────────────┤
│ Today: $12.34                       │
│ This Month: $234.56                 │
│ Cost per Conv: $0.011               │
│ Budget: 52% used                    │
└─────────────────────────────────────┘
```

**Business Metrics**:
```
┌─────────────────────────────────────┐
│ Conversation Analytics              │
├─────────────────────────────────────┤
│ Today: 1,234 conversations          │
│ This Week: 7,890                    │
│ Avg Messages per Conv: 3.4          │
│ Conversion Rate: 12.3%              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Top Products Recommended            │
├─────────────────────────────────────┤
│ 1. Summer Dress Blue - 45 times     │
│ 2. White T-Shirt - 38 times         │
│ 3. Denim Jeans - 32 times           │
│ 4. Running Shoes - 28 times         │
└─────────────────────────────────────┘
```

### Alert Configuration

**Critical Alerts** (Page immediately):
- System down (uptime < 99%)
- Error rate > 10%
- OpenAI API key invalid
- Instagram token expired
- Database connection lost

**Warning Alerts** (Slack notification):
- Response time > 10s (95th percentile)
- Error rate > 5%
- Cost > daily budget
- Zero results rate > 20%
- Queue backlog > 100 messages

**Info Alerts** (Email digest):
- Daily summary
- Weekly trends
- New user signups
- Feature usage stats

### Maintenance Tasks

**Daily Tasks**:
- Review error logs
- Check cost metrics
- Monitor performance trends
- Respond to alerts

**Weekly Tasks**:
- Analyze conversation quality
- Review top failing queries
- Update product embeddings (if needed)
- Optimize slow operations
- Review user feedback

**Monthly Tasks**:
- Performance optimization review
- Cost analysis and optimization
- Prompt engineering improvements
- Feature prioritization
- Security audit

**Quarterly Tasks**:
- System architecture review
- Scale planning
- Disaster recovery test
- User satisfaction survey

### Common Issues & Solutions

**Issue 1: Slow Response Times**
- Symptom: Response time > 10s
- Diagnosis: Check which step is slow
- Solutions:
  - Cache product embeddings
  - Optimize vector search
  - Reduce OpenAI token usage
  - Batch operations

**Issue 2: High Error Rate**
- Symptom: Error rate > 5%
- Diagnosis: Check error types in logs
- Solutions:
  - Fix code bugs
  - Add retry logic
  - Improve error handling
  - Update dependencies

**Issue 3: Irrelevant Product Recommendations**
- Symptom: User feedback, low conversions
- Diagnosis: Review AI responses manually
- Solutions:
  - Improve prompt engineering
  - Adjust ranking algorithm
  - Retrain embeddings
  - Add more product metadata

**Issue 4: High Costs**
- Symptom: Cost per conversation > $0.02
- Diagnosis: Review OpenAI API usage
- Solutions:
  - Reduce context window
  - Use cheaper models for simple tasks
  - Cache common queries
  - Implement rate limiting

**Issue 5: Instagram API Failures**
- Symptom: Messages not sending
- Diagnosis: Check Instagram API logs
- Solutions:
  - Refresh access token
  - Check rate limits
  - Retry with backoff
  - Queue messages

### Debugging Tools

**Convex Dashboard**:
- View all functions
- Check execution logs
- Monitor performance
- Query database

**Execution Trace Viewer**:
- See full AI agent execution
- Step-by-step timing
- View intermediate data
- Identify bottlenecks

**Conversation Inspector**:
- View full conversation history
- See AI decisions
- Check products recommended
- Replay conversations

**Product Search Tester**:
- Test search queries
- See scoring breakdown
- Compare ranking algorithms
- Validate filters

### Performance Optimization

**Query Optimization**:
- Add indexes for common queries
- Use `.filter()` before `.collect()`
- Limit results early
- Batch operations

**Embedding Optimization**:
- Pre-compute all embeddings
- Cache in-memory (if possible)
- Batch generation
- Incremental updates only

**Response Time Optimization**:
- Parallel API calls where possible
- Stream responses (if supported)
- Optimize prompt length
- Use faster OpenAI models for simple tasks

**Cost Optimization**:
- Use GPT-3.5-turbo for simple queries
- Reduce system prompt length
- Cache common responses
- Implement query deduplication

### Disaster Recovery

**Backup Strategy**:
- Convex: Automatic snapshots (daily)
- Products: Export to JSON (weekly)
- Conversations: Archive old data (monthly)
- Configurations: Version control

**Recovery Procedures**:

**Scenario 1: Data Corruption**
```
1. Identify affected data
2. Restore from latest backup
3. Replay missing transactions
4. Verify data integrity
5. Resume operations
```

**Scenario 2: Service Outage**
```
1. Identify root cause
2. Switch to fallback mode (pattern matching)
3. Fix underlying issue
4. Gradual re-enable AI agent
5. Post-mortem analysis
```

**Scenario 3: Security Breach**
```
1. Immediately rotate all secrets
2. Revoke compromised tokens
3. Audit access logs
4. Notify affected users
5. Implement additional security
```

---

## Risk Assessment & Mitigation

### Technical Risks

**Risk 1: OpenAI API Downtime**
- Impact: HIGH - AI agent stops working
- Probability: LOW - OpenAI has 99.9% uptime
- Mitigation:
  - Implement fallback to pattern matching
  - Cache common responses
  - Queue messages for retry
  - Monitor OpenAI status page

**Risk 2: Token Rate Limits**
- Impact: MEDIUM - Slower responses, some failures
- Probability: MEDIUM - Can hit limits with high volume
- Mitigation:
  - Implement request queuing
  - Rate limit per user
  - Optimize token usage
  - Consider OpenAI Enterprise

**Risk 3: Embedding Quality Degradation**
- Impact: MEDIUM - Poor product matches
- Probability: LOW - Embeddings stable
- Mitigation:
  - Regular quality checks
  - A/B test embedding models
  - Hybrid search (vector + keyword)
  - Manual review of top products

**Risk 4: Data Privacy Concerns**
- Impact: HIGH - Legal/reputation issues
- Probability: MEDIUM - Handling customer data
- Mitigation:
  - Clear privacy policy
  - Encrypt sensitive data
  - Implement data retention policy
  - GDPR compliance

**Risk 5: Scaling Issues**
- Impact: HIGH - Service degradation
- Probability: MEDIUM - Growth can be rapid
- Mitigation:
  - Load testing before launch
  - Auto-scaling infrastructure
  - Caching strategy
  - Performance monitoring

### Business Risks

**Risk 1: High Costs**
- Impact: MEDIUM - Unsustainable economics
- Probability: MEDIUM - AI costs can escalate
- Mitigation:
  - Cost per conversation tracking
  - Budget alerts
  - Optimize prompt length
  - Use cheaper models when possible

**Risk 2: Low Accuracy**
- Impact: HIGH - Users don't trust system
- Probability: MEDIUM - AI can make mistakes
- Mitigation:
  - Human-in-the-loop (optional)
  - Feedback mechanism
  - Continuous prompt improvement
  - A/B testing

**Risk 3: User Adoption**
- Impact: HIGH - Feature not used
- Probability: MEDIUM - Change management needed
- Mitigation:
  - Clear value proposition
  - Easy setup process
  - Good documentation
  - Success stories

**Risk 4: Competitor Advantage**
- Impact: MEDIUM - Not differentiated
- Probability: HIGH - AI is commoditizing
- Mitigation:
  - Focus on quality
  - Unique features
  - Integration depth
  - Customer success

### Operational Risks

**Risk 1: Key Person Dependency**
- Impact: MEDIUM - Knowledge loss
- Probability: HIGH - Small team
- Mitigation:
  - Comprehensive documentation
  - Code reviews
  - Knowledge sharing sessions
  - Cross-training

**Risk 2: Third-Party Dependencies**
- Impact: HIGH - Service disruption
- Probability: LOW - Reliable providers
- Mitigation:
  - Vendor SLA monitoring
  - Backup providers identified
  - Fallback mechanisms
  - Regular reviews

**Risk 3: Security Vulnerabilities**
- Impact: HIGH - Data breach
- Probability: MEDIUM - Always a target
- Mitigation:
  - Regular security audits
  - Dependency updates
  - Penetration testing
  - Security training

---

## Success Criteria

### Launch Success Metrics (First Month)

**Technical Success**:
- ✅ Uptime > 99%
- ✅ Response time < 5s (95th percentile)
- ✅ Error rate < 2%
- ✅ Cost per conversation < $0.015

**User Success**:
- ✅ 50+ active users
- ✅ 1,000+ conversations
- ✅ Positive feedback (>4/5 rating)
- ✅ 10+ success stories

**Business Success**:
- ✅ Product recommendation accuracy > 75%
- ✅ Conversion rate > 10%
- ✅ Customer satisfaction improved
- ✅ Support ticket reduction

### Long-Term Vision

**3 Months**:
- 200+ active users
- 10,000+ conversations
- 85% recommendation accuracy
- Multi-language support

**6 Months**:
- 500+ active users
- Advanced features (voice, images)
- Predictive recommendations
- WhatsApp integration

**12 Months**:
- 1,000+ active users
- AI-powered sales assistant
- Multi-channel support
- Enterprise features

---

## Conclusion

This architecture provides a **pragmatic, cost-effective solution** for AI-powered product recommendations without the complexity of full agent frameworks like LangGraph or workflow orchestrators like Inngest.

**Key Strengths**:
- ✅ Leverages existing infrastructure (Convex)
- ✅ Simple to implement and maintain
- ✅ Cost-effective at scale
- ✅ Fast execution (< 5s responses)
- ✅ Easy to debug and monitor

**Future Enhancements**:
- Add Inngest if complex workflows needed
- Consider LangGraph for advanced agent behaviors
- Implement human-in-the-loop for quality control
- Add more data sources (reviews, inventory)

**Ready to Build?**

1. Start with Phase 1 (Product Management)
2. Add Phase 2 (Shopify Integration) if needed
3. Implement Phase 3 (AI Agent Core)
4. Enhance with Phase 4 (Product Matching)
5. Test thoroughly in Phase 5
6. Deploy gradually with monitoring

This architecture will scale to thousands of conversations per day while maintaining quality and keeping costs under control.

---

**Document Version**: 1.0  
**Last Updated**: January 20, 2026  
**Status**: Ready for Implementation
