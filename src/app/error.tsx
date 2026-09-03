"use client";

import { useEffect } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep production diagnostics out of the UI; the hosting platform can capture the error.
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <section style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>JobPilot AI</p>
        <h1>Something went wrong</h1>
        <p>We couldn’t load this page. Try again, or return to your dashboard.</p>
        <button type="button" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
