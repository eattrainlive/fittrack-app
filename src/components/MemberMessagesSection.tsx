import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle, Send, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getMemberMessages,
  ghlConversationUrl,
  latestThreadIds,
  waWindowStatus,
  sendWhatsAppReply,
  type MemberMessage,
} from "@/lib/memberMessages";

const fmtMsgTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

function MessageBubble({ m }: { m: MemberMessage }) {
  const out = m.direction === "out";
  const channelLabel = m.channel === "sms" ? "SMS" : "WhatsApp";
  const chipCls = out ? "bg-primary-foreground/15" : "bg-background";
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
          out
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] opacity-80">
          <span className={`rounded-full px-1.5 py-0.5 font-medium ${chipCls}`}>
            {channelLabel}
          </span>
          {out && m.template_key && (
            <span
              className={`rounded-full px-1.5 py-0.5 font-medium ${chipCls}`}
            >
              template
            </span>
          )}
          {out && String(m.status || "").toLowerCase() === "failed" && (
            <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 font-medium text-white">
              failed
            </span>
          )}
          <span>{fmtMsgTime(m.occurred_at)}</span>
        </div>
      </div>
    </div>
  );
}

/** WhatsApp/SMS thread for the staff activity modal. Reply free-text in-app when
 *  inside WhatsApp's 24h window; outside it, send an approved template in GHL. */
export function MemberMessagesSection({ email }: { email: string }) {
  const [msgs, setMsgs] = useState<MemberMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resending, setResending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!email) {
      setMsgs([]);
      return;
    }
    try {
      const list = await getMemberMessages(email);
      setMsgs(list);
    } catch (e) {
      console.warn("Member messages fetch failed", e);
    }
  }, [email]);

  useEffect(() => {
    if (!email) {
      setMsgs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMsgs([]);
    let cancelled = false;
    (async () => {
      try {
        const list = await getMemberMessages(email);
        if (!cancelled) setMsgs(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  const { contactId } = latestThreadIds(msgs);
  const win = waWindowStatus(msgs);
  const replyHref = ghlConversationUrl(latestThreadIds(msgs));
  // Reply on the channel the member last used. SMS has no 24-hour window, so a
  // free-text reply is always allowed there; WhatsApp is gated on the window.
  const lastChannel = msgs.length ? msgs[msgs.length - 1].channel : "whatsapp";
  const isSms = String(lastChannel).toLowerCase() === "sms";
  const canSendInApp = !!contactId && (isSms || win.open);

  // A WhatsApp reply that GHL later reported as failed to deliver. We only prompt
  // when it's the LAST outbound message (so once we resend, the prompt clears).
  const lastOut = [...msgs].reverse().find((m) => m.direction === "out");
  const failedWa =
    lastOut &&
    String(lastOut.status || "").toLowerCase() === "failed" &&
    String(lastOut.channel || "").toLowerCase() !== "sms"
      ? lastOut
      : null;

  const resendAsSms = async () => {
    if (!failedWa?.body || !contactId) return;
    setResending(true);
    const r = await sendWhatsAppReply({
      email,
      contactId,
      message: failedWa.body,
      channel: "sms",
    });
    setResending(false);
    if (r.ok) {
      toast.success("Resent by SMS ✓");
      refresh();
    } else {
      toast.error(r.error || "Couldn't resend — try again");
    }
  };

  const handleSend = async () => {
    const body = reply.trim();
    if (!body || !contactId) return;
    setSending(true);
    const r = await sendWhatsAppReply({
      email,
      contactId,
      message: body,
      channel: isSms ? "sms" : "whatsapp",
    });
    setSending(false);
    if (r.ok) {
      setReply("");
      if (r.fellBack)
        toast.success("WhatsApp unavailable — sent by SMS instead");
      else toast.success("Sent ✓");
      refresh();
    } else {
      toast.error(r.error || "Couldn't send — try again");
    }
  };

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3 w-3" /> Messages
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
        </div>
      ) : (
        <div className="space-y-2">
          {msgs.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
              No messages yet.
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
              {msgs.map((m, i) => (
                <MessageBubble key={m.id || i} m={m} />
              ))}
              <div ref={endRef} />
            </div>
          )}

          {/* WhatsApp delivery failed → offer a one-tap SMS resend */}
          {failedWa && (
            <div className="space-y-1.5 rounded-lg border border-red-300/60 bg-red-50 p-2.5 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                WhatsApp didn't deliver
              </p>
              <p className="text-[11px] text-muted-foreground">
                Your last message didn't reach them on WhatsApp. Resend it as an
                SMS?
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={resendAsSms}
                disabled={resending || !contactId}
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-1 h-3.5 w-3.5" /> Resend as SMS
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Reply box — in-app when the 24h window is open, else GHL template */}
          {canSendInApp ? (
            <div className="space-y-1.5">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={isSms ? "Reply by SMS…" : "Reply on WhatsApp…"}
                rows={2}
                disabled={sending}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-500">
                  <Clock className="h-3 w-3" />
                  {isSms
                    ? "SMS — no time limit"
                    : win.hoursLeft != null && win.hoursLeft < 1
                      ? "Window closes within the hour"
                      : `~${Math.floor(win.hoursLeft ?? 0)}h left to reply freely`}
                </span>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !reply.trim()}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-1 h-3.5 w-3.5" /> Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-amber-300/60 bg-amber-50 p-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {!contactId
                  ? "No WhatsApp contact linked yet"
                  : "Outside WhatsApp's 24-hour window"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {!contactId
                  ? "They need to message first so we can reply in-app."
                  : "Free replies are paused until they message again. Send an approved template from GoHighLevel to re-open the chat."}
              </p>
              <a
                href={replyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                Open conversation in GoHighLevel ↗
              </a>
            </div>
          )}

          {/* always-available escape hatch to the full CRM thread */}
          {canSendInApp && (
            <a
              href={replyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Open in GoHighLevel ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
