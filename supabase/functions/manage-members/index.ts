// Supabase Edge Function: manage-members
// Deploy:  create a function named "manage-members" and paste this in.
// Secrets (Edge Function settings → Secrets):
//   SUPABASE_URL               = https://juvofqqtvakltlwqqhkn.supabase.co   (usually auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY  = <your service-role key>   (Project Settings → API → service_role)
//   STAFF_SECRET               = <a long random string>    (also put this in the admin UI call)
//   INVITE_REDIRECT            = https://etlfittrack.netlify.app/auth        (where the invite link lands)
//
// Runs the staff-only member operations with the service-role key (the browser must
// never hold it). Actions:
//   { action:"list" }                                        -> all members (membership resolved by email OR link)
//   { action:"setAccess", memberId, allowed:[...] }          -> manual access edit (sets access_override=true)
//   { action:"clearAccessOverride", memberId }               -> drop override; snap access back to membership
//   { action:"invite", name, email, allowed?:[...] }         -> email a signup/invite link + set access
//   { action:"bulkInvite", members:[{name,email,allowed?}] } -> invite many (CSV import)
//   { action:"unlinkedSuggestions" }                         -> app members with no membership + name-matched roster candidates
//   { action:"linkMember", userId, memberId }                -> link an app account to a roster row + apply access
//   { action:"unlinkMember", userId }                        -> remove a link
// Every call MUST include { staffSecret } matching STAFF_SECRET.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACCESS_VALUES = ["Foundations", "Stronger", "Fusion", "Performance", "Group PT"];
const cleanAccess = (a: any): string[] =>
  Array.isArray(a) ? a.filter((v) => ACCESS_VALUES.includes(v)) : ["Foundations", "Stronger", "Fusion", "Performance"];

