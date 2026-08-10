/**
 * Instant navigation feedback when switching categories / opening catalog.
 */
export default function CatalogLoading() {
  return (
    <div className="container-shop animate-pulse py-5 sm:py-8">
      <div className="mb-4 h-4 w-40 rounded bg-white/10" />
      <div className="mb-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 shrink-0 rounded-full bg-white/10"
          />
        ))}
      </div>
      <div className="mb-6 h-8 w-56 rounded bg-white/10" />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-[var(--radius-card)] bg-white/[0.06]"
          />
        ))}
      </div>
    </div>
  );
}
