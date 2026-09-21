/**
 * Exercise / programme export handlers extracted from Admin.tsx.
 * Downloads CSV (exercises) or JSON (programmes) backups.
 */
import { toast } from "sonner";

export const exportExercisesData = (exercises: any[]) => {
  try {
    if (exercises.length === 0) {
      toast.error("No exercises to export.");
      return;
    }

    const headers = [
      "ID",
      "Name",
      "Categories",
      "Muscle",
      "Equipment",
      "Difficulty",
      "Movement Types",
      "Video URL",
      "Tracking Style",
    ];
    const csvRows = [headers.join(",")];

    exercises.forEach((ex) => {
      const row = [
        `"${ex.id || ""}"`,
        `"${ex.name || ""}"`,
        `"${Array.isArray(ex.category) ? ex.category.join("; ") : ex.category || ""}"`,
        `"${ex.muscle || ""}"`,
        `"${ex.equipment || ""}"`,
        `"${ex.difficulty || ""}"`,
        `"${Array.isArray(ex.movementType) ? ex.movementType.join("; ") : ex.movementType || ""}"`,
        `"${ex.videoUrl || ""}"`,
        `"${Array.isArray(ex.trackingType) ? ex.trackingType.join("; ") : ex.trackingType || "Weight & Reps"}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");

    navigator.clipboard.writeText(csvString).catch(() => {});

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fittrack_exercises_backup.csv";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      "Exercises backed up! (Also copied to clipboard just in case)",
    );
  } catch (error) {
    toast.error("Failed to export backup.");
  }
};

export const exportProgramsData = (programs: any[]) => {
  try {
    if (programs.length === 0) {
      toast.error("No programs to export.");
      return;
    }

    const jsonString = JSON.stringify(programs, null, 2);

    navigator.clipboard.writeText(jsonString).catch(() => {});

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fittrack_programs_backup.json";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(
      "Programs backed up! (Also copied to clipboard just in case)",
    );
  } catch (error) {
    toast.error("Failed to export programs backup.");
  }
};
