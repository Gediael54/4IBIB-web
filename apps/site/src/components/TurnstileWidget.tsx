import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (container: HTMLElement, options: { sitekey: string; theme?: string; language?: string }) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetProps {
  siteKey: string;
}

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 10_000;

export default function TurnstileWidget({ siteKey }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let widgetId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const startedAt = Date.now();

    function tryRender() {
      if (cancelled) return;
      const api = window.turnstile;
      if (api && container) {
        widgetId = api.render(container, {
          sitekey: siteKey,
          theme: "light",
          language: "pt-BR"
        });
        return;
      }
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) return;
      timer = setTimeout(tryRender, POLL_INTERVAL_MS);
    }

    tryRender();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [siteKey]);

  return <div ref={containerRef} className="turnstile-widget" />;
}
