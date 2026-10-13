/**
 * Google Ads conversion tracking (account Pro Optics, 750-629-6746).
 *
 * One conversion action, "Звонок или сообщение с сайта" (category Contact,
 * counted once per click), fires when a visitor taps the phone, Telegram,
 * WhatsApp or Viber, and when an order, trade-in or premium request is sent.
 * Both values are public by design — they ship in every page's HTML.
 */

export const GOOGLE_ADS_ID = "AW-18402826190";
export const GOOGLE_ADS_CONTACT = "AW-18402826190/5QbhCKnxsJsdEM6vk8dE";

/** Fire-and-forget: never blocks the click or the form. */
export function reportContactConversion(): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", "conversion", { send_to: GOOGLE_ADS_CONTACT });
  } catch {
    /* ignore */
  }
}
