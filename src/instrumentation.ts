// Keep the Next.js instrumentation hook side-effect free.
//
// Production configuration is validated by the health endpoint and by the
// individual server-side modules that need those settings. Throwing from the
// instrumentation hook can prevent every route from loading on Vercel before
// those checks can report a useful 503 response.
export function register() {
  // Intentionally no-op.
}
