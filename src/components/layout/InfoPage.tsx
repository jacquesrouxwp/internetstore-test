import { cn } from "@/lib/utils";

type InfoPageProps = {
  title: string;
  children: React.ReactNode;
  /** Optional content above the title (e.g. back link) */
  lead?: React.ReactNode;
  className?: string;
  /** Wider layout for blog grid */
  wide?: boolean;
};

/**
 * Shared shell for footer info pages — dense panel on starfield, design tokens only.
 */
export function InfoPage({
  title,
  children,
  lead,
  className,
  wide,
}: InfoPageProps) {
  return (
    <div className={cn("info-page container-shop", className)}>
      <div className={wide ? "w-full" : "info-page__inner"}>
        {lead}
        <h1 className="info-page__title">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function InfoPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("info-page__panel", className)}>
      <div className="info-page__body">{children}</div>
    </div>
  );
}
