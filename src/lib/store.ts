import { supabase } from "./supabase";

// ── Dirty flag helpers ─────────────────────────────────────────────────────
// A "dirty" store has local writes that haven't confirmed to Supabase yet.
// syncFromSupabase will NOT overwrite a dirty store (it re-pushes instead).
const DIRTY_STORES = ['programs', 'exercises', 'history', 'bodyweight', 'habits'] as const;
type DirtyStore = typeof DIRTY_STORES[number];

export const markDirty = (store: DirtyStore) => localStorage.setItem(`fittrack_dirty_${store}`, '1');
export const clearDirty = (store: DirtyStore) => localStorage.removeItem(`fittrack_dirty_${store}`);
export const isDirty = (store: DirtyStore) => localStorage.getItem(`fittrack_dirty_${store}`) === '1';

// ── Sync status (drives the header indicator) ──────────────────────────────
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';
const syncListeners: Set<(s: SyncStatus) => void> = new Set();

let _syncStatus: SyncStatus = 'idle';
export const getSyncStatus = () => _syncStatus;
export const subscribeSyncStatus = (fn: (s: SyncStatus) => void) => {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
};
const setSyncStatus = (s: SyncStatus) => {
  _syncStatus = s;
  syncListeners.forEach(fn => fn(s));
  if (s === 'saved') setTimeout(() => { if (_syncStatus === 'saved') setSyncStatus('idle'); }, 3000);
};

// ── Retry queue ────────────────────────────────────────────────────────────
// Persists failed writes; retried on: app load, regain connectivity, explicit call.
type QueuedWrite = { store: DirtyStore; timestamp: number };
const getQueue = (): QueuedWrite[] => {
  try { return JSON.parse(localStorage.getItem('fittrack_retry_queue') || '[]'); } catch { return []; }
};
const setQueue = (q: QueuedWrite[]) => localStorage.setItem('fittrack_retry_queue', JSON.stringify(q));
const enqueue = (store: DirtyStore) => {
  const q = getQueue().filter(x => x.store !== store);
  q.push({ store, timestamp: Date.now() });
  setQueue(q);
};
const dequeue = (store: DirtyStore) => setQueue(getQueue().filter(x => x.store !== store));

// Flush all queued writes (called on load + online event)
export const flushRetryQueue = async () => {
  const q = getQueue();
  if (!q.length) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const item of q) {
    if (item.store === 'programs') {
      const local = localStorage.getItem('fittrack_programs');
      if (local) { await savePrograms(JSON.parse(local)); }
    } else if (item.store === 'exercises') {
      const local = localStorage.getItem('fittrack_exercises');
      if (local) { await saveExercises(JSON.parse(local)); }
    } else if (item.store === 'history') {
      const local = localStorage.getItem('fittrack_history');
      if (local) {
        const history = JSON.parse(local);
        if (history.length > 0) {
          const latest = history[0];
          await supabase.from('workout_history').upsert({ ...latest, user_id: user.id }, { onConflict: 'id' });
        }
      }
    } else if (item.store === 'bodyweight') {
      const local = localStorage.getItem('fittrack_bodyweight');
      if (local) {
        const bw = JSON.parse(local);
        if (bw.length > 0) {
          const latest = bw[bw.length - 1];
          await supabase.from('bodyweight_history').upsert({ user_id: user.id, ...latest }, { onConflict: 'user_id, date' });
        }
      }
    }
  }
};

// Register online retry
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushRetryQueue(); });
}

// Nutrition & Habits Data
export const GOAL_PATHS: Record<string, number[]> = {
  fat_loss: [1,4,2,3,6,8,9,12,10,13,14,11,17,24,22,23,26,27,28],
  performance: [1,5,7,3,8,11,15,19,20,21,24,25,23,16,28],
  health: [1,2,3,4,8,5,9,12,16,14,10,18,22,23,26,27,28]
};

