import { useState, useEffect } from "react";
import { supabase } from "./supabase";

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
    // Fetch existing from cloud to get their IDs so we can upsert by ID safely
    const { data: existing } = await supabase.from('member_habits').select('id, habit_id').eq('member_id', user.id);
    
    const payload = habits.map(h => {
      const { id, habits: _habits, ...rest } = h;
      const item: any = { ...rest, member_id: user.id };
      
      // Match with existing to get the true UUID if we don't have it
      if (existing) {
        const match = existing.find(e => e.habit_id === item.habit_id);
        if (match) {
          item.id = match.id;
        }
      }
      
      // Only include id if it looks like a valid UUID and we didn't just set it
      if (!item.id && id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        item.id = id;
      }
      return item;
    });
    
    const { data, error } = await supabase
      .from('member_habits')
      .upsert(payload) // Upsert by primary key (id)
      .select();
      
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

export const saveExercises = async (exercises: any[]) => {
  localStorage.setItem('fittrack_exercises', JSON.stringify(exercises));
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
        await supabase.from('exercises').upsert(safeExercises);
        
        const currentIds = exercises.map(e => String(e.id)).filter(Boolean);
        if (currentIds.length > 0) {
          await supabase.from('exercises').update({ is_deleted: true }).eq('user_id', user.id).not('id', 'in', currentIds);
        }
      } else {
        await supabase.from('exercises').update({ is_deleted: true }).eq('user_id', user.id);
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
};

export const getPrograms = () => {
  const stored = localStorage.getItem('fittrack_programs');
  return stored ? JSON.parse(stored) : defaultPrograms;
};

export const savePrograms = async (programs: any[]) => {
  localStorage.setItem('fittrack_programs', JSON.stringify(programs));
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (programs.length > 0) {
        const safePrograms = programs.map(p => ({ ...p, user_id: user.id }));
        await supabase.from('programs').upsert(safePrograms);
        
        const currentIds = programs.map(p => String(p.id)).filter(Boolean);
        if (currentIds.length > 0) {
          await supabase.from('programs').update({ is_deleted: true }).eq('user_id', user.id).not('id', 'in', currentIds);
        }
      } else {
        await supabase.from('programs').update({ is_deleted: true }).eq('user_id', user.id);
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err };
  }
};

export const getActiveProgram = () => {
  const stored = localStorage.getItem('fittrack_active_program');
  return stored ? JSON.parse(stored) : null;
};

export const saveActiveProgram = async (activeProgram: any) => {
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

export const saveWorkoutToHistory = async (workout: any) => {
  const history = getWorkoutHistory();
  const newWorkout = { ...workout, date: workout.date || new Date().toISOString(), id: workout.id || Date.now().toString() };
  history.unshift(newWorkout);
  localStorage.setItem('fittrack_history', JSON.stringify(history));
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('workout_history').upsert({ ...newWorkout, user_id: user.id }, { onConflict: 'id' });
    }
    return { success: true, workout: newWorkout };
  } catch (e) {
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

export const saveBodyweight = async (data: any) => {
  const history = getBodyweightHistory();
  const date = new Date().toISOString().split('T')[0];
  history.push({ date, ...data });
  localStorage.setItem('fittrack_bodyweight', JSON.stringify(history));
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from('bodyweight_history').upsert({ user_id: user.id, date, ...data }, { onConflict: 'user_id, date' });
    return { success: true, history };
  } catch (e) {
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

  if (ex.data && ex.data.length > 0) {
    const activeEx = ex.data.filter((e: any) => e.is_deleted !== true);
    localStorage.setItem('fittrack_exercises', JSON.stringify(activeEx));
  }
  if (prg.data && prg.data.length > 0) {
    const activePrg = prg.data.filter((p: any) => p.is_deleted !== true);
    localStorage.setItem('fittrack_programs', JSON.stringify(activePrg));
  }
  if (hist.data && hist.data.length > 0) localStorage.setItem('fittrack_history', JSON.stringify(hist.data));
  if (bw.data && bw.data.length > 0) localStorage.setItem('fittrack_bodyweight', JSON.stringify(bw.data));
  if (prs.data && prs.data.length > 0) localStorage.setItem('fittrack_prs', JSON.stringify(prs.data));
  if (nut.data) localStorage.setItem('fittrack_member_nutrition', JSON.stringify(nut.data));
  if (mhab.data && mhab.data.length > 0) localStorage.setItem('fittrack_member_habits', JSON.stringify(mhab.data));
  if (chk.data && chk.data.length > 0) localStorage.setItem('fittrack_habit_checkins', JSON.stringify(chk.data));
  if (meas.data && meas.data.length > 0) localStorage.setItem('fittrack_member_measurements', JSON.stringify(meas.data));
  if (phot.data && phot.data.length > 0) localStorage.setItem('fittrack_member_photos', JSON.stringify(phot.data));
  if (habLib.data && habLib.data.length > 0) localStorage.setItem('fittrack_habits_library', JSON.stringify(habLib.data));

  const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id);
  if (settings) {
    const active = settings.find(s => s.key === 'active_program');
    if (active) localStorage.setItem('fittrack_active_program', active.value);
  }
};

export const syncProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) localStorage.setItem('fittrack_profile', JSON.stringify(profile));
  }
};

