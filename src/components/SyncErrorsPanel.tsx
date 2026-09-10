import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ErrorRow = {
  occurred_at: string;
  user_email: string | null;
  action: string;
  table_name: string | null;
  code: string | null;
  message: string | null;
};

export default function SyncErrorsPanel() {
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("error_log")
      .select("occurred_at, user_email, action, table_name, code, message")
      .order("occurred_at", { ascending: false })
      .limit(50);
    setRows((data || []) as ErrorRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const last24h = rows.filter(
    (r) => Date.now() - new Date(r.occurred_at).getTime() < 24 * 60 * 60 * 1000,
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Sync Errors
              {last24h.length > 0 && (
                <Badge variant="destructive">{last24h.length} today</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Recent failed cloud writes across all users (newest first).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors logged.</p>
        ) : (
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {rows.map((r, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-b border-border py-1.5 text-sm"
              >
                <span className="text-xs text-muted-foreground shrink-0 sm:w-32">
                  {new Date(r.occurred_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 sm:w-44 truncate">
                  {r.user_email || "—"}
                </span>
                <span className="font-medium shrink-0 sm:w-40 truncate">
                  {r.action}
                </span>
                {r.table_name && (
                  <span className="text-xs text-muted-foreground shrink-0 sm:w-32 truncate">
                    {r.table_name}
                  </span>
                )}
                {r.code && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {r.code}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {r.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