export const getHabits = async () => {
  const { data } = await supabase.from('habits').select('*').order('sort_order', { ascending: true });
  if (data) {
    localStorage.setItem('fittrack_habits_library', JSON.stringify(data));
    return data;
  }
  const local = localStorage.getItem('fittrack_habits_library');
  if (local) return JSON.parse(local);
  return [];
};

export const getMemberNutrition = () => {
  const local = localStorage.getItem('fittrack_member_nutrition');
  return local ? JSON.parse(local) : null;
};

export const saveMemberNutrition = async (nutrition: any) => {
  localStorage.setItem('fittrack_member_nutrition', JSON.stringify(nutrition));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('member_nutrition').upsert({ ...nutrition, member_id: user.id }, { onConflict: 'member_id' });
  }
};

export const getMemberHabits = () => {
  const local = localStorage.getItem('fittrack_member_habits');
  return local ? JSON.parse(local) : [];
};

export const saveMemberHabits = async (habits: any[]) => {
  localStorage.setItem('fittrack_member_habits', JSON.stringify(habits));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existing } = await supabase.from('member_habits').select('id, habit_id').eq('member_id', user.id);
    const payload = habits.map(h => {
      const { id, habits: _habits, ...rest } = h;
      const item: any = { ...rest, member_id: user.id };
      if (existing) {
        const match = existing.find(e => e.habit_id === item.habit_id);
        if (match) item.id = match.id;
      }
      if (!item.id && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        item.id = id;
      }
      return item;
    });
    const { data, error } = await supabase.from('member_habits').upsert(payload).select();
    if (data) {
      localStorage.setItem('fittrack_member_habits', JSON.stringify(data));
      return data;
    }
    if (error) console.error("Error saving member habits:", error);
  }
  return habits;
};

export const getHabitCheckins = () => {
  const local = localStorage.getItem('fittrack_habit_checkins');
  return local ? JSON.parse(local) : [];
};

export const saveHabitCheckin = async (checkin: any) => {
  const checkins = getHabitCheckins();
  const date = checkin.date;
  const habitId = checkin.habit_id;
  const existingIdx = checkins.findIndex((c: any) => c.date === date && c.habit_id === habitId);
  if (existingIdx >= 0) {
    checkins[existingIdx] = checkin;
  } else {
    checkins.push(checkin);
  }
  localStorage.setItem('fittrack_habit_checkins', JSON.stringify(checkins));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('habit_checkins').upsert({ ...checkin, member_id: user.id }, { onConflict: 'member_id, habit_id, date' });
  }
};

export const getMemberMeasurements = () => {
  const local = localStorage.getItem('fittrack_member_measurements');
  return local ? JSON.parse(local) : [];
};

export const saveMemberMeasurement = async (measurement: any) => {
  const measurements = getMemberMeasurements();
  const newMeasurement = { ...measurement, id: measurement.id || Date.now().toString() };
  measurements.push(newMeasurement);
  localStorage.setItem('fittrack_member_measurements', JSON.stringify(measurements));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('member_measurements').upsert({ ...newMeasurement, member_id: user.id });
  }
  return measurements;
};

export const getMemberPhotos = () => {
  const local = localStorage.getItem('fittrack_member_photos');
  return local ? JSON.parse(local) : [];
};

export const saveMemberPhoto = async (photo: any) => {
  const photos = getMemberPhotos();
  const newPhoto = { ...photo, id: photo.id || Date.now().toString() };
  photos.push(newPhoto);
  localStorage.setItem('fittrack_member_photos', JSON.stringify(photos));
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('member_photos').upsert({ ...newPhoto, member_id: user.id });
  }
  return photos;
};

export const seedMemberHabits = async (goal: string) => {
  const path = GOAL_PATHS[goal] || GOAL_PATHS.health;
  const habits = path.map((habitId, index) => ({
    habit_id: habitId,
    status: index === 0 ? 'active' : 'queued',
    position: index,
    started_at: index === 0 ? new Date().toISOString() : null
  }));
  const savedHabits = await saveMemberHabits(habits);
  return savedHabits;
};

