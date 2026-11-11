import { STORE_PHONE_TEL } from "@/lib/contact";
import { splitPhones } from "@/lib/phone-links";

/** Plain text where the store numbers become tel: links (the chooser opens on them). */
export function PhoneText({ text }: { text: string }) {
  const parts = splitPhones(text);
  if (parts.length === 1 && !parts[0].phone) return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.phone ? (
          <a key={i} href={p.tel || STORE_PHONE_TEL} className="phone-link">
            {p.text}
          </a>
        ) : (
          p.text
        )
      )}
    </>
  );
}
