/**
 * Schema.org Organization + LocalBusiness JSON-LD.
 * Helps Google associate brand logo / NAP with the site.
 *
 * Note: the logo pin on Google Maps is primarily controlled by
 * Google Business Profile (upload logo there). Structured data supports SEO.
 */

import { getSiteUrl } from "@/lib/site-url";
import {
  STORE_PHONE_E164,
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

export type OrganizationAddress = {
  streetAddress?: string;
  addressLocality?: string;
  addressCountry?: string;
  postalCode?: string;
};

export function buildOrganizationJsonLd(input?: {
  siteUrl?: string;
  name?: string;
  social?: OrganizationSocial | null;
  phone?: string | null;
  email?: string | null;
  address?: string | OrganizationAddress | null;
  hours?: string | null;
}): Record<string, unknown> {
  const siteUrl = (input?.siteUrl || getSiteUrl()).replace(/\/$/, "");
  const name = (input?.name || "Pro-Optics").trim() || "Pro-Optics";
  const social = input?.social || {};
  const logoUrl = `${siteUrl}/logo.png`;

  const sameAs = [
    social.telegram || process.env.NEXT_PUBLIC_TELEGRAM_URL || STORE_PHONE_TELEGRAM,
    social.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP_URL || STORE_PHONE_WHATSAPP,
    social.instagram || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
    social.facebook || process.env.NEXT_PUBLIC_FACEBOOK_URL || "",
    social.youtube || process.env.NEXT_PUBLIC_YOUTUBE_URL || "",
  ]
    .map((u) => String(u || "").trim())
    .filter((u) => /^https?:\/\//i.test(u));

  const uniqueSameAs = Array.from(new Set(sameAs));

  const phone =
    (input?.phone && String(input.phone).trim()) || STORE_PHONE_E164;

  // Parse free-form address "Київ, бульвар Лесі Українки 26"
  let streetAddress = "бульвар Лесі Українки 26";
  let addressLocality = "Київ";
  if (input?.address && typeof input.address === "object") {
    streetAddress = input.address.streetAddress || streetAddress;
    addressLocality = input.address.addressLocality || addressLocality;
  } else if (typeof input?.address === "string" && input.address.trim()) {
    const parts = input.address.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      addressLocality = parts[0];
      streetAddress = parts.slice(1).join(", ");
    } else {
      streetAddress = input.address.trim();
    }
  }

  const logoObject = {
    "@type": "ImageObject",
    url: logoUrl,
    contentUrl: logoUrl,
    width: 512,
    height: 512,
    caption: name,
  };

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "Store"],
    "@id": `${siteUrl}/#organization`,
    name,
    alternateName: ["Pro Optics", "ProOptics", "Про-Оптікс"],
    url: siteUrl,
    logo: logoObject,
    image: [logoUrl, `${siteUrl}/icon-512.png`],
    telephone: phone,
    priceRange: "$$",
    currenciesAccepted: "UAH",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    areaServed: {
      "@type": "Country",
      name: "UA",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality,
      addressCountry: "UA",
    },
    // Online store + pickup/consult in Kyiv
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${name} ${streetAddress} ${addressLocality}`
    )}`,
  };

  if (input?.email) {
    data.email = String(input.email).trim();
  }

  if (input?.hours && String(input.hours).trim()) {
    // Free text for humans; Google prefers OpeningHoursSpecification but text helps
    data.openingHours = String(input.hours).trim();
  }

  if (uniqueSameAs.length) {
    data.sameAs = uniqueSameAs;
  }

  // Contact point for customer service (helps Knowledge Panel)
  data.contactPoint = [
    {
      "@type": "ContactPoint",
      telephone: phone,
      contactType: "customer service",
      areaServed: "UA",
      availableLanguage: ["uk", "ru"],
    },
  ];

  return data;
}