export const resetMemberNutrition = async () => {
  localStorage.removeItem('fittrack_member_nutrition');
  localStorage.removeItem('fittrack_member_habits');
  localStorage.removeItem('fittrack_habit_checkins');
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await Promise.all([
      supabase.from('member_nutrition').delete().eq('member_id', user.id),
      supabase.from('member_habits').delete().eq('member_id', user.id),
      supabase.from('habit_checkins').delete().eq('member_id', user.id)
    ]);
  }
};

export const defaultExercises = [
  { id: "bench", name: "Bench Press", category: "Strength", muscle: "Chest", equipment: "Barbell", difficulty: "Intermediate", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Push", trackingType: ["Weight & Reps"] },
  { id: "squat", name: "Squat", category: "Strength", muscle: "Legs", equipment: "Barbell", difficulty: "Advanced", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Knee", trackingType: ["Weight & Reps"] },
  { id: "deadlift", name: "Deadlift", category: "Strength", muscle: "Back", equipment: "Barbell", difficulty: "Advanced", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Hip", trackingType: ["Weight & Reps"] },
  { id: "pullup", name: "Pull-up", category: "Strength", muscle: "Back", equipment: "Bodyweight", difficulty: "Intermediate", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Pull", trackingType: ["Weight & Reps"] },
  { id: "pushup", name: "Push-up", category: "Strength", muscle: "Chest", equipment: "Bodyweight", difficulty: "Beginner", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Push", trackingType: ["Weight & Reps"] },
  { id: "curl", name: "Dumbbell Curl", category: "Strength", muscle: "Biceps", equipment: "Dumbbell", difficulty: "Beginner", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Accessory", trackingType: ["Weight & Reps"] },
  { id: "legpress", name: "Leg Press", category: "Strength", muscle: "Legs", equipment: "Machine", difficulty: "Beginner", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Knee", trackingType: ["Weight & Reps"] },
  { id: "ohp", name: "Overhead Press", category: "Strength", muscle: "Shoulders", equipment: "Barbell", difficulty: "Intermediate", videoUrl: "https://player.vimeo.com/video/147173661", movementType: "Push", trackingType: ["Weight & Reps"] },
  { id: "treadmill", name: "Treadmill Run", category: "Cardio", muscle: "Full Body", equipment: "Machine", difficulty: "Beginner", videoUrl: "", movementType: "Conditioning", trackingType: ["Distance & Time", "Calories"] },
  { id: "stretching", name: "Dynamic Stretching", category: "Mobility", muscle: "Full Body", equipment: "Bodyweight", difficulty: "Beginner", videoUrl: "", movementType: "Warm Up", trackingType: ["Time Only"] },
  { id: "glutebridge", name: "Glute Bridge", category: "Activation", muscle: "Legs", equipment: "Bodyweight", difficulty: "Beginner", videoUrl: "", movementType: "Fire Up", trackingType: ["Weight & Reps"] },
];

export const defaultPrograms = [
  {
    id: "t1",
    name: "Full Body Basics",
    description: "Perfect starting point for beginners focusing on compound movements.",
    exercises: [
      { name: "squat", sets: 3, reps: 10, weight: 0 },
      { name: "bench", sets: 3, reps: 10, weight: 0 },
      { name: "deadlift", sets: 1, reps: 5, weight: 0 },
    ]
  },
  {
    id: "t2",
    name: "Upper Body Power",
    description: "Focus on chest, back, and arms for upper body strength.",
    exercises: [
      { name: "bench", sets: 4, reps: 8, weight: 0 },
      { name: "pullup", sets: 3, reps: 8, weight: 0 },
    ]
  },
  {
    id: "t3",
    name: "Leg Day Crusher",
    description: "High volume lower body workout.",
    exercises: [
      { name: "squat", sets: 4, reps: 8, weight: 0 },
      { name: "deadlift", sets: 3, reps: 8, weight: 0 },
    ]
  }
];

export const getExercises = () => {
  const stored = localStorage.getItem('fittrack_exercises');
  return stored ? JSON.parse(stored) : defaultExercises;
};

export const saveExercises = async (exercises: any[]): Promise<{ success: boolean; error?: any }> => {
  localStorage.setItem('fittrack_exercises', JSON.stringify(exercises));
  markDirty('exercises');
  setSyncStatus('saving');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (exercises.length > 0) {
        const safeExercises = exercises.map(e => ({
          ...e,
          user_id: user.id,
          category: Array.isArray(e.category) ? e.category.join(', ') : e.category,
          movementType: Array.isArray(e.movementType) ? e.movementType : [e.movementType],
          trackingType: Array.isArray(e.trackingType) ? e.trackingType.join(', ') : e.trackingType || 'Weight & Reps'
        }));
        const { error } = await supabase.from('exercises').upsert(safeExercises);
        if (error) {
          enqueue('exercises');
          setSyncStatus('error');
          return { success: false, error };
        }
        const currentIds = exercises.map(e => String(e.id)).filter(Boolean);
        if (currentIds.length > 0) {
          await supabase.from('exercises').update({ is_deleted: true }).eq('user_id', user.id).not('id', 'in', `(${currentIds.join(',')})`);
        }
      } else {
        await supabase.from('exercises').update({ is_deleted: true }).eq('user_id', user.id);
      }
      clearDirty('exercises');
      dequeue('exercises');
      setSyncStatus('saved');
      return { success: true };
    }
    setSyncStatus('saved');
    return { success: true };
  } catch (err) {
    enqueue('exercises');
    setSyncStatus('error');
    return { success: false, error: err };
  }
};

export const getPrograms = () => {
  const stored = localStorage.getItem('fittrack_programs');
  return stored ? JSON.parse(stored) : defaultPrograms;
};

export const savePrograms = async (programs: any[]): Promise<{ success: boolean; error?: any }> => {
  localStorage.setItem('fittrack_programs', JSON.stringify(programs));
  markDirty('programs');
  setSyncStatus('saving');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (programs.length > 0) {
        const safePrograms = programs.map(p => ({ ...p, user_id: user.id }));
        let { error } = await supabase.from('programs').upsert(safePrograms);

        // Fallback: if the full upsert fails (a field isn't a column on `programs`),
        // save the minimal columns and stash the rest in user_settings so nothing is lost.
        if (error) {
          console.warn("Programs upsert failed, falling back to minimal fields + user_settings...", error.message);
          const fallbackPrograms = safePrograms.map(p => ({
            id: p.id, name: p.name, description: p.description, user_id: p.user_id, is_deleted: p.is_deleted ?? false,
          }));
          const fallbackRes = await supabase.from('programs').upsert(fallbackPrograms);
          if (!fallbackRes.error) {
            for (const p of safePrograms) {
              const { id, name, description, user_id, is_deleted, ...extras } = p;
              await supabase.from('user_settings').upsert(
                { user_id: user.id, key: `prog_extras_${p.id}`, value: JSON.stringify(extras) },
                { onConflict: 'user_id, key' }
              );
            }
            error = null;
          } else {
            error = fallbackRes.error;
            console.error("Minimal programs fallback also failed:", error);
          }
        }

        if (!error) {
          const currentIds = safePrograms.map(p => String(p.id)).filter(Boolean);
          if (currentIds.length > 0) {
            await supabase.from('programs').update({ is_deleted: true }).eq('user_id', user.id).not('id', 'in', `(${currentIds.join(',')})`);
          }
          clearDirty('programs');
          dequeue('programs');
          setSyncStatus('saved');
          return { success: true };
        }
        
        enqueue('programs');
        setSyncStatus('error');
        return { success: false, error };
      } else {
        const { error: updateErr } = await supabase.from('programs').update({ is_deleted: true }).eq('user_id', user.id);
        if (!updateErr) {
          clearDirty('programs');
          dequeue('programs');
          setSyncStatus('saved');
          return { success: true };
        }
        enqueue('programs');
        setSyncStatus('error');
        return { success: false, error: updateErr };
      }
    }
    setSyncStatus('saved');
    return { success: true };
  } catch (err) {
    enqueue('programs');
    setSyncStatus('error');
    return { success: false, error: err };
  }
};

export const getActiveProgram = () => {
  const stored = localStorage.getItem('fittrack_active_program');
  return stored ? JSON.parse(stored) : null;
};

export const saveActiveProgram = async (activeProgram: any): Promise<{ success: boolean; error?: any }> => {
  if (activeProgram) localStorage.setItem('fittrack_active_program', JSON.stringify(activeProgram));
  else localStorage.removeItem('fittrack_active_program');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && activeProgram) {
      await supabase.from('user_settings').upsert({ user_id: user.id, key: 'active_program', value: JSON.stringify(activeProgram) }, { onConflict: 'user_id, key' });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
};

export const getWorkoutHistory = () => {
  const stored = localStorage.getItem('fittrack_history');
  return stored ? JSON.parse(stored) : [];
};

export const saveWorkoutToHistory = async (workout: any): Promise<{ success: boolean; error?: any; workout?: any }> => {
  const history = getWorkoutHistory();
  const newWorkout = { ...workout, date: workout.date || new Date().toISOString(), id: workout.id || Date.now().toString() };
  // dedupe: don't add if same id already exists
  if (!history.find((h: any) => h.id === newWorkout.id)) {
    history.unshift(newWorkout);
    localStorage.setItem('fittrack_history', JSON.stringify(history));
    markDirty('history');
  }
  setSyncStatus('saving');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('workout_history').upsert({ ...newWorkout, user_id: user.id }, { onConflict: 'id' });
      if (error) {
        enqueue('history');
        setSyncStatus('error');
        return { success: false, error, workout: newWorkout };
      }
    }
    clearDirty('history');
    dequeue('history');
    setSyncStatus('saved');
    return { success: true, workout: newWorkout };
  } catch (e) {
    enqueue('history');
    setSyncStatus('error');
    return { success: false, error: e, workout: newWorkout };
  }
};

export const getPersonalRecords = () => {
  const stored = localStorage.getItem('fittrack_prs');
  return stored ? JSON.parse(stored) : [];
};

export const savePersonalRecord = (exerciseId: string, weight: number) => {
  const prs = getPersonalRecords();
  const date = new Date().toISOString().split('T')[0];
  const newPr = { id: Date.now().toString(), exerciseId, weight, date };
  prs.push(newPr);
  localStorage.setItem('fittrack_prs', JSON.stringify(prs));
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) supabase.from('personal_records').insert({ ...newPr, user_id: user.id }).then();
  });
  return prs;
};

