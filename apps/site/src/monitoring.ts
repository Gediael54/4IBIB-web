export async function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || !import.meta.env.PROD) {
    return;
  }

  const Sentry = await import("@sentry/react");

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    tracePropagationTargets: [/^https:\/\/4ibib-web\.pages\.dev/]
  });
}
