/**
 * Storefront phones — both shown everywhere (header, footer, contacts, CTA);
 * each has its own Telegram and WhatsApp. Display as the owner requested;
 * tel/messengers use E.164 digits.
 */

/** The main number — first everywhere (owner's choice, 14.11.2026). Visible format: +380 XX XXX XX XX */
export const STORE_PHONE_DISPLAY = "+380 98 218 17 82";

/** E.164 with + (no tel: prefix). Same number as the display, country code included. */
export const STORE_PHONE_E164 = "+380982181782";

/** Full tel: href for <a href> — E.164 of the displayed +380 number */
export const STORE_PHONE_TEL = "tel:+380982181782";

/** Digits only for wa.me / APIs */
export const STORE_PHONE_DIGITS = "380982181782";

export const STORE_PHONE_WHATSAPP = `https://wa.me/${STORE_PHONE_DIGITS}`;
export const STORE_PHONE_TELEGRAM = `https://t.me/+${STORE_PHONE_DIGITS}`;
export const STORE_PHONE_VIBER = `viber://chat?number=%2B${STORE_PHONE_DIGITS}`;

/** The second number, shown after the main one — also on Telegram and WhatsApp */
export const STORE_PHONE_2_DISPLAY = "+380 63 789 76 99";
export const STORE_PHONE_2_E164 = "+380637897699";
export const STORE_PHONE_2_TEL = "tel:+380637897699";

/**
 * pro-optics.ua is not a registered domain, so mail to it bounces — yet it was
 * the storefront address (and may still sit in admin settings). Never publish
 * an address on a dead domain; a real mailbox set in admin shows up as-is.
 */
const DEAD_EMAIL_DOMAINS = ["pro-optics.ua"];


export function publicStoreEmail(email: string | null | undefined): string | null {
  const value = (email || "").trim();
  const domain = value.split("@")[1]?.toLowerCase();
  if (!domain || DEAD_EMAIL_DOMAINS.includes(domain)) return null;
  return value;
}

/** Storefront mailbox — forwarded to the owner (ImprovMX). */
export const STORE_EMAIL = "info@pro-optics.com.ua";
