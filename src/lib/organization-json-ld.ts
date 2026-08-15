/**
 * Schema.org Organization JSON-LD for homepage / sitewide brand signals.
 * logo must be absolute HTTPS URL on the store domain.
 */

import { getSiteUrl } from "@/lib/site-url";
import {
  STORE_PHONE_TELEGRAM,
  STORE_PHONE_WHATSAPP,
} from "@/lib/contact";

export type OrganizationSocial = {
  telegram?: string | null;
  whatsapp?: string | null;
  viber?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
};

export function buildOrganizationJsonLd(input?: {
  siteUrl?: string;
  name?: string;
  social?: OrganizationSocial | null;
}): Record<string, unknown> {
  const siteUrl = (input?.siteUrl || getSiteUrl()).replace(/\/$/, "");
  const name = (input?.name || "Pro-Optics").trim() || "Pro-Optics";
  const social = input?.social || {};

  const sameAs = [
    social.telegram || process.env.NEXT_PUBLIC_TELEGRAM_URL || STORE_PHONE_TELEGRAM,
    social.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_URL || STORE_PHONE_WHATSAPP,
    social.instagram || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
    social.facebook || process.env.NEXT_PUBLIC_FACEBOOK_URL || "",
    social.youtube || process.env.NEXT_PUBLIC_YOUTUBE_URL || "",
  ]
    .map((u) => String(u || "").trim())
    .filter((u) => /^https?:\/\//i.test(u));

  // Deduplicate
  const uniqueSameAs = Array.from(new Set(sameAs));

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    image: `${siteUrl}/logo.png`,
  };

  if (uniqueSameAs.length) {
    data.sameAs = uniqueSameAs;
  }

  return data;
}
