/**
 * Single storefront phone — use everywhere (header, footer, contacts, CTA).
 * Display as the owner requested; tel/messengers use E.164 digits.
 */

/** Visible format on the site */
export const STORE_PHONE_DISPLAY = "097 493-21-03";

/** E.164 with + (no tel: prefix) */
export const STORE_PHONE_E164 = "+380974932103";

/** Full tel: href for <a href> */
export const STORE_PHONE_TEL = "tel:+380974932103";

/** Digits only for wa.me / APIs */
export const STORE_PHONE_DIGITS = "380974932103";

export const STORE_PHONE_WHATSAPP = `https://wa.me/${STORE_PHONE_DIGITS}`;
export const STORE_PHONE_TELEGRAM = `https://t.me/+${STORE_PHONE_DIGITS}`;
export const STORE_PHONE_VIBER = `viber://chat?number=%2B${STORE_PHONE_DIGITS}`;