export const deletePersonalRecord = (id: string) => {
  let prs = getPersonalRecords();
  prs = prs.filter((pr: any) => pr.id !== id);
  localStorage.setItem('fittrack_prs', JSON.stringify(prs));
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) supabase.from('personal_records').delete().eq('id', id).eq('user_id', user.id).then();
  });
  return prs;
};

export const getLastExerciseStats = (exerciseId: string) => {
  const history = getWorkoutHistory();
  for (const workout of history) {
    const exercise = workout.exercises?.find((e: any) => String(e.name) === String(exerciseId));
    if (exercise && exercise.weight > 0) {
      return { weight: exercise.weight, reps: exercise.reps, sets: exercise.sets, date: workout.date };
    }
  }
  return null;
};

export const getBodyweightHistory = () => {
  const stored = localStorage.getItem('fittrack_bodyweight');
  return stored ? JSON.parse(stored) : [];
};

export const saveBodyweight = async (data: any): Promise<{ success: boolean; error?: any; history?: any[] }> => {
  const history = getBodyweightHistory();
  const date = new Date().toISOString().split('T')[0];
  history.push({ date, ...data });
  localStorage.setItem('fittrack_bodyweight', JSON.stringify(history));
  markDirty('bodyweight');
  setSyncStatus('saving');
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('bodyweight_history').upsert({ user_id: user.id, date, ...data }, { onConflict: 'user_id, date' });
      if (error) {
        enqueue('bodyweight');
        setSyncStatus('error');
        return { success: false, error, history };
      }
    }
    clearDirty('bodyweight');
    dequeue('bodyweight');
    setSyncStatus('saved');
    return { success: true, history };
  } catch (e) {
    enqueue('bodyweight');
    setSyncStatus('error');
    return { success: false, error: e, history };
  }
};

