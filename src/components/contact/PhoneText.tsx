import { STORE_PHONE_TEL } from "@/lib/contact";
import { splitPhones } from "@/lib/phone-links";

/** Plain text where the store number becomes a tel: link (the chooser opens on it). */
export function PhoneText({ text }: { text: string }) {
  const parts = splitPhones(text);
  if (parts.length === 1 && !parts[0].phone) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.phone ? (
          <a key={i} href={STORE_PHONE_TEL} className="phone-link">
            {p.text}
          </a>
        ) : (
          p.text
        )
      )}
    </>
  );
}
