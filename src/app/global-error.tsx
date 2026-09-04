"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", fontFamily: "system-ui, sans-serif", background: "#f7f7f5", color: "#171717" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem", boxSizing: "border-box" }}>
          <section style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
            <p style={{ fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: "1rem" }}>JobPilot AI</p>
            <h1 style={{ margin: "0 0 .75rem", fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>Something went wrong</h1>
            <p style={{ margin: "0 auto 1.5rem", maxWidth: 440, lineHeight: 1.6, color: "#5f5f5f" }}>
              JobPilot couldn’t load the application. Try again, or return to the dashboard.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: ".75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ border: 0, borderRadius: 999, padding: ".75rem 1.1rem", fontWeight: 700, cursor: "pointer" }}
              >
                Try again
              </button>
              <a
                href="/dashboard"
                style={{ border: "1px solid #d5d5d0", borderRadius: 999, padding: ".75rem 1.1rem", fontWeight: 700, textDecoration: "none", color: "inherit", background: "white" }}
              >
                Return to dashboard
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
