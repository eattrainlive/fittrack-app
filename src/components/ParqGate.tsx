// PAR-Q is now handled as step 1 of the single first-run flow (FirstRunFlow),
// so members never get the medical form stacked on top of the install prompt and
// event popup. This wrapper is kept as a thin passthrough so the route tree in
// App.tsx doesn't need changing.
export function ParqGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default ParqGate;