export const getEducationFolders = () => {
  const local = localStorage.getItem('fittrack_education_folders');
  return local ? JSON.parse(local) : [];
};

export const saveEducationFolders = (folders: any[]) => {
  localStorage.setItem('fittrack_education_folders', JSON.stringify(folders));
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (user) await supabase.from('education_folders').upsert(folders.map(f => ({ ...f, user_id: user.id })));
  });
};

export const getVimeoToken = () => {
  return localStorage.getItem('fittrack_vimeo_token') || "";
};

export const saveVimeoToken = (token: string) => {
  localStorage.setItem('fittrack_vimeo_token', token);
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('user_settings').upsert({ user_id: user.id, key: 'vimeo_token', value: token }, { onConflict: 'user_id, key' }).then();
    }
  });
};

export const getAnthropicKey = () => {
  return localStorage.getItem('fittrack_anthropic_key') || "";
};

export const saveAnthropicKey = (key: string) => {
  localStorage.setItem('fittrack_anthropic_key', key);
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('user_settings').upsert({ user_id: user.id, key: 'anthropic_key', value: key }, { onConflict: 'user_id, key' }).then();
    }
  });
};

export const getCommunityPosts = () => {
  const local = localStorage.getItem('fittrack_community_posts');
  return local ? JSON.parse(local) : [];
};

