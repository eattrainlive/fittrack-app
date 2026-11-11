// Drop-in, non-hanging replacement for supabase.auth.getUser().
//
// getUser() makes a network call to validate the token and can deadlock in a
// PWA (navigator LockManager / stalled auth refresh), freezing anything that
// awaits it. getCurrentUser() reads the already-stored session locally (no
// network), wrapped in a timeout so it can never hang. It returns the SAME shape
// as getUser() — { data: { user }, error } — so it's a mechanical swap at every
// call site with no other changes needed.
import { supabase } from "./supabase";

const withTimeout = <T>(p: PromiseLike<T>, ms = 8000): Promise<T> =>
  Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("auth-timeout")), ms),
    ),
  ]);

export const getCurrentUser = async (): Promise<{
  data: { user: any | null };
  error: any;
}> => {
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession());
    return { data: { user: data?.session?.user ?? null }, error: error ?? null };
  } catch (e) {
    return { data: { user: null }, error: e };
  }
};
