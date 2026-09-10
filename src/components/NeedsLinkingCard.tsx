import { useCallback, useEffect, useState } from "react";
import {
  Link2,
  Link2Off,
  Loader2,
  CheckCircle2,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Candidate {
  member_id: string;
  email: string;
  full_name: string;
  product: string | null;
  status: string | null;
}

interface Suggestion {
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  candidates: Candidate[];
}

interface NeedsLinkingCardProps {
  staffSecret: string;
  onLinked?: () => void;
}

export function NeedsLinkingCard({
  staffSecret,
  onLinked,
}: NeedsLinkingCardProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-members",
        {
          body: { action: "unlinkedSuggestions", staffSecret },
        },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const sug = data?.suggestions ?? [];
      setSuggestions(sug);
      setCount(data?.count ?? sug.length);
    } catch (e: any) {
      console.error("unlinkedSuggestions failed", e);
    } finally {
      setLoading(false);
    }
  }, [staffSecret]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLink = async (userId: string, candidate: Candidate) => {
    setLinking(userId);
    try {
      const { data, error } = await supabase.functions.invoke(
        "manage-members",
        {
          body: {
            action: "linkMember",
            userId,
            memberId: candidate.member_id,
            staffSecret,
          },
        },
      );
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Linked to ${candidate.product ?? "membership"}`);

      // Remove this user from the panel
      setSuggestions((prev) => prev.filter((s) => s.user.id !== userId));
      setCount((prev) => Math.max(0, prev - 1));

      // Refresh the member list so the card updates
      onLinked?.();
    } catch (e: any) {
      toast.error(`Failed to link: ${e.message}`);
    } finally {
      setLinking(null);
    }
  };

  const handleSkip = (userId: string) => {
    setSkipped((prev) => new Set(prev).add(userId));
  };

  const visibleSuggestions = suggestions.filter((s) => !skipped.has(s.user.id));

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Needs linking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking for unlinked members…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (count === 0 || visibleSuggestions.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Needs linking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All app members are matched to a membership ✓
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-amber-500" />
          Needs linking
          <Badge
            variant="secondary"
            className="ml-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs"
          >
            {count}
          </Badge>
        </CardTitle>
        <CardDescription>
          App members whose login email doesn't match Quoox. Confirm the right
          roster row to link them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleSuggestions.map((sug) => (
          <div
            key={sug.user.id}
            className="rounded-lg border border-border bg-muted/20 p-3 space-y-3"
          >
            <div className="flex items-start gap-2">
              <UserCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">
                  {sug.user.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {sug.user.email}{" "}
                  <span className="opacity-60">(app login)</span>
                </p>
              </div>
            </div>

            {sug.candidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Suggested match{sug.candidates.length > 1 ? "es" : ""}:
                </p>
                <RadioGroup
                  defaultValue=""
                  className="space-y-2"
                  onValueChange={(val) => {
                    if (!val) return;
                    const c = sug.candidates.find((c) => c.member_id === val);
                    if (c) handleLink(sug.user.id, c);
                  }}
                >
                  {sug.candidates.map((c) => (
                    <div
                      key={c.member_id}
                      className="flex items-center gap-2 rounded-md border border-border/50 bg-background p-2"
                    >
                      <RadioGroupItem
                        value={c.member_id}
                        id={`link-${sug.user.id}-${c.member_id}`}
                        disabled={linking === sug.user.id}
                      />
                      <Label
                        htmlFor={`link-${sug.user.id}-${c.member_id}`}
                        className="flex-1 cursor-pointer text-xs leading-tight"
                      >
                        <span className="font-medium">{c.full_name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {c.email}
                        </span>
                        <span className="ml-1">
                          <Badge
                            variant="secondary"
                            className="ml-1 text-[10px] py-0"
                          >
                            {c.product ?? "—"}
                          </Badge>
                        </span>
                      </Label>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        disabled={linking === sug.user.id}
                        onClick={() => handleLink(sug.user.id, c)}
                      >
                        {linking === sug.user.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => handleSkip(sug.user.id)}
              >
                <Link2Off className="h-3 w-3 mr-1" />
                Not in this list / skip
              </Button>
            </div>
          </div>
        ))}
        {visibleSuggestions.length < suggestions.length && (
          <p className="text-xs text-muted-foreground text-center">
            {suggestions.length - visibleSuggestions.length} skipped this
            session
          </p>
        )}
      </CardContent>
    </Card>
  );
}