export const saveCommunityPost = (post: any) => {
  const posts = getCommunityPosts();
  posts.unshift(post);
  localStorage.setItem('fittrack_community_posts', JSON.stringify(posts));
  return posts;
};

export const getCommunityComments = () => {
  const local = localStorage.getItem('fittrack_community_comments');
  return local ? JSON.parse(local) : [];
};

export const saveCommunityComment = (comment: any) => {
  const comments = getCommunityComments();
  comments.push(comment);
  localStorage.setItem('fittrack_community_comments', JSON.stringify(comments));
  return comments;
};

export const getCommunityFeed = () => {
  const history = getWorkoutHistory();
  const customPosts = getCommunityPosts();
  const mockFeed = [
    {
      id: "mock1",
      user: { name: "Sarah Connor", avatar: "SC" },
      date: new Date(Date.now() - 3600000).toISOString(),
      workoutName: "Leg Day Crusher",
      exercises: [
        { name: "squat", sets: 4, reps: 8, weight: 100 },
        { name: "deadlift", sets: 3, reps: 8, weight: 120 }
      ],
      volume: 6080,
      reward: { name: "Ambulance", emoji: "🚑", count: 1, displayName: "Ambulance" },
      likes: 12,
      comments: 3
    }
  ];
  const historyPosts = history.map((w: any) => ({
    id: w.id,
    user: { name: "You", avatar: "ME" },
    date: w.date,
    workoutName: w.name,
    exercises: w.exercises,
    volume: w.volume,
    reward: w.reward,
    likes: 0,
    comments: 0
  }));
  return [...customPosts, ...historyPosts, ...mockFeed].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getMembers = async () => {
  const { data } = await supabase.from('members').select('*').order('name');
  return data || [];
};

export const getMemberActivity = async (memberId: string) => {
  const { data } = await supabase.from('workout_history').select('*').eq('user_id', memberId).order('date', { ascending: false });
  return data || [];
};

export const sendNotification = async (userId: string, title: string, message: string) => {
  await supabase.from('notifications').insert({ user_id: userId, title, message, is_read: false });
};

export const migrateLocalToSupabase = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
};

export const getEducationVideos = () => {
  const local = localStorage.getItem('fittrack_education_videos');
  return local ? JSON.parse(local) : [];
};

export const saveEducationVideos = (videos: any[]) => {
  localStorage.setItem('fittrack_education_videos', JSON.stringify(videos));
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (user) await supabase.from('education_videos').upsert(videos.map(v => ({ ...v, user_id: user.id })));
  });
};

