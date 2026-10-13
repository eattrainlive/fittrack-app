import { supabase } from "./supabase";

const QUEUE_KEY = "fittrack_checkin_queue";
const MAX_QUEUE = 500;

const STAFF_SECRET =
  import.meta.env.VITE_STAFF_SECRET ||
  "42a37f4a3f9ceed78d7928187bfc339d25af43d79d5fb0b0";

export interface QueuedScan {
  code?: string;
  manualUserId?: string;
  method: string;
  at: string;
}

export const getQueue = (): QueuedScan[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const enqueueScan = (scan: QueuedScan): void => {
  try {
    const q = getQueue();
    q.push(scan);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {
    /* ignore */
  }
};

const persistQueue = (items: QueuedScan[]): void => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

/**
 * Replay queued scans through the check-in edge function, removing items that
 * succeed. Best-effort — never throws.
 */
export const flushQueue = async (): Promise<void> => {
  const queue = getQueue();
  if (queue.length === 0) return;
  const remaining: QueuedScan[] = [];
  for (const scan of queue) {
    try {
      const { error } = await supabase.functions.invoke("check-in", {
        body: {
          staffSecret: STAFF_SECRET,
          ...scan,
          site: "main",
          deviceId: "reception-tablet",
        },
      });
      if (error) {
        remaining.push(scan);
      }
      // success — drop it (the edge function dedupes same-day visits)
    } catch {
      remaining.push(scan);
    }
  }
  persistQueue(remaining);
};
