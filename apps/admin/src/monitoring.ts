import * as Sentry from "@sentry/react";

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn || !import.meta.env.PROD) {
    return;
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    tracePropagationTargets: [/^https:\/\/4ibib-web\.pages\.dev/]
  });
}

export function setSentryUser(user: { id: string } | null) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: user.id });
}

export function addMutationBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category: "mutation",
    message,
    level: "info",
    data
  });
}
