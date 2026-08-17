import React from "react";

interface State {
  error: Error | null;
}

/**
 * App-wide error boundary.
 *
 * Without this, any unhandled exception in a route component unmounts the
 * entire React tree → blank white screen (especially visible in the installed
 * PWA where there's no browser devtools to see what happened).
 *
 * Instead, show a friendly "Something went wrong" screen with a reload button
 * and log the error to the console (optionally to Supabase for staff visibility).
 */
export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
            background: "hsl(0 0% 9%)",
            color: "hsl(0 0% 98%)",
            fontFamily: "Barlow, sans-serif",
          }}
        >
          <h2
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "2rem",
              letterSpacing: "0.05em",
              marginBottom: "8px",
            }}
          >
            Something went wrong
          </h2>
          <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24, maxWidth: 360 }}>
            {this.state.error.message || "An unexpected error occurred while loading this page."}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "hsl(84.8 100% 46.5%)",
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "12px 32px",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload the app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Global handler for failed dynamic imports / chunk loads.
 *
 * After a deploy, an installed PWA may still hold an old index.html pointing
 * at hashed asset filenames that no longer exist. The browser throws a
 * "Loading chunk" / "dynamically imported module" error. Catch it and force
 * a single reload so the fresh shell is fetched.
 */
export function installChunkErrorHandler() {
  window.addEventListener("error", (e: any) => {
    const msg = String(e?.message || "");
    if (
      /Loading chunk|dynamically imported module|Importing a module script failed|error loading/i.test(
        msg
      )
    ) {
      if (!sessionStorage.getItem("reloadedOnce")) {
        sessionStorage.setItem("reloadedOnce", "1");
        window.location.reload();
      }
    }
  });
}
