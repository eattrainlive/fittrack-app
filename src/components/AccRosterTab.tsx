import { useState } from "react";
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
import { UserPlus, Trash2, Check, Loader2, Video, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  enrolClient,
  removeClient,
  assignCoach,
  setOnboardingComplete,
  setNutritionApproach,
  setCohortCall,
  onboardingStatus,
  ONBOARDING_ITEM_SHORT_LABELS,
  currentWeekOf,
  type AccCohort,
  type AccClient,
} from "@/lib/accountabilityProgramme";
import {
  getClientCheckins,
  type AccCheckin,
} from "@/lib/accountabilityCheckins";
import { OnboardingSummary, CheckinSummary } from "./AccountabilityCoachPanel";

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

export function AccRosterTab({
  cohort,
  clients,
  staff,
  appMembers,
  reload,
}: {
  cohort: AccCohort;
  clients: AccClient[];
  staff: StaffMember[];
  appMembers: AppMember[];
  reload: () => void;
}) {
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coachFilter, setCoachFilter] = useState("all");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  // Live-call link editor (cohort-level: acc_cohorts.call_url / call_label)
  const [callUrl, setCallUrl] = useState(cohort.call_url || "");
  const [callLabel, setCallLabel] = useState(
    cohort.call_label || "Wednesdays 12:00",
  );
  const [callOpen, setCallOpen] = useState(false);
  const [callSaving, setCallSaving] = useState(false);

  const handleSaveCall = async () => {
    setCallSaving(true);
    const { error } = await setCohortCall(cohort.id, {
      call_url: callUrl.trim() || null,
      call_label: callLabel.trim() || null,
    });
    setCallSaving(false);
    if (error) {
      toast.error("Couldn't save call link");
      return;
    }
    toast.success("Live call link saved");
    setCallOpen(false);
    reload();
  };

  const enrolledIds = new Set(clients.map((c) => c.user_id));
  const availableMembers = appMembers.filter(
    (m) =>
      !enrolledIds.has(m.id) &&
      (m.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  const handleEnrol = async (m: AppMember) => {
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
    reload();
  };

  const handleRemove = async (c: AccClient) => {
    if (!confirm("Remove this client from the cohort?")) return;
    const { error } = await removeClient(c.id);
    if (error) toast.error("Couldn't remove");
    else {
      toast.success("Client removed");
      reload();
    }
  };

  const handleAssign = async (clientId: string, coachId: string) => {
    const val = coachId === "none" ? null : coachId;
    const { error } = await assignCoach(clientId, val);
    if (error) toast.error("Couldn't assign coach");
    else reload();
  };

  const handleOnboarding = async (c: AccClient) => {
    // Manual override: set BOTH onboarding_done and onboarding_completed_at
    // (or clear both) so the manual flag and the 5-item rule stay in sync.
    const markDone = !c.onboarding_done;
    const { error } = await setOnboardingComplete(c.id, markDone);
    if (error) toast.error("Couldn't update");
    else reload();
  };

  const handleApproach = async (clientId: string, approach: string) => {
    const { error } = await setNutritionApproach(clientId, approach);
    if (error) toast.error("Couldn't save approach");
    else {
      toast.success("Approach updated");
      reload();
    }
  };

  const memberName = (uid: string) =>
    appMembers.find((m) => m.id === uid)?.full_name ||
    appMembers.find((m) => m.id === uid)?.email ||
    "Member";

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

  let filtered = clients;
  if (coachFilter !== "all") {
    filtered = filtered.filter(
      (c) =>
        (coachFilter === "none" && !c.coach_user_id) ||
        c.coach_user_id === coachFilter,
    );
  }
  if (incompleteOnly) {
    filtered = filtered.filter((c) => !c.onboarding_completed_at);
  }

  return (
    <>
      {/* Cohort header */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border p-6 pb-4">
          <div>
            <h3 className="font-heading text-2xl tracking-wider">
              {cohort.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Starts {formatDate(cohort.start_date)} · {cohort.weeks} weeks
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {weekLabel}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-6 pt-4">
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
            <Button
              variant={incompleteOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setIncompleteOnly((v) => !v)}
              className="h-9"
            >
              Onboarding incomplete
            </Button>
          </div>
          <Badge variant="outline">{clients.length} enrolled</Badge>

          {/* Live call link (cohort-level) */}
          <Popover open={callOpen} onOpenChange={setCallOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Video className="h-4 w-4" />
                {cohort.call_url ? "Edit live call" : "Set live call"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Live call label</Label>
                  <Input
                    className="mt-1 h-9"
                    value={callLabel}
                    onChange={(e) => setCallLabel(e.target.value)}
                    placeholder="Wednesdays 12:00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Zoom / call URL</Label>
                  <Input
                    className="mt-1 h-9"
                    value={callUrl}
                    onChange={(e) => setCallUrl(e.target.value)}
                    placeholder="https://zoom.us/j/…"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCallOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveCall}
                    disabled={callSaving}
                    className="gap-1.5"
                  >
                    {callSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Roster */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-6 pb-3">
          <h3 className="text-lg font-semibold">Client roster</h3>
        </div>
        <div className="p-6 pt-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No clients in this view yet. Enrol members above.
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const status = onboardingStatus(c);
                return (
                  <div
                    key={c.id}
                    className="flex flex-col md:flex-row md:items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {memberName(c.user_id)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {/* Onboarding status: x/5 + missing chips */}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            status.complete
                              ? "border-primary/40 text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {status.complete ? (
                            <>
                              <Check className="w-3 h-3 mr-1" /> Onboarded
                            </>
                          ) : (
                            <>Onboarding {status.done}/5</>
                          )}
                        </Badge>
                        {!status.complete &&
                          status.missing.map((m) => (
                            <span
                              key={m}
                              className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-500"
                            >
                              {ONBOARDING_ITEM_SHORT_LABELS[m] || m}
                            </span>
                          ))}
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
                      <Select
                        value={c.nutrition_approach || "plate"}
                        onValueChange={(v) => handleApproach(c.id, v)}
                      >
                        <SelectTrigger className="w-40 h-9">
                          <SelectValue placeholder="Approach" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plate">Plate</SelectItem>
                          <SelectItem value="tracking">Tracking</SelectItem>
                        </SelectContent>
                      </Select>
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AccRosterTab;
