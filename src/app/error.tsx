"use client";

import { useEffect } from "react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the production UI generic; detailed errors stay out of the browser surface.
    console.error("JobPilot application error", { digest: arguments[0] });
  }, []);

  return (
    <main className="page-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px" }}>
      <section style={{ maxWidth: 620, textAlign: "center" }}>
        <div className="eyebrow">JobPilot AI · Recovery</div>
        <h1>Something went wrong.</h1>
        <p style={{ opacity: 0.72, lineHeight: 1.7, margin: "18px 0 28px" }}>
          The page hit an unexpected error. Your account and saved applications are not intentionally changed by this screen.
        </p>
        <button className="button primary" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
