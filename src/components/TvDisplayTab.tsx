/**
 * TV Display tab + preset editor dialog — extracted from Admin.tsx.
 * Self-contained: manages its own preset state (localStorage-backed).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, PlayCircle, Edit } from "lucide-react";

const DEFAULT_PRESET = {
  id: "default",
  name: "Default Preset",
  layout: {
    orientation: "landscape",
    showRest: true,
    showHeaders: true,
    showDuration: true,
    showWeek: true,
    showNumbers: true,
  },
  colors: {
    background: "#000000",
    blockBackground: "#1a1a1a",
    opacity: 100,
  },
  typography: { fontSize: "medium" },
  media: { url: "", type: "image" },
};

export const TvDisplayTab = ({ programs }: { programs: any[] }) => {
  const [displayPresets, setDisplayPresets] = useState<any[]>(() => {
    const saved = localStorage.getItem("fittrack_display_presets");
    return saved ? JSON.parse(saved) : [DEFAULT_PRESET];
  });
  const [selectedPresetId, setSelectedPresetId] = useState("default");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [selectedDisplayProgramId, setSelectedDisplayProgramId] =
    useState<string>("");
  const [selectedDisplayWorkoutId, setSelectedDisplayWorkoutId] =
    useState<string>("");

  const savePresets = (presets: any[]) => {
    setDisplayPresets(presets);
    localStorage.setItem("fittrack_display_presets", JSON.stringify(presets));
  };

  return (
    <>
      <TabsContentWrapper>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>TV Display Settings</CardTitle>
            <CardDescription>
              Manage presets and launch the TV display for your programs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Launch Display</h3>
                <div className="space-y-2">
                  <Label>Select Program</Label>
                  <Select
                    value={selectedDisplayProgramId}
                    onValueChange={(v) => {
                      setSelectedDisplayProgramId(v);
                      setSelectedDisplayWorkoutId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedDisplayProgramId && (
                  <div className="space-y-2">
                    <Label>Select Session</Label>
                    <Select
                      value={selectedDisplayWorkoutId}
                      onValueChange={setSelectedDisplayWorkoutId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a session" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs
                          .find((p) => p.id === selectedDisplayProgramId)
                          ?.workouts?.map((w: any, idx: number) => (
                            <SelectItem key={idx} value={idx.toString()}>
                              {w.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Select Preset</Label>
                  <Select
                    value={selectedPresetId}
                    onValueChange={setSelectedPresetId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayPresets.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={
                    !selectedDisplayProgramId || !selectedDisplayWorkoutId
                  }
                  onClick={() =>
                    window.open(
                      `/tv/${selectedDisplayProgramId}/${selectedDisplayWorkoutId}?preset=${selectedPresetId}`,
                      "_blank",
                    )
                  }
                >
                  <PlayCircle className="h-4 w-4" /> Launch TV Display
                </Button>
              </div>

              <div className="space-y-4 border-l border-border pl-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Manage Presets</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newId = "preset_" + Date.now();
                      savePresets([
                        ...displayPresets,
                        {
                          ...displayPresets[0],
                          id: newId,
                          name: "New Preset",
                        },
                      ]);
                      setEditingPresetId(newId);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> New Preset
                  </Button>
                </div>

                <div className="space-y-2">
                  {displayPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30"
                    >
                      <span>{preset.name}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingPresetId(preset.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {preset.id !== "default" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              savePresets(
                                displayPresets.filter(
                                  (p) => p.id !== preset.id,
                                ),
                              );
                              if (selectedPresetId === preset.id)
                                setSelectedPresetId("default");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContentWrapper>

      <Dialog
        open={!!editingPresetId}
        onOpenChange={(open) => !open && setEditingPresetId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Display Preset</DialogTitle>
          </DialogHeader>
          {editingPresetId &&
            (() => {
              const preset = displayPresets.find(
                (p) => p.id === editingPresetId,
              );
              if (!preset) return null;

              const updatePreset = (
                field: string,
                subfield: string | null,
                value: any,
              ) => {
                const updated = displayPresets.map((p) => {
                  if (p.id === editingPresetId) {
                    if (subfield) {
                      return {
                        ...p,
                        [field]: { ...p[field], [subfield]: value },
                      };
                    }
                    return { ...p, [field]: value };
                  }
                  return p;
                });
                savePresets(updated);
              };

              return (
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Preset Name</Label>
                    <Input
                      value={preset.name}
                      onChange={(e) =>
                        updatePreset("name", null, e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Layout</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Orientation</Label>
                        <Select
                          value={preset.layout.orientation}
                          onValueChange={(v) =>
                            updatePreset("layout", "orientation", v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="landscape">Landscape</SelectItem>
                            <SelectItem value="portrait">Portrait</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Checkbox
                          id="showRest"
                          checked={preset.layout.showRest}
                          onCheckedChange={(c) =>
                            updatePreset("layout", "showRest", !!c)
                          }
                        />
                        <label htmlFor="showRest" className="text-sm">
                          Show Rest Times
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showHeaders"
                          checked={preset.layout.showHeaders}
                          onCheckedChange={(c) =>
                            updatePreset("layout", "showHeaders", !!c)
                          }
                        />
                        <label htmlFor="showHeaders" className="text-sm">
                          Show Column Headers
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showDuration"
                          checked={preset.layout.showDuration}
                          onCheckedChange={(c) =>
                            updatePreset("layout", "showDuration", !!c)
                          }
                        />
                        <label htmlFor="showDuration" className="text-sm">
                          Show Duration
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b pb-2">Colors</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <Input
                          type="color"
                          value={preset.colors.background}
                          onChange={(e) =>
                            updatePreset("colors", "background", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Block Color</Label>
                        <Input
                          type="color"
                          value={preset.colors.blockBackground}
                          onChange={(e) =>
                            updatePreset(
                              "colors",
                              "blockBackground",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          <DialogFooter>
            <Button onClick={() => setEditingPresetId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Thin wrapper so the extracted tab matches the TabsContent shape used in Admin.
import { TabsContent } from "@/components/ui/tabs";
const TabsContentWrapper = ({ children }: { children: React.ReactNode }) => (
  <TabsContent value="display" className="space-y-6 mt-6">
    {children}
  </TabsContent>
);
