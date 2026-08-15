import { buildOrganizationJsonLd } from "@/lib/organization-json-ld";
import type { OrganizationSocial } from "@/lib/organization-json-ld";
import { getSiteUrl } from "@/lib/site-url";

/** Homepage Organization JSON-LD for Google brand / logo in search. */
export function OrganizationJsonLd({
  name = "Pro-Optics",
  social,
}: {
  name?: string;
  social?: OrganizationSocial | null;
}) {
  const data = buildOrganizationJsonLd({
    siteUrl: getSiteUrl(),
    name,
    social,
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