export const getNotifications = async () => {
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  return data || [];
};

export const markNotificationRead = async (id: string) => {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const syncFromSupabase = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Flush any pending queued writes BEFORE syncing (push local → cloud first)
  await flushRetryQueue();

  const [ex, prg, hist, bw, prs, nut, mhab, chk, meas, phot, habLib] = await Promise.all([
    supabase.from('exercises').select('*').eq('user_id', user.id),
    supabase.from('programs').select('*').eq('user_id', user.id),
    supabase.from('workout_history').select('*').eq('user_id', user.id),
    supabase.from('bodyweight_history').select('*').eq('user_id', user.id),
    supabase.from('personal_records').select('*').eq('user_id', user.id),
    supabase.from('member_nutrition').select('*').eq('member_id', user.id).maybeSingle(),
    supabase.from('member_habits').select('*').eq('member_id', user.id),
    supabase.from('habit_checkins').select('*').eq('member_id', user.id),
    supabase.from('member_measurements').select('*').eq('member_id', user.id),
    supabase.from('member_photos').select('*').eq('member_id', user.id),
    supabase.from('habits').select('*').order('sort_order', { ascending: true })
  ]);

  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id);

  // Guard: only overwrite local if store is NOT dirty (no pending unconfirmed writes)
  if (ex.data && ex.data.length > 0 && !isDirty('exercises')) {
    const activeEx = ex.data.filter((e: any) => e.is_deleted !== true);
    localStorage.setItem('fittrack_exercises', JSON.stringify(activeEx));
  } else if (isDirty('exercises')) {
    // Re-push local to cloud instead
    const local = localStorage.getItem('fittrack_exercises');
    if (local) saveExercises(JSON.parse(local));
  }

  if (prg.data && prg.data.length > 0 && !isDirty('programs')) {
    let activePrg = prg.data.filter((p: any) => p.is_deleted !== true);
    if (settings) {
      activePrg = activePrg.map((p: any) => {
        const extraSetting = settings.find((s: any) => s.key === `prog_extras_${p.id}`);
        let extraData: any = {};
        if (extraSetting) { try { extraData = JSON.parse(extraSetting.value); } catch (e) {} }
        return { ...p, ...extraData };
      });
    }
    localStorage.setItem('fittrack_programs', JSON.stringify(activePrg));
  } else if (isDirty('programs')) {
    const local = localStorage.getItem('fittrack_programs');
    if (local) savePrograms(JSON.parse(local));
  }

  if (hist.data && hist.data.length > 0 && !isDirty('history')) {
    localStorage.setItem('fittrack_history', JSON.stringify(hist.data));
  }
  
  if (bw.data && bw.data.length > 0 && !isDirty('bodyweight')) {
    localStorage.setItem('fittrack_bodyweight', JSON.stringify(bw.data));
  }
  
  if (prs.data && prs.data.length > 0) localStorage.setItem('fittrack_prs', JSON.stringify(prs.data));
  if (nut.data) localStorage.setItem('fittrack_member_nutrition', JSON.stringify(nut.data));
  if (mhab.data && mhab.data.length > 0) localStorage.setItem('fittrack_member_habits', JSON.stringify(mhab.data));
  if (chk.data && chk.data.length > 0) localStorage.setItem('fittrack_habit_checkins', JSON.stringify(chk.data));
  if (meas.data && meas.data.length > 0) localStorage.setItem('fittrack_member_measurements', JSON.stringify(meas.data));
  if (phot.data && phot.data.length > 0) localStorage.setItem('fittrack_member_photos', JSON.stringify(phot.data));
  if (habLib.data && habLib.data.length > 0) localStorage.setItem('fittrack_habits_library', JSON.stringify(habLib.data));

  if (settings) {
    const active = settings.find(s => s.key === 'active_program');
    if (active) localStorage.setItem('fittrack_active_program', active.value);
  }

  window.dispatchEvent(new Event('fittrack_synced'));
};

export const syncProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) localStorage.setItem('fittrack_profile', JSON.stringify(profile));
  }
};
