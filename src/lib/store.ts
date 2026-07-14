import { useState, useEffect } from "react";
import { supabase } from "./supabase";
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
  // Background sync
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Create a safe payload for the database
      const safeExercises = exercises.map(e => {
        let movType = e.movementType;
        if (typeof movType === 'string') {
          movType = [movType];
        } else if (!movType) {
          movType = [];
        }

        return {
          ...e,
          user_id: user.id,
          // Convert array to string for the database text column
          category: Array.isArray(e.category) ? e.category.join(', ') : e.category,
          movementType: movType,
          trackingType: Array.isArray(e.trackingType) ? e.trackingType.join(', ') : e.trackingType || 'Weight & Reps'
        };
      });

      if (safeExercises.length > 0) {
        let { error } = await supabase.from('exercises').upsert(safeExercises);
        
        // Fallback for schema mismatch (if movementType is still a text column)
        if (error && error.message && error.message.toLowerCase().includes('array')) {
          console.warn("Array insert failed, falling back to stringified movementType...");
          const fallbackExercises = safeExercises.map(e => ({
            ...e,
            movementType: Array.isArray(e.movementType) ? e.movementType.join(', ') : e.movementType
          }));
          const fallbackRes = await supabase.from('exercises').upsert(fallbackExercises);
          error = fallbackRes.error;
        }

        if (!error) {
          const currentIds = safeExercises.map(e => e.id);
          // Soft delete items not in the current list
          const { error: updateErr } = await supabase.from('exercises')
            .update({ is_deleted: true })
            .eq('user_id', user.id)
            .not('id', 'in', `(${currentIds.join(',')})`);
            
          if (updateErr) console.warn("Soft delete failed (column might be missing):", updateErr);
          
          return { success: true };
        } else {
          console.error("Supabase insert error:", error);
          return { success: false, error };
        }
      } else {
        // If empty list sent, soft delete all
        const { error: updateErr } = await supabase.from('exercises')
          .update({ is_deleted: true })
          .eq('user_id', user.id);
        
        if (updateErr) console.warn("Soft delete failed:", updateErr);
        return { success: !updateErr, error: updateErr };
      }
    }
    return { success: false, error: new Error("Not logged in") };
  } catch (err) {
    console.error(err);
    return { success: false, error: err };
  }
};

export const getPrograms = () => {
  const stored = localStorage.getItem('fittrack_programs');
  return stored ? JSON.parse(stored) : defaultPrograms;
};

export const savePrograms = async (programs: any[]) => {
  localStorage.setItem('fittrack_programs', JSON.stringify(programs));
  // Background sync
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (programs.length > 0) {
        const safePrograms = programs.map(p => ({ ...p, user_id: user.id }));
        let { error } = await supabase.from('programs').upsert(safePrograms);
        
        if (error) {
          console.warn("Programs upsert failed, falling back to minimal fields + user_settings...", error.message);
          
          const fallbackPrograms = safePrograms.map(p => {
            return { 
              id: p.id, 
              name: p.name, 
              description: p.description, 
              user_id: p.user_id,
              is_deleted: p.is_deleted
            };
          });
          const fallbackRes = await supabase.from('programs').upsert(fallbackPrograms);
          
          if (!fallbackRes.error) {
            for (const p of safePrograms) {
              const { id, name, description, user_id, is_deleted, ...extras } = p;
              await supabase.from('user_settings').upsert({ 
                user_id: user.id, 
                key: `prog_extras_${p.id}`, 
                value: JSON.stringify(extras)
              }, { onConflict: 'user_id, key' });
            }
            error = null;
          } else {
            error = fallbackRes.error;
            console.error("Minimal fallback also failed:", error);
          }
        }

        if (!error) {
          const currentIds = safePrograms.map(p => p.id);
          await supabase.from('programs')
            .update({ is_deleted: true })
            .eq('user_id', user.id)
            .not('id', 'in', `(${currentIds.join(',')})`);
          return { success: true };
        } else {
          console.error("Supabase programs upsert error:", error);
        }
        return { success: false, error };
      } else {
        const { error: updateErr } = await supabase.from('programs')
          .update({ is_deleted: true })
          .eq('user_id', user.id);
        return { success: !updateErr, error: updateErr };
      }
    }
    return { success: false, error: new Error("Not logged in") };
  } catch (err) {
    console.error(err);
    return { success: false, error: err };
  }
};

export const getActiveProgram = () => {
  const stored = localStorage.getItem('fittrack_active_program');
  return stored ? JSON.parse(stored) : null;
};

