// Temporary workaround: Generate Page Access Token manually
// 
// Since /me/accounts returns empty due to Page role restrictions,
// you can manually generate a Page Access Token and add it to Convex:
//
// 1. Go to: https://developers.facebook.com/tools/explorer
// 2. Select your App: chatWiseAI
// 3. Click "Generate Access Token"
// 4. Select permissions: pages_show_list, instagram_basic, instagram_manage_comments, instagram_manage_messages, pages_read_engagement, pages_manage_metadata
// 5. Click "Generate"
// 6. Copy the token
// 7. In Graph API Explorer, run:
//    GET /{YOUR_PAGE_ID}?fields=instagram_business_account,access_token
//    (Replace {YOUR_PAGE_ID} with: 582556251616575 from your screenshot)
// 8. Copy the page access_token and instagram_business_account.id from response
// 9. Manually insert into Convex users table:
//    - instagramAccountId: <ig_business_account_id>
//    - instagramAccessToken: <page_access_token>
//    - instagramPageId: 582556251616575
//    - instagramTokenExpiresAt: <timestamp 60 days from now>
//
// This bypasses the OAuth flow for testing purposes.
// For production, ensure Page Admin role.
