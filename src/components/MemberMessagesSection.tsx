import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import {
  getMemberMessages,
  ghlConversationUrl,
  latestThreadIds,
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
          <span>{fmtMsgTime(m.occurred_at)}</span>
        </div>
      </div>
    </div>
  );
}

/** Read-only WhatsApp/SMS thread for the staff activity modal. Replies go
 *  through the CRM deep-link — no send box here. */
export function MemberMessagesSection({ email }: { email: string }) {
  const [msgs, setMsgs] = useState<MemberMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

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
      } catch (e) {
        console.warn("Member messages fetch failed", e);
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

  const replyHref = ghlConversationUrl(latestThreadIds(msgs));

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3 w-3" /> Messages
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading messages…
        </div>
      ) : !msgs.length ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
          No messages yet.
          <div className="mt-2">
            <a
              href={replyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Open conversation to reply ↗
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
            {msgs.map((m, i) => (
              <MessageBubble key={i} m={m} />
            ))}
            <div ref={endRef} />
          </div>
          <a
            href={replyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Open conversation to reply ↗
          </a>
        </div>
      )}
    </div>
  );
}
