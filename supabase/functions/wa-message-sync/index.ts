// Supabase Edge Function: wa-message-sync
// Mirrors WhatsApp messages from GoHighLevel into member_messages, so the full
// conversation shows on the member's profile in-app. GHL remains the system of
// record and the place replies are sent; this only reflects what GHL reports.
//
// Fed by two GHL workflows (see claude/GHL_whatsapp_inbox_sync.md):
//   - Inbound message  -> POST { direction:"in",  ... }
//   - Outbound message -> POST { direction:"out", ... }
//
// Deploy (PUBLIC — GHL sends no Supabase JWT):
//   supabase functions deploy wa-message-sync --no-verify-jwt
//   supabase secrets set WA_SYNC_WEBHOOK_SECRET=your-long-random-string
// Table: run member_messages.sql first.
//
// Auth: ?key=<secret> (or x-webhook-secret header), matched to WA_SYNC_WEBHOOK_SECRET.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WA_SYNC_WEBHOOK_SECRET") ?? "";
const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE);

function normEmail(e: unknown): string {
  return String(e ?? "").trim().toLowerCase();
}

// Pull a field by any of several likely GHL key names (workflows vary).
function pick(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o?.[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") return new Response("wa-message-sync alive", { status: 200 });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const key = url.searchParams.get("key") ?? req.headers.get("x-webhook-secret") ?? "";
  if (WEBHOOK_SECRET && key !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("bad body", { status: 400 });
  }

  const email = normEmail(pick(body, "email", "contact_email", "contactEmail"));
  const dirRaw = pick(body, "direction", "dir").toLowerCase();
  const direction = dirRaw === "out" || dirRaw === "outbound" ? "out"
    : dirRaw === "in" || dirRaw === "inbound" ? "in"
    : "";
  if (!email) return new Response(JSON.stringify({ ok: false, error: "email required" }), { status: 400 });
  if (!direction) return new Response(JSON.stringify({ ok: false, error: "direction required" }), { status: 400 });

  const waId = pick(body, "wa_message_id", "message_id", "messageId", "id");
  const occurredRaw = pick(body, "timestamp", "occurred_at", "dateAdded", "date");
  const occurredAt = occurredRaw && !isNaN(Date.parse(occurredRaw))
    ? new Date(occurredRaw).toISOString()
    : new Date().toISOString();

  const row = {
    email,
    direction,
    body: pick(body, "body", "message", "text", "messageBody") || null,
    channel: pick(body, "channel") || "whatsapp",
    wa_message_id: waId || null,
    template_key: pick(body, "template_key", "templateKey") || null,
    status: pick(body, "status") || (direction === "in" ? "received" : "sent"),
    ghl_contact_id: pick(body, "ghl_contact_id", "contact_id", "contactId") || null,
    ghl_conversation_id: pick(body, "ghl_conversation_id", "conversation_id", "conversationId") || null,
    occurred_at: occurredAt,
    raw: body,
  };

  const db = admin();
  try {
    if (row.wa_message_id) {
      // Idempotent: a retried webhook for the same message won't duplicate.
      await db.from("member_messages").upsert(row, {
        onConflict: "wa_message_id",
        ignoreDuplicates: true,
      });
    } else {
      await db.from("member_messages").insert(row);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    console.error("wa-message-sync insert:", (e as Error).message);
    return new Response(JSON.stringify({ ok: false, error: "insert failed" }), { status: 500 });
  }
});
