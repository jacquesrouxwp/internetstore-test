/**
 * Track “write to manager” intent (Telegram / WhatsApp / phone).
 *
 * Counts clicks on site CTAs — not messages actually received in messengers.
 * Real inbox stats still live in Telegram / WhatsApp Business.
 */

export type ConsultChannel = "telegram" | "whatsapp" | "phone" | "open_sheet";
export type ConsultSource =
  | "hero"
  | "widget"
  | "footer"
  | "header"
  | "catalog"
  | "other";

export type ConsultTrackPayload = {
  channel: ConsultChannel;
  source: ConsultSource;
  path?: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Fire-and-forget: Vercel Analytics + GA4 + Meta Pixel + our DB. */
export function trackConsultClick(
  channel: ConsultChannel,
  source: ConsultSource
): void {
  if (typeof window === "undefined") return;

  const path =
    window.location.pathname + (window.location.search || "");
  const props = { channel, source, path };

  // Vercel Web Analytics custom event
  try {
    // Dynamic import keeps SSR clean; track is sync enough via window.va
    void import("@vercel/analytics").then((m) => {
      m.track("consult_click", props);
    });
  } catch {
    /* ignore */
  }
  try {
    window.va?.("event", { name: "consult_click", data: props });
  } catch {
    /* ignore */
  }

  // Google Analytics 4 (if NEXT_PUBLIC_GA_ID loaded)
  try {
    window.gtag?.("event", "consult_click", {
      event_category: "consult",
      event_label: `${source}:${channel}`,
      consult_channel: channel,
      consult_source: source,
    });
  } catch {
    /* ignore */
  }

  // Meta Pixel Contact
  try {
    window.fbq?.("track", "Contact", {
      content_name: `${source}_${channel}`,
    });
  } catch {
    /* ignore */
  }

  // Own store (admin stats) — best-effort, never blocks navigation
  try {
    const body = JSON.stringify({
      channel,
      source,
      path: path.slice(0, 500),
    } satisfies ConsultTrackPayload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/consult", blob);
    } else {
      void fetch("/api/analytics/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* ignore */
  }
}