// Collapse gmail/googlemail, gmail dots and +tags so those line up without a manual link.
// (Apple hide-my-email relays can't be reversed — they fall through to the name-match suggestions.)
function normEmail(e: any): string {
  const s = String(e ?? "").trim().toLowerCase();
  const at = s.indexOf("@");
  if (at < 0) return s;
  let local = s.slice(0, at);
  let dom = s.slice(at + 1);
  local = local.split("+")[0];
  if (dom === "googlemail.com") dom = "gmail.com";
  if (dom === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${dom}`;
}

// Normalise a name to a sorted token set: "Rich Brown" vs "Brown, Richard" both need a human
// confirm anyway, so we cast a slightly wide net and let the coach approve. Requires ≥2 tokens.
function normName(n: any): string {
  const toks = String(n ?? "").toLowerCase().replace(/[^a-z]+/g, " ").split(/\s+/).filter(Boolean);
  return toks.length >= 2 ? toks.slice().sort().join(" ") : "";
}

// Access rule: EVERYONE gets the four base streams; "Group PT" is the only add-on.
// Group PT -> 30-day (PT) trial and PT memberships only.
// NOT Group PT -> "21 days for £21" gym trial, Classes (Team Training), gym memberships.
// ACCESS_VALUES = Foundations | Stronger | Fusion | Performance | Group PT.
const BASE_STREAMS = ["Foundations", "Stronger", "Fusion", "Performance"];
function getsGroupPT(p: any): boolean {
  const s = String(p || "").toLowerCase();
  if (/21|£\s*21|gym\s*trial/.test(s)) return false;        // 21-for-£21 gym trial = gym-tier, no Group PT
  if (/30\s*day/.test(s)) return true;                      // 30-day (PT) trial
  if (/\bpt\b|pt-|semi[\s-]?private/.test(s)) return true;  // PT memberships
  return false;                                             // Classes, gym, everything else
}
const accessForProduct = (p: any): string[] =>
  getsGroupPT(p) ? [...BASE_STREAMS, "Group PT"] : [...BASE_STREAMS];

// If they already have an account, don't re-invite — just (re)apply their access.
async function updateExistingAccess(admin: any, email: string, name?: string, allowed?: any) {
  const existing = await admin.from("members").select("id").eq("email", email).maybeSingle();
  if (existing.data?.id) {
    await admin.from("members").update({ allowed_access: cleanAccess(allowed), full_name: name ?? undefined }).eq("id", existing.data.id);
    return { ok: true, note: "Already registered — access updated, no new invite sent." };
  }
  return null;
}

// Invite one person: Supabase (via Resend SMTP) sends the branded invite email with the secure
// set-password link; then, if a GHL webhook is set, we ALSO ping GHL so it can fire a WhatsApp
// "nudge" (no link needed — it just tells them to check their email). Email = the real invite;
// GHL = optional nudge. The nudge is best-effort and never fails the invite.
async function inviteOne(
  admin: any, email: string, name?: string, allowed?: any, redirectTo?: string, ghlWebhook?: string,
) {
  if (!email || !/.+@.+\..+/.test(email)) return { ok: false, error: "Invalid email" };

  // 1) Supabase creates the account + sends the invite email through the configured SMTP (Resend).
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name ?? "" }, redirectTo,
  });
  if (error) {
    // Already registered (or other) — apply access, no new invite/nudge.
    const upd = await updateExistingAccess(admin, email, name, allowed);
    return upd ?? { ok: false, error: error.message };
  }
  const id = data?.user?.id;
  if (id) await admin.from("members").update({ allowed_access: cleanAccess(allowed), full_name: name ?? undefined }).eq("id", id);

  // 2) Optional GHL nudge (WhatsApp/SMS "check your email"). No invite link is sent — the secure
  //    link lives only in the Resend email. Best-effort: a nudge failure never fails the invite.
  let nudged = false;
  if (ghlWebhook) {
    try {
      const resp = await fetch(ghlWebhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name ?? "", email, access: cleanAccess(allowed) }),
      });
      nudged = resp.ok;
    } catch (_) { /* ignore — email invite already sent */ }
  }
  return { ok: true, via: "supabase+resend", nudged };
}

// Fetch the full roster once (id, email, name, product, status).
async function loadRoster(admin: any) {
  const { data } = await admin.from("gym_members").select("id, email, full_name, product, status");
  return data ?? [];
}
// Fetch all confirmed links: user_id -> member_id.
async function loadLinks(admin: any) {
  const map: Record<string, string> = {};
  try {
    const { data } = await admin.from("member_links").select("user_id, member_id");
    for (const l of data ?? []) map[String(l.user_id)] = String(l.member_id);
  } catch (_) { /* table may not exist yet */ }
  return map;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: any, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const staffSecret = Deno.env.get("STAFF_SECRET") ?? "";
    const redirectTo = Deno.env.get("INVITE_REDIRECT") ?? undefined;
    const ghlWebhook = Deno.env.get("GHL_WEBHOOK_URL") ?? undefined;
    if (!url || !serviceKey) return json({ error: "Function secrets not set (SUPABASE_URL / SERVICE_ROLE_KEY)." }, 500);

    const body = await req.json();
    if (!staffSecret || body.staffSecret !== staffSecret) return json({ error: "Not authorised." }, 401);

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const action = body.action;

    if (action === "list") {
      const { data, error } = await admin.from("members").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      // Activation (has actually signed in) from auth.users.
      const authByEmail: Record<string, { activated: boolean; last_sign_in_at: string | null }> = {};
      try {
        for (let page = 1; page <= 50; page++) {
          const { data: pg } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          const users = pg?.users ?? [];
          for (const u of users) {
            const em = String(u.email ?? "").toLowerCase();
            if (em) authByEmail[em] = { activated: !!u.last_sign_in_at, last_sign_in_at: u.last_sign_in_at ?? null };
          }
          if (users.length < 200) break;
        }
      } catch (_) { /* fall back to activated:false */ }

      const staffSet = new Set<string>();
      try {
        const { data: sd } = await admin.from("staff_users").select("user_id");
        for (const s of sd ?? []) staffSet.add(String(s.user_id));
      } catch (_) { /* table may not exist yet */ }

      // Roster keyed by NORMALISED email + by id, plus the confirmed links.
      const roster = await loadRoster(admin);
      const rosterByNorm: Record<string, any> = {};
      const rosterById: Record<string, any> = {};
      for (const g of roster) {
        rosterById[String(g.id)] = g;
        const ne = normEmail(g.email);
        if (ne) rosterByNorm[ne] = g;
      }
      const links = await loadLinks(admin);

      const members = (data ?? []).map((m: any) => {
        const em = String(m.email ?? "").toLowerCase();
        const st = authByEmail[em];
        // Membership: prefer a confirmed link, else normalised-email match.
        const g = links[String(m.id)] ? rosterById[links[String(m.id)]] : rosterByNorm[normEmail(m.email)];
        return {
          ...m,
          activated: st?.activated ?? false,
          last_sign_in_at: st?.last_sign_in_at ?? null,
          is_staff: staffSet.has(String(m.id)),
          membership: g?.product ?? null,
          membership_status: g?.status ?? null,
          linked: !!links[String(m.id)],
        };
      });
      return json({ members });
    }

    // App members with NO membership resolved (no email match, no link) + name-matched roster candidates.
    if (action === "unlinkedSuggestions") {
      const { data: mem } = await admin.from("members").select("id, email, full_name");
      const roster = await loadRoster(admin);
      const links = await loadLinks(admin);
      const linkedMemberIds = new Set(Object.values(links));

      const rosterByNorm: Record<string, any> = {};
      const rosterByName: Record<string, any[]> = {};
      for (const g of roster) {
        const ne = normEmail(g.email);
        if (ne) rosterByNorm[ne] = g;
        const nn = normName(g.full_name);
        if (nn) (rosterByName[nn] = rosterByName[nn] ?? []).push(g);
      }

      const suggestions: any[] = [];
      for (const m of mem ?? []) {
        if (links[String(m.id)]) continue;                          // already linked
        if (rosterByNorm[normEmail(m.email)]) continue;             // already matches on email
        const nn = normName(m.full_name);
        const candidates = (nn ? (rosterByName[nn] ?? []) : [])
          .filter((g: any) => !linkedMemberIds.has(String(g.id)))    // don't offer a roster row already linked to someone else
          .map((g: any) => ({ member_id: g.id, email: g.email, full_name: g.full_name, product: g.product, status: g.status }));
        // Only surface people we can actually help (have at least one candidate).
        if (candidates.length) suggestions.push({ user: { id: m.id, email: m.email, full_name: m.full_name }, candidates });
      }
      return json({ suggestions, count: suggestions.length });
    }

    if (action === "linkMember") {
      const userId = String(body.userId ?? "");
      const memberId = String(body.memberId ?? "");
      if (!userId || !memberId) return json({ error: "userId and memberId required" }, 400);

      const { error: linkErr } = await admin.from("member_links")
        .upsert({ user_id: userId, member_id: memberId, linked_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (linkErr) throw linkErr;

      // Apply the membership's access (union with what they already have — never remove).
      const { data: g } = await admin.from("gym_members").select("product, status").eq("id", memberId).maybeSingle();
      const { data: mrow } = await admin.from("members").select("allowed_access").eq("id", userId).maybeSingle();
      const current: string[] = Array.isArray(mrow?.allowed_access) ? mrow!.allowed_access : [];
      const merged = Array.from(new Set([...current, ...accessForProduct(g?.product)])).filter((v) => ACCESS_VALUES.includes(v));
      await admin.from("members").update({ allowed_access: merged }).eq("id", userId);

      return json({ ok: true, membership: g?.product ?? null, membership_status: g?.status ?? null, allowed_access: merged });
    }

    if (action === "unlinkMember") {
      const userId = String(body.userId ?? "");
      if (!userId) return json({ error: "userId required" }, 400);
      const { error } = await admin.from("member_links").delete().eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "setStaff") {
      const memberId = String(body.memberId ?? "");
      if (!memberId) return json({ error: "memberId required" }, 400);
      if (body.isStaff) {
        const { error } = await admin.from("staff_users").upsert({ user_id: memberId, note: body.note ?? null }, { onConflict: "user_id" });
        if (error) throw error;
      } else {
        const { error } = await admin.from("staff_users").delete().eq("user_id", memberId);
        if (error) throw error;
      }
      return json({ ok: true });
    }

    if (action === "setOnlineClient") {
      // Mark a member as an ONLINE (remote) client — excluded from gym attendance reports + at-risk.
      const memberId = String(body.memberId ?? "");
      if (!memberId) return json({ error: "memberId required" }, 400);
      const { error } = await admin.from("members")
        .update({ online_client: !!body.value })
        .eq("id", memberId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "setAccess") {
      // A manual coach edit. Set the streams AND flag an override so the GymOS webhook won't
      // recompute (and stomp) this member's access on their next membership event.
      const { error } = await admin.from("members")
        .update({ allowed_access: cleanAccess(body.allowed), access_override: true })
        .eq("id", body.memberId);
      if (error) throw error;
      return json({ ok: true, access_override: true });
    }

    if (action === "clearAccessOverride") {
      // Turn OFF the manual override and snap access back to what their membership grants.
      const memberId = String(body.memberId ?? "");
      if (!memberId) return json({ error: "memberId required" }, 400);
      // Resolve their membership product: confirmed link first, else normalised-email match.
      const links = await loadLinks(admin);
      const roster = await loadRoster(admin);
      const { data: mrow } = await admin.from("members").select("email").eq("id", memberId).maybeSingle();
      let product: any = null;
      const linkedId = links[memberId];
      if (linkedId) product = roster.find((r: any) => String(r.id) === String(linkedId))?.product ?? null;
      if (!product && mrow?.email) {
        const target = normEmail(mrow.email);
        product = roster.find((r: any) => normEmail(r.email) === target)?.product ?? null;
      }
      const derived = accessForProduct(product);
      const { error } = await admin.from("members")
        .update({ allowed_access: derived, access_override: false })
        .eq("id", memberId);
      if (error) throw error;
      return json({ ok: true, access_override: false, allowed_access: derived, membership: product });
    }

    // Resolve the streams a person should get: an explicit override wins, otherwise derive
    // from their membership (gym_members.product, matched by normalised email).
    async function accessFor(email: string, override?: any): Promise<string[]> {
      if (Array.isArray(override) && override.length) return override.filter((v) => ACCESS_VALUES.includes(v));
      const roster = await loadRoster(admin);
      const target = normEmail(email);
      const g = (roster ?? []).find((r: any) => normEmail(r.email) === target);
      return accessForProduct(g?.product);   // membership-type default (base four streams, + Group PT where earned)
    }

    if (action === "invite") {
      const allowed = await accessFor(body.email, body.allowed);
      const r = await inviteOne(admin, body.email, body.name, allowed, redirectTo, ghlWebhook);
      return json(r, r.ok ? 200 : 400);
    }

    if (action === "bulkInvite") {
      const list = Array.isArray(body.members) ? body.members : [];
      const results: any[] = [];
      for (const m of list) {
        const allowed = await accessFor(m.email, m.allowed);
        results.push({ email: m.email, ...(await inviteOne(admin, m.email, m.name, allowed, redirectTo, ghlWebhook)) });
        await new Promise((r) => setTimeout(r, 400));
      }
      return json({ results, invited: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
    }

    if (action === "rosterStatus") {
      // Roster-DRIVEN list: EVERY gym_members row + whether they're on the app yet, so staff can
      // chase people who were imported but haven't joined. (The `list` action is app-user-driven and
      // misses never-signed-up members.) Usage (scans/bookings) is already tracked against gym_members
      // regardless of app account — this just flags app adoption.
      const roster = await loadRoster(admin);
      const authByEmail: Record<string, { exists: boolean; activated: boolean; last_sign_in_at: string | null }> = {};
      try {
        for (let page = 1; page <= 50; page++) {
          const { data: pg } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          const users = pg?.users ?? [];
          for (const u of users) {
            const em = String(u.email ?? "").toLowerCase();
            if (em) authByEmail[em] = { exists: true, activated: !!u.last_sign_in_at, last_sign_in_at: u.last_sign_in_at ?? null };
          }
          if (users.length < 200) break;
        }
      } catch (_) { /* fall back to notInvited */ }
      const links = await loadLinks(admin);                 // keyed user_id -> roster member_id
      const linkedMemberIds = new Set(Object.values(links).map((v: any) => String(v)));
      const linkByMemberId: Record<string, string> = {};    // roster member_id -> app user_id
      for (const [uid, mid] of Object.entries(links)) linkByMemberId[String(mid)] = String(uid);

      // App member rows (so the grid can show/edit access, staff, online-client for people on the app).
      const { data: appMembers } = await admin.from("members")
        .select("id, email, full_name, allowed_access, access_override, online_client, onboarded_at");
      const memberById: Record<string, any> = {};
      const memberByEmail: Record<string, any> = {};
      for (const m of appMembers ?? []) {
        memberById[String(m.id)] = m;
        const ne = normEmail(m.email);
        if (ne) memberByEmail[ne] = m;
      }
      const staffSet = new Set<string>();
      try {
        const { data: sd } = await admin.from("staff_users").select("user_id");
        for (const s of sd ?? []) staffSet.add(String(s.user_id));
      } catch (_) { /* table may not exist yet */ }

      const matchedAppIds = new Set<string>();      // app accounts already shown via a roster row
      const rows = (roster ?? []).map((g: any) => {
        const st = authByEmail[normEmail(g.email)];
        // Resolve the app account for this roster row: confirmed link first, else normalised email.
        const uid = linkByMemberId[String(g.id)];
        const am = (uid ? memberById[uid] : null) ?? memberByEmail[normEmail(g.email)] ?? null;
        if (am) matchedAppIds.add(String(am.id));
        // "On app" = they actually COMPLETED setup (set a password) — tracked via onboarded_at.
        // Clicking an invite link creates a sign-in without finishing, so last_sign_in_at is NOT used.
        const onApp = !!am?.onboarded_at;
        return {
          id: g.id, email: g.email, full_name: g.full_name,
          product: g.product, status: g.status, joined_on: g.joined_on,
          onApp,                                   // completed setup (password set)
          invitedPending: !!st?.exists && !onApp,  // account exists (invited/clicked) but not finished
          notInvited: !st?.exists && !onApp,       // never invited
          last_sign_in_at: st?.last_sign_in_at ?? null,
          // App-account fields for the grid's Access / Staff / Online-client controls:
          user_id: am ? String(am.id) : null,      // the members.id to pass to setAccess/setStaff/etc.
          allowed_access: am?.allowed_access ?? [],
          access_override: am?.access_override ?? false,
          online_client: am?.online_client ?? false,
          is_staff: am ? staffSet.has(String(am.id)) : false,
        };
      });

      // Also include app accounts with NO roster row (staff, online-only clients, anyone not in
      // gym_members) so they're searchable and their access is editable.
      for (const m of appMembers ?? []) {
        if (matchedAppIds.has(String(m.id))) continue;
        const onbo = !!(m as any).onboarded_at;
        rows.push({
          id: `app:${m.id}`, email: m.email, full_name: (m as any).full_name ?? null,
          product: null, status: null, joined_on: null,
          onApp: onbo, invitedPending: !onbo, notInvited: false,
          last_sign_in_at: null,
          user_id: String(m.id),
          allowed_access: m.allowed_access ?? [],
          access_override: m.access_override ?? false,
          online_client: m.online_client ?? false,
          is_staff: staffSet.has(String(m.id)),
        });
      }
      return json({ members: rows, total: rows.length, onApp: rows.filter((r) => r.onApp).length });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e: any) {
    return json({ error: e.message || String(e) }, 500);
  }
});
