import { NextResponse } from "next/server";
import { ConvexClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Webhook verification (GET request from Instagram)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "chatwise_verify_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// Webhook events (POST request from Instagram)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log("Instagram webhook received:", JSON.stringify(body, null, 2));
    
    // Log entry types for debugging
    if (body.entry) {
      body.entry.forEach((entry: any, idx: number) => {
        console.log(`Entry ${idx}:`, {
          id: entry.id,
          hasMessaging: !!entry.messaging,
          hasChanges: !!entry.changes,
          changeFields: entry.changes?.map((c: any) => c.field),
          changes: entry.changes,
        });
        
        // Log full change details for debugging
        if (entry.changes) {
          entry.changes.forEach((change: any, cidx: number) => {
            console.log(`  Change ${cidx}:`, JSON.stringify(change, null, 2));
          });
        }
      });
    }

    // Store events in Convex
    const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    await convex.mutation(api.instagram.handleWebhook, body);
    
    // Process events for auto-reply
    if (body.object === "instagram" && body.entry) {
      for (const entry of body.entry) {
        // Handle DMs
        if (entry.messaging) {
          for (const event of entry.messaging) {
            if (event.message?.text) {
              const recipientId = event.recipient.id;
              const senderId = event.sender.id;
              const messageText = event.message.text;
              const messageId = event.message.mid;

              // Find user by Instagram account ID
              const user = await convex.query(api.users.getUserByInstagramId, { 
                instagramAccountId: recipientId 
              });
              
              if (user) {
                await convex.action(api.instagram.processIncomingEvent, {
                  userId: user._id,
                  type: "dm" as const,
                  content: messageText,
                  targetId: senderId,
                  messageId: messageId,
                });
              }
            }
          }
        }

        // Handle comments
        if (entry.changes) {
          for (const change of entry.changes) {
            // Handle both "comments" and "live_comments"
            if ((change.field === "comments" || change.field === "live_comments") && change.value?.text) {
              const commentId = change.value.id;
              const text = change.value.text;
              const ownerId = change.value.media?.owner?.id || 
                            change.value.media?.ig_id || 
                            entry.id;

              console.log("📝 Processing comment:", { commentId, text: text.substring(0, 50), ownerId });

              // Find user by Instagram account ID
              const user = await convex.query(api.users.getUserByInstagramId, { 
                instagramAccountId: ownerId 
              });
              
              if (user) {
                console.log("✅ User found, processing comment auto-reply");
                await convex.action(api.instagram.processIncomingEvent, {
                  userId: user._id,
                  type: "comment" as const,
                  content: text,
                  targetId: commentId,
                });
              } else {
                console.log("⚠️ No user found for IG account:", ownerId);
              }
            }
          }
        }
      }
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