export const saveActiveProgram = (activeProgram: any) => {
  if (activeProgram) {
    localStorage.setItem('fittrack_active_program', JSON.stringify(activeProgram));
  } else {
    localStorage.removeItem('fittrack_active_program');
  }
  
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      if (activeProgram) {
        supabase.from('user_settings').upsert({ user_id: user.id, key: 'active_program', value: JSON.stringify(activeProgram) }, { onConflict: 'user_id, key' }).then();
      } else {
        supabase.from('user_settings').delete().eq('user_id', user.id).eq('key', 'active_program').then();
      }
    }
  });
};

export const getWorkoutHistory = () => {
  const stored = localStorage.getItem('fittrack_history');
  return stored ? JSON.parse(stored) : [];
};

export const saveWorkoutToHistory = (workout: any) => {
  const history = getWorkoutHistory();
  const newWorkout = { ...workout, date: new Date().toISOString() };
  history.unshift(newWorkout);
  localStorage.setItem('fittrack_history', JSON.stringify(history));
  
  // Background sync
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('workout_history').insert({ ...newWorkout, user_id: user.id }).then();
    }
  });
};

export const getLastExerciseStats = (exerciseId: string) => {
  const history = getWorkoutHistory();
  for (const workout of history) {
    const exercise = workout.exercises?.find((e: any) => e.name === exerciseId);
    if (exercise && exercise.weight > 0) {
      return { weight: exercise.weight, reps: exercise.reps, sets: exercise.sets, date: workout.date };
    }
  }
  return null;
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
    if (user) {
      supabase.from('personal_records').insert({ ...newPr, user_id: user.id }).then();
    }
  });
  
  return prs;
};

export const deletePersonalRecord = (id: string) => {
  let prs = getPersonalRecords();
  prs = prs.filter((pr: any) => pr.id !== id);
  localStorage.setItem('fittrack_prs', JSON.stringify(prs));
  
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('personal_records').delete().eq('id', id).eq('user_id', user.id).then();
    }
  });
  
  return prs;
};

export const getBodyweightHistory = () => {
  const stored = localStorage.getItem('fittrack_bodyweight');
  return stored ? JSON.parse(stored) : [
    { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: 80 },
    { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: 79.5 },
    { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], weight: 79 },
    { date: new Date().toISOString().split('T')[0], weight: 78.5 },
  ];
};

export const saveBodyweight = (data: { weight?: number, bodyFat?: number, waist?: number, arms?: number, chest?: number, legs?: number }) => {
  const history = getBodyweightHistory();
  const date = new Date().toISOString().split('T')[0];
  
  const existingIndex = history.findIndex((entry: any) => entry.date === date);
  if (existingIndex >= 0) {
    history[existingIndex] = { ...history[existingIndex], ...data };
  } else {
    history.push({ date, ...data });
  }
  
  history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  localStorage.setItem('fittrack_bodyweight', JSON.stringify(history));
  
  // Background sync
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (user) {
      supabase.from('bodyweight_history').upsert({ user_id: user.id, date, ...data }, { onConflict: 'user_id, date' }).then();
    }
  });
  
  return history;
};

export const getEducationFolders = () => {
  const local = localStorage.getItem('fittrack_education_folders');
  return local ? JSON.parse(local) : [
    { id: '1', name: 'Gym Equipment', description: 'Learn how to use the machines safely.' },
    { id: '2', name: 'Nutrition', description: 'Fuel your workouts and recovery.' }
  ];
};

export const saveEducationFolders = (folders: any[]) => {
  localStorage.setItem('fittrack_education_folders', JSON.stringify(folders));
  // Background sync
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (user) {
      if (folders.length > 0) {
        const safeFolders = folders.map(f => ({ ...f, user_id: user.id }));
        const { error } = await supabase.from('education_folders').upsert(safeFolders);
        if (!error) {
          const currentIds = safeFolders.map(f => f.id);
          await supabase.from('education_folders').delete().eq('user_id', user.id).not('id', 'in', `(${currentIds.join(',')})`);
        }
      } else {
        await supabase.from('education_folders').delete().eq('user_id', user.id);
      }
    }
  });
};

export const getEducationVideos = () => {
  const local = localStorage.getItem('fittrack_education_videos');
  return local ? JSON.parse(local) : [];
};

