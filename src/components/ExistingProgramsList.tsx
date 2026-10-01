import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Edit,
  Copy,
  Trash2,
  PlayCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { groupProgramsByCategory } from "@/lib/programCategories";

interface Props {
  programs: any[];
  exById: Record<string, any>;
  onEdit: (p: any) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ExistingProgramsList({
  programs,
  exById,
  onEdit,
  onDuplicate,
  onDelete,
}: Props) {
  const grouped = useMemo(() => groupProgramsByCategory(programs), [programs]);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [openProg, setOpenProg] = useState<string | null>(null);

  const toggleCat = (cat: string) =>
    setOpenCats((s) => ({ ...s, [cat]: !s[cat] }));

  return (
    <div className="space-y-4">
      {grouped.length === 0 && (
        <p className="text-sm text-muted-foreground">No programs yet.</p>
      )}
      {grouped.map(({ category, items }) => {
        const open = openCats[category] !== false; // open by default
        return (
          <section key={category} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleCat(category)}
              className="flex w-full items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-left hover:bg-muted"
            >
              <span className="font-heading tracking-wider text-sm">
                {category.toUpperCase()}{" "}
                <span className="text-muted-foreground">({items.length})</span>
              </span>
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {open && (
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((p) => {
                  const isOpen = openProg === p.id;
                  return (
                    <Card key={p.id} className="bg-muted/50 border-border">
                      <div className="flex items-start justify-between p-4 pb-2">
                        <button
                          type="button"
                          onClick={() => setOpenProg(isOpen ? null : p.id)}
                          className="flex-1 text-left"
                        >
                          <h3 className="font-semibold leading-tight">
                            {p.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {p.weeks && p.daysPerWeek
                              ? `${p.weeks} Weeks · ${p.daysPerWeek} Days/Week`
                              : p.description || ""}
                          </p>
                        </button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(p);
                            }}
                            title="Edit Program"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(p.id);
                            }}
                            title="Duplicate Program"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(p.id);
                            }}
                            title="Delete Program"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => setOpenProg(isOpen ? null : p.id)}
                          >
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {isOpen && (
                        <CardContent>
                          <div className="text-sm text-muted-foreground mt-2">
                            {p.weeks && p.daysPerWeek ? (
                              <div className="space-y-4">
                                <p>
                                  {p.weeks} Weeks • {p.daysPerWeek} Days/Week
                                </p>
                                {p.workouts &&
                                  p.workouts.length > 0 &&
                                  (() => {
                                    const byWeek: Record<
                                      number,
                                      { w: any; idx: number }[]
                                    > = {};
                                    p.workouts.forEach(
                                      (w: any, idx: number) => {
                                        const wk = w.week || 1;
                                        (byWeek[wk] ||= []).push({ w, idx });
                                      },
                                    );
                                    const weeks = Object.keys(byWeek)
                                      .map(Number)
                                      .sort((a, b) => a - b);
                                    const tvWeekLabel = (wk: number) => {
                                      const n = p.weekNotes?.[wk];
                                      if (n?.label?.trim())
                                        return n.label.trim();
                                      if (n?.start_date)
                                        return `W/C ${new Date(
                                          n.start_date + "T00:00:00",
                                        ).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                        })}`;
                                      return `Week ${wk}`;
                                    };
                                    return (
                                      <div className="space-y-2">
                                        <Label className="text-xs uppercase text-muted-foreground">
                                          Workouts (TV Display)
                                        </Label>
                                        <Accordion
                                          type="multiple"
                                          className="w-full"
                                        >
                                          {weeks.map((wk) => (
                                            <AccordionItem
                                              key={wk}
                                              value={`tvwk-${wk}`}
                                            >
                                              <AccordionTrigger className="text-sm font-bold">
                                                {tvWeekLabel(wk)}
                                              </AccordionTrigger>
                                              <AccordionContent>
                                                <div className="grid grid-cols-2 gap-2">
                                                  {byWeek[wk]
                                                    .sort(
                                                      (a, b) =>
                                                        (a.w.day || 0) -
                                                        (b.w.day || 0),
                                                    )
                                                    .map(({ w, idx }) => (
                                                      <Button
                                                        key={idx}
                                                        variant="outline"
                                                        size="sm"
                                                        className="justify-start gap-2 h-auto py-2"
                                                        onClick={() =>
                                                          window.open(
                                                            `/tv/${p.id}/${idx}`,
                                                            "_blank",
                                                          )
                                                        }
                                                      >
                                                        <PlayCircle className="h-4 w-4 shrink-0 text-primary" />
                                                        <span className="truncate">
                                                          {w.name}
                                                        </span>
                                                      </Button>
                                                    ))}
                                                </div>
                                              </AccordionContent>
                                            </AccordionItem>
                                          ))}
                                        </Accordion>
                                      </div>
                                    );
                                  })()}
                              </div>
                            ) : (
                              <ul className="list-disc list-inside">
                                {p.exercises?.map((ex: any, i: number) => {
                                  if (ex.isSection)
                                    return (
                                      <li
                                        key={i}
                                        className="font-bold mt-2 list-none"
                                      >
                                        {ex.name}
                                      </li>
                                    );
                                  const exerciseName =
                                    exById[String(ex.name)]?.name || ex.name;
                                  return (
                                    <li key={i}>
                                      {exerciseName} - {ex.sets}x{ex.reps}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
