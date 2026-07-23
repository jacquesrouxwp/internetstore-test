import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  title?: string;
};

/** Brand: Telegram #229ED9 — simple-icons path, currentColor fill */
export function IconTelegram({ className, title = "Telegram" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn("block shrink-0", className)}
      fill="currentColor"
    >
      <title>{title}</title>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** Brand: Viber #7360F2 — simple-icons path, currentColor fill */
export function IconViber({ className, title = "Viber" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn("block shrink-0", className)}
      fill="currentColor"
    >
      <title>{title}</title>
      <path d="M11.4.002C9.475.028 5.331.344 3.014 2.467 1.382 4.259.011 7.476.039 11.266c.027 3.81.945 6.351 2.661 8.046 1.518 1.5 4.258 2.668 7.546 2.678h.028c3.29-.01 6.03-1.179 7.548-2.678 1.716-1.695 2.634-4.236 2.661-8.046.027-3.79-1.344-7.007-2.975-8.799C15.218.344 11.076.028 9.151.002h2.249zm.089 1.649c1.626.02 5.103.287 7.045 2.01 1.454 1.6 2.583 4.35 2.56 7.58-.023 3.37-.867 5.592-2.27 6.978-1.358 1.341-3.746 2.385-6.717 2.395-2.97-.01-5.358-1.054-6.716-2.395-1.403-1.386-2.247-3.608-2.27-6.978-.023-3.23 1.106-5.98 2.56-7.58 1.942-1.723 5.419-1.99 7.045-2.01h.763zm-2.84 3.554a.75.75 0 00-.75.75v.75a.75.75 0 001.5 0v-.75a.75.75 0 00-.75-.75zm5.68 0a.75.75 0 00-.75.75v.75a.75.75 0 001.5 0v-.75a.75.75 0 00-.75-.75zM8.017 7.13a.75.75 0 00-.75.75v5.25a.75.75 0 001.5 0V7.88a.75.75 0 00-.75-.75zm7.966 0a.75.75 0 00-.75.75v5.25a.75.75 0 001.5 0V7.88a.75.75 0 00-.75-.75zm-5.975 1.125a.75.75 0 00-.75.75v3.375a.75.75 0 001.5 0V9.005a.75.75 0 00-.75-.75zm3.984 0a.75.75 0 00-.75.75v3.375a.75.75 0 001.5 0V9.005a.75.75 0 00-.75-.75zm-1.992 1.5a.75.75 0 00-.75.75v3.375a.75.75 0 001.5 0v-3.375a.75.75 0 00-.75-.75zm0 5.063a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" />
    </svg>
  );
}

/** Brand: WhatsApp #25D366 — simple-icons path, currentColor fill */
export function IconWhatsApp({ className, title = "WhatsApp" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn("block shrink-0", className)}
      fill="currentColor"
    >
      <title>{title}</title>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export const SOCIAL_BRAND = {
  telegram: { color: "#229ED9", Icon: IconTelegram },
  viber: { color: "#7360F2", Icon: IconViber },
  whatsapp: { color: "#25D366", Icon: IconWhatsApp },
} as const;

export type SocialBrandId = keyof typeof SOCIAL_BRAND;

/** Unified size for footer / consult row — only the glyph, no plate */
export function SocialIconLink({
  brand,
  href,
  className,
  size = 28,
}: {
  brand: SocialBrandId;
  href: string;
  className?: string;
  size?: number;
}) {
  const { color, Icon } = SOCIAL_BRAND[brand];
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={brand}
      className={cn(
        "inline-flex items-center justify-center transition-opacity hover:opacity-85",
        className
      )}
      style={{ color, width: size, height: size }}
    >
      <Icon className="h-full w-full" />
    </a>
  );
}