export const saveEducationVideos = (videos: any[]) => {
  localStorage.setItem('fittrack_education_videos', JSON.stringify(videos));
  // Background sync
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (user) {
      if (videos.length > 0) {
        const safeVideos = videos.map(v => ({ ...v, user_id: user.id }));
        const { error } = await supabase.from('education_videos').upsert(safeVideos);
        if (!error) {
          const currentIds = safeVideos.map(v => v.id);
          await supabase.from('education_videos').delete().eq('user_id', user.id).not('id', 'in', `(${currentIds.join(',')})`);
        }
      } else {
        await supabase.from('education_videos').delete().eq('user_id', user.id);
      }
    }
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
  const allComments = getCommunityComments();
  
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
    },
    {
      id: "mock2",
      user: { name: "John Smith", avatar: "JS" },
      date: new Date(Date.now() - 86400000).toISOString(),
      workoutName: "Upper Body Power",
      exercises: [
        { name: "bench", sets: 4, reps: 8, weight: 85 },
        { name: "pullup", sets: 3, reps: 8, weight: 0 }
      ],
      volume: 2720,
      reward: { name: "Grizzly Bear", emoji: "🐻", count: 10, displayName: "Grizzly Bears" },
      likes: 8,
      comments: 1
    },
    {
      id: "mock3",
      user: { name: "Mike Tyson", avatar: "MT" },
      date: new Date(Date.now() - 172800000).toISOString(),
      workoutName: "Full Body Basics",
      exercises: [
        { name: "squat", sets: 5, reps: 10, weight: 150 },
        { name: "bench", sets: 5, reps: 10, weight: 100 },
        { name: "deadlift", sets: 3, reps: 5, weight: 180 }
      ],
      volume: 15200,
      reward: { name: "Chicken", emoji: "🐔", count: 15200, displayName: "Chickens" },
      likes: 45,
      comments: 12
    }
  ];

  const userFeed = history.map((w: any, index: number) => ({
    id: `user-${index}`,
    user: { name: "You", avatar: "Y" },
    date: w.date,
    workoutName: w.name || "Workout",
    exercises: w.exercises || [],
    volume: w.volume,
    reward: w.reward,
    likes: 0,
    comments: 0
  }));

  const allFeed = [...customPosts, ...userFeed, ...mockFeed].map(post => {
    const postComments = allComments.filter((c: any) => c.postId === post.id);
    return {
      ...post,
      commentsCount: (post.comments || 0) + postComments.length,
      postComments
    };
  });

  return allFeed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const syncFromSupabase = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  try {
    const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', user.id);
    
    const { data: ex } = await supabase.from('exercises').select('*');
    if (ex) {
      const parsedEx = ex
        .filter(e => e.is_deleted !== true)
        .map(e => ({
          ...e,
          category: typeof e.category === 'string' ? e.category.split(', ') : e.category,
          movementType: typeof e.movementType === 'string' ? e.movementType.split(', ') : e.movementType,
          trackingType: typeof e.trackingType === 'string' ? e.trackingType.split(', ') : e.trackingType
        }));
      localStorage.setItem('fittrack_exercises', JSON.stringify(parsedEx));
    }
    
    const { data: prog } = await supabase.from('programs').select('*');
    if (prog) {
      let activeProg = prog.filter(p => p.is_deleted !== true);
      
      if (settings) {
        activeProg = activeProg.map(p => {
          const coverSetting = settings.find(s => s.key === `cover_${p.id}`);
          let extraData: any = {};
          
          const extraSetting = settings.find(s => s.key === `prog_extras_${p.id}`);
          if (extraSetting) {
            try { extraData = JSON.parse(extraSetting.value); } catch(e) {}
          }
          
          return { 
            ...p,
            ...extraData,
            coverImage: p.coverImage || extraData.coverImage || (coverSetting ? coverSetting.value : undefined),
          };
        });
      }
      
      localStorage.setItem('fittrack_programs', JSON.stringify(activeProg));
    }
    
    const { data: hist } = await supabase.from('workout_history').select('*').eq('user_id', user.id).order('date', { ascending: false });
    if (hist) localStorage.setItem('fittrack_history', JSON.stringify(hist));
    
    const { data: bw } = await supabase.from('bodyweight_history').select('*').eq('user_id', user.id).order('date', { ascending: true });
    if (bw) localStorage.setItem('fittrack_bodyweight', JSON.stringify(bw));
    
    // const { data: prs } = await supabase.from('personal_records').select('*').eq('user_id', user.id).order('date', { ascending: false });
    // if (prs) localStorage.setItem('fittrack_prs', JSON.stringify(prs));

    const { data: folders } = await supabase.from('education_folders').select('*');
    if (folders) localStorage.setItem('fittrack_education_folders', JSON.stringify(folders));

    const { data: videos } = await supabase.from('education_videos').select('*');
    if (videos) localStorage.setItem('fittrack_education_videos', JSON.stringify(videos));

    if (settings) {
      const vimeo = settings.find(s => s.key === 'vimeo_token');
      if (vimeo) localStorage.setItem('fittrack_vimeo_token', vimeo.value);
      
      const anthropic = settings.find(s => s.key === 'anthropic_key');
      if (anthropic) localStorage.setItem('fittrack_anthropic_key', anthropic.value);
      
      const activeProg = settings.find(s => s.key === 'active_program');
      if (activeProg) {
        localStorage.setItem('fittrack_active_program', activeProg.value);
      } else {
        localStorage.removeItem('fittrack_active_program');
      }
    }
    
    // Check for workout reminders (disabled to prevent 404 on missing notifications table)
    /*
    const lastWorkout = hist?.[0];
    if (lastWorkout) {
      const daysSince = Math.floor((Date.now() - new Date(lastWorkout.date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 3) {
        const { data: existing } = await supabase.from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'workout_reminder')
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        
        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: "Time to hit the gym!",
            message: `It's been ${daysSince} days since your last workout. Ready for a session?`,
            type: 'workout_reminder'
          });
        }
      }
    }
    */

    // Dispatch custom event so components can re-render if needed
    window.dispatchEvent(new Event('fittrack_synced'));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const getNotifications = async () => {
  return [];
};

export const markNotificationRead = async (id: string) => {
  // disabled to prevent 404
};

export const sendNotification = async (title: string, message: string, userId?: string) => {
  // disabled to prevent 404
};

export const syncProfile = async () => {
  // disabled to prevent 404 on missing profiles table
};

export const getMembers = async () => {
  return [];
};

export const getMemberActivity = async (userId: string) => {
  const { data: history } = await supabase.from('workout_history')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  return history || [];
};

export const migrateLocalToSupabase = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  try {
    const storedEx = localStorage.getItem('fittrack_exercises');
    if (storedEx) {
      const ex = JSON.parse(storedEx);
      const safeEx = ex.map((e: any) => {
        let movType = e.movementType;
        if (typeof movType === 'string') movType = [movType];
        else if (!movType) movType = [];
        
        return {
          ...e,
          user_id: user.id,
          category: Array.isArray(e.category) ? e.category.join(', ') : e.category,
          movementType: movType
        };
      });
      await supabase.from('exercises').delete().eq('user_id', user.id);
      await supabase.from('exercises').insert(safeEx);
    }
    
    const storedProg = localStorage.getItem('fittrack_programs');
    if (storedProg) {
      const prog = JSON.parse(storedProg);
      await supabase.from('programs').delete().eq('user_id', user.id);
      await supabase.from('programs').insert(prog.map((p: any) => ({ ...p, user_id: user.id })));
    }
    
    const storedHist = localStorage.getItem('fittrack_history');
    if (storedHist) {
      const hist = JSON.parse(storedHist);
      await supabase.from('workout_history').delete().eq('user_id', user.id);
      await supabase.from('workout_history').insert(hist.map((h: any) => ({ ...h, user_id: user.id })));
    }
    
    const storedBw = localStorage.getItem('fittrack_bodyweight');
    if (storedBw) {
      const bw = JSON.parse(storedBw);
      await supabase.from('bodyweight_history').delete().eq('user_id', user.id);
      await supabase.from('bodyweight_history').insert(bw.map((b: any) => ({ ...b, user_id: user.id })));
    }
    
    const storedPrs = localStorage.getItem('fittrack_prs');
    if (storedPrs) {
      const prs = JSON.parse(storedPrs);
      await supabase.from('personal_records').delete().eq('user_id', user.id);
      await supabase.from('personal_records').insert(prs.map((p: any) => ({ ...p, user_id: user.id })));
    }

    const storedFolders = localStorage.getItem('fittrack_education_folders');
    if (storedFolders) {
      const folders = JSON.parse(storedFolders);
      await supabase.from('education_folders').delete().eq('user_id', user.id);
      await supabase.from('education_folders').insert(folders.map((f: any) => ({ ...f, user_id: user.id })));
    }

    const storedVideos = localStorage.getItem('fittrack_education_videos');
    if (storedVideos) {
      const videos = JSON.parse(storedVideos);
      await supabase.from('education_videos').delete().eq('user_id', user.id);
      await supabase.from('education_videos').insert(videos.map((v: any) => ({ ...v, user_id: user.id })));
    }

    const storedToken = localStorage.getItem('fittrack_vimeo_token');
    if (storedToken) {
      await supabase.from('user_settings').upsert({ user_id: user.id, key: 'vimeo_token', value: storedToken }, { onConflict: 'user_id, key' });
    }
    
    const storedActiveProg = localStorage.getItem('fittrack_active_program');
    if (storedActiveProg) {
      await supabase.from('user_settings').upsert({ user_id: user.id, key: 'active_program', value: storedActiveProg }, { onConflict: 'user_id, key' });
    }
    
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
