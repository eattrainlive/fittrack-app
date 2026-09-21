/**
 * AI engine-workout generator, extracted from Admin.tsx.
 * Generates a 40-min EMOM/AMRAP conditioning block via the Anthropic API.
 */
import { toast } from "sonner";

export interface EngineGenParams {
  anthropicKey: string;
  exercises: any[];
  progWorkouts: any[];
  selectedWorkoutIndex: number;
  setIsGeneratingAI: (v: boolean) => void;
  setProgWorkouts: (v: any[]) => void;
}

export const handleGenerateEngineWorkout = async (
  sectionId: number,
  p: EngineGenParams,
) => {
  if (!p.anthropicKey) {
    toast.error("Please add your Anthropic API Key in the Settings tab first.");
    return;
  }

  const updatedWorkouts = [...p.progWorkouts];
  const currentWorkout = updatedWorkouts[p.selectedWorkoutIndex];
  const sectionIndex = currentWorkout.exercises.findIndex(
    (e: any) => e.id === sectionId,
  );

  if (sectionIndex === -1) return;

  p.setIsGeneratingAI(true);
  const toastId = toast.loading(
    "AI is analyzing your library and building a 40-min engine workout...",
  );

  try {
    const exList = p.exercises
      .map(
        (ex) =>
          `- ${ex.name} (ID: ${ex.id}, Category: ${Array.isArray(ex.category) ? ex.category.join(",") : ex.category}, Movement: ${Array.isArray(ex.movementType) ? ex.movementType.join(",") : ex.movementType})`,
      )
      .join("\n");

    const prompt = `You are an expert fitness coach. Create a 40-minute scalable engine (cardio/conditioning) workout using ONLY the following available exercises:

${exList}

The workout must be a 40-minute EMOM (Every Minute on the Minute) or AMRAP style, utilizing 4 to 6 different exercises.

Return ONLY a valid JSON array of exercise objects to be inserted into the workout. Each object must follow this exact structure:
[
  {
    "blockType": "Cardio",
    "name": "exercise_id_from_list",
    "sets": 10,
    "reps": 15,
    "weight": 0,
    "distance": 0,
    "timeMins": 1,
    "timeSecs": 0,
    "rest": 0,
    "linkedToNext": false,
    "eachSide": false,
    "staffNotes": "Brief coaching note"
  }
]
Do not include any markdown formatting, backticks, or other text outside the JSON array.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": p.anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Failed to generate workout");
    }

    const data = await response.json();
    let text = data.content[0].text.trim();

    if (text.startsWith("```json")) text = text.replace(/```json\n?/, "");
    if (text.startsWith("```")) text = text.replace(/```\n?/, "");
    if (text.endsWith("```")) text = text.replace(/```$/, "");

    const newExercises = JSON.parse(text).map((ex: any, i: number) => ({
      ...ex,
      id: Date.now() + i + Math.random(),
    }));

    currentWorkout.exercises[sectionIndex].name = "AI Engine: 40 Min EMOM";
    currentWorkout.exercises[sectionIndex].sectionType = "EMOM";
    currentWorkout.exercises[sectionIndex].description =
      "AI Generated 40-Min Engine Block";

    currentWorkout.exercises.splice(sectionIndex + 1, 0, ...newExercises);

    p.setProgWorkouts(updatedWorkouts);
    toast.success("40-Min Engine Workout generated successfully!", {
      id: toastId,
    });
  } catch (error: any) {
    console.error(error);
    toast.error("AI Generation failed: " + error.message, { id: toastId });
  } finally {
    p.setIsGeneratingAI(false);
  }
};
