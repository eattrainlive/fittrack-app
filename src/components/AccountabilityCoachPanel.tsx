import { useEffect, useState, useCallback } from "react";
import { WeekContentEditor } from "@/components/WeekContentEditor";
import { AccountabilityCheckinInbox } from "@/components/AccountabilityCheckinInbox";
import { AccountabilityPreview } from "@/components/AccountabilityPreview";
import { BookOpen, Users, Inbox, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Loader2,
  UserPlus,
  Trash2,
  Check,
  ChevronsUpDown,
  ClipboardList,
} from "lucide-react";
import {
  getClientCheckins,
  type AccCheckin,
} from "@/lib/accountabilityCheckins";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  getActiveCohort,
  getCohortClients,
  enrolClient,
  removeClient,
  assignCoach,
  setOnboardingDone,
  setNutritionApproach,
  currentWeekOf,
  type AccCohort,
  type AccClient,
} from "@/lib/accountabilityProgramme";

interface StaffMember {
  user_id: string;
  email: string;
  name: string;
}

interface AppMember {
  id: string;
  email: string;
  full_name?: string;
}

/** Compact onboarding summary for the coach roster. */
function OnboardingSummary({ c }: { c: AccClient }) {
  const [open, setOpen] = useState(false);
  if (!c.onboarding_done) return null;
  const b = (c.baseline as any) || {};
  const o = (c.onboarding as Record<string, any>) || {};
  const photos: string[] = b.photos || [];

  return (
    <div className="w-full mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-primary font-medium flex items-center gap-1"
      >
        {open ? "Hide" : "View"} onboarding summary
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
          {c.why && (
            <div>
              <p className="font-semibold text-foreground">Their why</p>
              <p className="text-muted-foreground italic">"{c.why}"</p>
            </div>
          )}
          {c.events && (
            <p>
              <span className="font-semibold text-foreground">Event:</span>{" "}
              <span className="text-muted-foreground">{c.events}</span>
            </p>
          )}
          {c.derailers && (
            <p>
              <span className="font-semibold text-foreground">Derailers:</span>{" "}
              <span className="text-muted-foreground">{c.derailers}</span>
            </p>
          )}
          {(b.weight || b.waist || b.bodyFat) && (
            <div>
              <p className="font-semibold text-foreground">Baseline</p>
              <p className="text-muted-foreground">
                {[
                  b.weight && `${b.weight} kg`,
                  b.height && `Ht ${b.height}`,
                  b.chest && `Chest ${b.chest}`,
                  b.waist && `Waist ${b.waist}`,
                  b.bodyFat && `BF ${b.bodyFat}%`,
                  b.thigh && `Thigh ${b.thigh}`,
                  b.tummy && `Tummy ${b.tummy}`,
                  b.steps && `${b.steps} steps`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          )}
          {photos.length > 0 && (
            <div className="flex gap-2">
              {photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`baseline ${i + 1}`}
                  className="w-14 h-14 object-cover rounded-md border border-border"
                />
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {c.nutrition_approach && (
              <p>
                <span className="font-semibold text-foreground">Approach:</span>{" "}
                <span className="text-muted-foreground capitalize">
                  {c.nutrition_approach}
                </span>
              </p>
            )}
            {c.accountability_style && (
              <p>
                <span className="font-semibold text-foreground">
                  Accountability:
                </span>{" "}
                <span className="text-muted-foreground">
                  {c.accountability_style}
                </span>
              </p>
            )}
            {c.checkin_pref && (
              <p>
                <span className="font-semibold text-foreground">Check-in:</span>{" "}
                <span className="text-muted-foreground">{c.checkin_pref}</span>
              </p>
            )}
            {c.step_target && (
              <p>
                <span className="font-semibold text-foreground">
                  Step target:
                </span>{" "}
                <span className="text-muted-foreground">
                  {c.step_target}/day
                </span>
              </p>
            )}
          </div>
          {o.q5 && (
            <p>
              <span className="font-semibold text-foreground">Motivation:</span>{" "}
              <span className="text-muted-foreground">{o.q5}/5</span>
            </p>
          )}
          {o.q42 && (
            <p>
              <span className="font-semibold text-foreground">Note:</span>{" "}
              <span className="text-muted-foreground">{o.q42}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact check-in summary for the coach roster. */
function CheckinSummary({ c }: { c: AccClient }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AccCheckin[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setRows(await getClientCheckins(c.id));
    setLoaded(true);
  };

  return (
    <div className="w-full mt-2">
      <button
        onClick={() => {
          load();
          setOpen((v) => !v);
        }}
        className="text-xs text-primary font-medium flex items-center gap-1"
      >
        <ClipboardList className="w-3 h-3" />
        {open ? "Hide" : "View"} check-ins
        {loaded && rows.length > 0 && (
          <span className="text-muted-foreground">({rows.length})</span>
        )}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">No check-ins submitted yet.</p>
          ) : (
            rows.map((r) => {
              const r0 = r.responses || {};
              const isFinal = r.week_number === 6;
              return (
                <div
                  key={r.id}
                  className="border-b border-border last:border-0 pb-2 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {isFinal ? "Final review" : `Week ${r.week_number}`}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(r.submitted_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  {!isFinal && r0.q1 != null && (
                    <p className="text-muted-foreground">
                      Overall: {r0.q1}/5 · Win: {r0.q3 || "—"}
                    </p>
                  )}
                  {isFinal && (
                    <div className="space-y-0.5">
                      {r0.q15 != null && (
                        <p className="text-muted-foreground">
                          Programme rating: {r0.q15}/5
                        </p>
                      )}
                      {r0.q19 != null && (
                        <p className="text-muted-foreground">
                          NPS: {r0.q19}/10
                        </p>
                      )}
                      {r0.q22 && (
                        <p className="text-muted-foreground">
                          Re-sign: {r0.q22}
                        </p>
                      )}
                      {r0.maintenance_tier && (
                        <p className="text-muted-foreground">
                          Maintenance: {r0.maintenance_tier}
                        </p>
                      )}
                      {r0.q20 && (
                        <p className="text-muted-foreground">
                          Photo consent: {r0.q20}
                        </p>
                      )}
                      {r0.q21 && (
                        <p className="text-muted-foreground">
                          Testimonial consent: {r0.q21}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const formatDate = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function AccountabilityCoachPanel() {
  const [cohort, setCohort] = useState<AccCohort | null>(null);
  const [clients, setClients] = useState<AccClient[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [appMembers, setAppMembers] = useState<AppMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coachFilter, setCoachFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"roster" | "content" | "checkins" | "preview">(
    "roster",
  );

  const load = useCallback(async () => {
    setLoading(true);
    const c = await getActiveCohort();
    setCohort(c);
    if (c) {
      const [cs, { data: staffRows }] = await Promise.all([
        getCohortClients(c.id),
        supabase.from("staff_users").select("user_id, email"),
      ]);
      setClients(cs);
      // Resolve staff names from auth metadata via members list
      const staffRows2 = (staffRows as any[]) ?? [];
      const staffWithEmails = staffRows2.map((s) => ({
        user_id: s.user_id,
        email: s.email || "",
        name: s.email?.split("@")[0] || "Coach",
      }));
      // Try to enrich names from members table
      if (staffWithEmails.length) {
        const ids = staffWithEmails.map((s) => s.user_id);
        const { data: memberRows } = await supabase
          .from("members")
          .select("id, email, full_name")
          .in("id", ids);
        const byId = new Map<string, any>(
          (memberRows ?? []).map((m: any) => [m.id, m]),
        );
        setStaff(
          staffWithEmails.map((s) => ({
            ...s,
            name:
              byId.get(s.user_id)?.full_name ||
              byId.get(s.user_id)?.email?.split("@")[0] ||
              s.name,
          })),
        );
      } else {
        setStaff(staffWithEmails);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load app members for the enrol picker (staff can read members).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("members")
        .select("id, email, full_name")
        .order("email", { ascending: true });
      setAppMembers((data as AppMember[]) ?? []);
    })();
  }, []);

  const enrolledIds = new Set(clients.map((c) => c.user_id));
  const availableMembers = appMembers.filter(
    (m) =>
      !enrolledIds.has(m.id) &&
      (m.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleEnrol = async (m: AppMember) => {
    if (!cohort) return;
    setBusy(true);
    const { error } = await enrolClient(cohort.id, m.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't enrol: " + (error.message || "error"));
      return;
    }
    toast.success(`${m.full_name || m.email} enrolled`);
    setPickerOpen(false);
    setSearch("");
    load();
  };

  const handleRemove = async (c: AccClient) => {
    if (!confirm("Remove this client from the cohort?")) return;
    const { error } = await removeClient(c.id);
    if (error) toast.error("Couldn't remove");
    else {
      toast.success("Client removed");
      load();
    }
  };

  const handleAssign = async (clientId: string, coachId: string) => {
    const val = coachId === "none" ? null : coachId;
    const { error } = await assignCoach(clientId, val);
    if (error) toast.error("Couldn't assign coach");
    else load();
  };

  const handleOnboarding = async (c: AccClient) => {
    const { error } = await setOnboardingDone(c.id, !c.onboarding_done);
    if (error) toast.error("Couldn't update");
    else load();
  };

  const handleApproach = async (clientId: string, approach: string) => {
    const { error } = await setNutritionApproach(clientId, approach);
    if (error) toast.error("Couldn't save approach");
  };

  const staffName = (uid: string | null) =>
    uid ? staff.find((s) => s.user_id === uid)?.name || "Coach" : "Unassigned";

  const memberName = (uid: string) =>
    appMembers.find((m) => m.id === uid)?.full_name ||
    appMembers.find((m) => m.id === uid)?.email ||
    "Member";

  const filteredClients =
    coachFilter === "all"
      ? clients
      : clients.filter(
          (c) =>
            (coachFilter === "none" && !c.coach_user_id) ||
            c.coach_user_id === coachFilter,
        );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!cohort) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No accountability cohort found. Run accountability_schema.sql to seed
          one.
        </CardContent>
      </Card>
    );
  }

  const week = currentWeekOf(cohort.start_date, cohort.weeks);
  const weekLabel =
    week === 0
      ? `Starts in ${Math.max(
          0,
          Math.ceil(
            (new Date(cohort.start_date + "T00:00:00").getTime() - Date.now()) /
              86400000,
          ),
        )} days`
      : week > cohort.weeks
        ? "Complete"
        : `Week ${week} of ${cohort.weeks}`;

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={tab === "roster" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("roster")}
          className="gap-1.5"
        >
          <Users className="w-4 h-4" /> Roster
        </Button>
        <Button
          variant={tab === "checkins" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("checkins")}
          className="gap-1.5"
        >
          <Inbox className="w-4 h-4" /> Check-ins
        </Button>
        <Button
          variant={tab === "content" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("content")}
          className="gap-1.5"
        >
          <BookOpen className="w-4 h-4" /> Programme content
        </Button>
        <Button
          variant={tab === "preview" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("preview")}
          className="gap-1.5"
        >
          <Eye className="w-4 h-4" /> Preview dashboard
        </Button>
      </div>

      {tab === "content" && <WeekContentEditor />}

      {tab === "checkins" && <AccountabilityCheckinInbox />}

      {tab === "preview" && <AccountabilityPreview />}

      {tab === "roster" && (
        <>
          {/* Cohort header */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-heading text-2xl tracking-wider">
                    {cohort.name}
                  </CardTitle>
                  <CardDescription>
                    Starts {formatDate(cohort.start_date)} · {cohort.weeks}{" "}
                    weeks
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {weekLabel}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" /> Enrol client
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search members by email…"
                      value={search}
                      onValueChange={setSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {busy ? "Enrolling…" : "No members found"}
                      </CommandEmpty>
                      <CommandGroup>
                        {availableMembers.slice(0, 50).map((m) => (
                          <CommandItem
                            key={m.id}
                            value={m.id}
                            onSelect={() => handleEnrol(m)}
                          >
                            <div className="flex flex-col">
                              <span>{m.full_name || m.email}</span>
                              {m.full_name && (
                                <span className="text-xs text-muted-foreground">
                                  {m.email}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Filter:</Label>
                <Select value={coachFilter} onValueChange={setCoachFilter}>
                  <SelectTrigger className="w-48 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline">{clients.length} enrolled</Badge>
            </CardContent>
          </Card>

          {/* Roster */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Client roster</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredClients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No clients in this view yet. Enrol members above.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredClients.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {memberName(c.user_id)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {c.onboarding_done ? (
                            <Badge className="bg-primary/15 text-primary border-0 text-xs">
                              <Check className="w-3 h-3 mr-1" /> Onboarded
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              Onboarding pending
                            </Badge>
                          )}
                          {c.nutrition_approach && (
                            <Badge variant="outline" className="text-xs">
                              {c.nutrition_approach}
                            </Badge>
                          )}
                        </div>
                        <OnboardingSummary c={c} />
                        <CheckinSummary c={c} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          placeholder="Nutrition approach"
                          defaultValue={c.nutrition_approach || ""}
                          onBlur={(e) => handleApproach(c.id, e.target.value)}
                          className="w-40 h-9"
                        />
                        <Select
                          value={c.coach_user_id || "none"}
                          onValueChange={(v) => handleAssign(c.id, v)}
                        >
                          <SelectTrigger className="w-40 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {staff.map((s) => (
                              <SelectItem key={s.user_id} value={s.user_id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOnboarding(c)}
                        >
                          {c.onboarding_done ? "Undo" : "Onboarded"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(c)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
