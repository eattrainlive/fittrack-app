import { supabase } from "./supabase";

export type ErgMachine = "bike" | "rower" | "ski";

export const ERG_MACHINES: {
  key: ErgMachine;
  label: string;
  target: number;
}[] = [
  { key: "bike", label: "Bike Erg", target: 2_000_000 },
  { key: "rower", label: "Rower", target: 1_000_000 },
  { key: "ski", label: "Ski Erg", target: 1_000_000 },
];

export const ERG_MACHINE_LABELS: Record<ErgMachine, string> = {
  bike: "Bike Erg",
  rower: "Rower",
  ski: "Ski Erg",
};

// Challenge deadline — Christmas. (Change here if the window moves.)
export const ERG_DEADLINE = "2026-12-25";

export interface ErgRow {
  machine: ErgMachine;
  total_metres: number;
  my_metres: number;
}

export const getErgSummary = async (): Promise<ErgRow[]> => {
  const { data, error } = await supabase.rpc("erg_challenge_summary");
  if (error) {
    console.error("erg_challenge_summary", error);
    return [];
  }
  return (data ?? []) as ErgRow[];
};

/** Map a raw summary into a lookup by machine, filling any missing machines with zeros. */
export const ergSummaryMap = (rows: ErgRow[]): Record<ErgMachine, ErgRow> => {
  const out: Record<ErgMachine, ErgRow> = {
    bike: { machine: "bike", total_metres: 0, my_metres: 0 },
    rower: { machine: "rower", total_metres: 0, my_metres: 0 },
    ski: { machine: "ski", total_metres: 0, my_metres: 0 },
  };
  for (const r of rows) out[r.machine] = r;
  return out;
};

export const logErgMetres = async (machine: ErgMachine, metres: number) => {
  // member_id defaults to auth.uid() in the DB.
  return await supabase.from("erg_challenge_logs").insert({ machine, metres });
};

export interface MyErgLog {
  id: string;
  machine: ErgMachine;
  metres: number;
  source?: string | null;
  source_ref?: string | null;
  created_at: string;
}

export const getMyErgLogs = async (): Promise<MyErgLog[]> => {
  const { data } = await supabase
    .from("erg_challenge_logs")
    .select("id, machine, metres, source, source_ref, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as MyErgLog[];
};

export const deleteErgLog = async (id: string) =>
  await supabase.from("erg_challenge_logs").delete().eq("id", id);

export const daysLeft = (): number => {
  const end = new Date(ERG_DEADLINE + "T23:59:59");
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
};

// ── Phase 2: auto-count erg metres from saved workouts ───────────────────────

// Exact-name map — ONLY the three challenge ergs (not air bike / treadmill,
// which the generic MACHINE_RE in warmupHelpers also matches).
const ERG_NAME_TO_MACHINE: Record<string, ErgMachine> = {
  "bike erg": "bike",
  rower: "rower",
  "ski erg": "ski",
};

/** Best-effort: mirror a saved workout's erg distance into the challenge. */
export async function syncWorkoutErgMetres(workout: any): Promise<void> {
  try {
    if (!workout?.exercises) return;
    const perMachine: Partial<Record<ErgMachine, number>> = {};
    for (const ex of workout.exercises as any[]) {
      const key =
        ERG_NAME_TO_MACHINE[
          String(ex?.name || "")
            .trim()
            .toLowerCase()
        ];
      if (!key) continue;
      // Sum distance across the exercise's sets, converting to metres by unit.
      let m = 0;
      const sets: any[] = Array.isArray(ex?.setsData)
        ? ex.setsData
        : Array.isArray(ex?.sets)
          ? ex.sets
          : ex?.setsData && Array.isArray(ex.setsData)
            ? ex.setsData
            : [];
      for (const s of sets) {
        const d = Number(s?.distance) || 0;
        if (d <= 0) continue;
        const unit = String(
          s?.distanceUnit ?? ex?.distanceUnit ?? "m",
        ).toLowerCase();
        m += unit.startsWith("k") ? d * 1000 : d; // km -> m, else metres
      }
      if (m > 0) perMachine[key] = (perMachine[key] || 0) + Math.round(m);
    }
    for (const [machine, metres] of Object.entries(perMachine)) {
      const capped = Math.min(100000, metres as number); // match the DB cap
      await supabase.from("erg_challenge_logs").upsert(
        {
          machine,
          metres: capped,
          source: "workout",
          source_ref: `${workout.id}:${machine}`,
        },
        { onConflict: "source_ref" },
      );
    }
  } catch (e) {
    console.error("syncWorkoutErgMetres", e);
  }
}
