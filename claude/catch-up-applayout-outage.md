# Catch-up prompt — paste into the builder (AppLayout must not hang on the loading ring)

`AppLayout` wraps the whole app and shows a full-screen loading ring while `isAuthLoading`, which only
clears when `supabase.auth.getSession()` resolves. During a Supabase auth outage that call can hang, so the
ring stays forever and NOTHING renders — including the TV display and check-in kiosk (their bypass was
*after* the ring check). Keep these two fixes:

1. **Safety timeout on the session check** — in the auth `useEffect`, before/around `getSession()`:
   ```ts
   const authTimeout = setTimeout(() => setIsAuthLoading(false), 4000);
   supabase.auth.getSession().then(({ data: { session } }) => {
     clearTimeout(authTimeout);
     // …existing setUser / checkMembership / setIsAuthLoading(false)…
   });
   ```
   So the ring always clears within 4s even if auth hangs.

2. **Render critical/public routes BEFORE the loading ring** — TV, check-in kiosk and auth must never wait
   on the session:
   ```ts
   const isKiosk = location.pathname.startsWith("/checkin");
   // …
   if (isAuthPage || isTVMode || isKiosk) {
     return <div className="min-h-screen bg-background font-sans">{children}</div>;
   }
   if (isAuthLoading) { return <loading ring>; }
   ```
   (The `isAuthPage || isTVMode || isKiosk` block must come ABOVE the `if (isAuthLoading)` block.)

Don't revert to blocking all routes behind the ring with no timeout.
