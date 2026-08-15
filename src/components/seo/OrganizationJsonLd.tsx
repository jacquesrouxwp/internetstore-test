import { buildOrganizationJsonLd } from "@/lib/organization-json-ld";
import type { OrganizationSocial } from "@/lib/organization-json-ld";
import { getSiteUrl } from "@/lib/site-url";

/** Organization + LocalBusiness JSON-LD (logo, NAP) for Google. */
export function OrganizationJsonLd({
  name = "Pro-Optics",
  social,
  phone,
  email,
  address,
  hours,
}: {
  name?: string;
  social?: OrganizationSocial | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string | null;
}) {
  const data = buildOrganizationJsonLd({
    siteUrl: getSiteUrl(),
    name,
    social,
    phone,
    email,
    address,
    hours,
  });
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
