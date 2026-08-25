/**
 * Homepage rail de-duplication.
 *
 * A product can carry several marketing flags at once (top + hit + new + sale),
 * and each rail queries one flag independently — so the same item was rendering
 * in up to four rails on one screen. Measured on production: 32 card slots but
 * only 15 distinct products, with one item repeated four times.
 *
 * Each product is therefore claimed by the FIRST rail that offers it, and later
 * rails fall through to their next candidates. Over-fetching upstream keeps the
 * rails full after the losers are dropped.
 */

/** Fetch this many per rail so a rail can still fill up after de-duplication. */
export const RAIL_FETCH_MULTIPLIER = 3;

type HasId = { id: string };

/**
 * Assign products to rails so none appears twice across the page.
 * Rail order is priority order: earlier rails pick first.
 *
 * @param rails candidate lists, already ordered by display priority
 * @param perRail how many cards each rail should end up with
 * @param reserved ids already shown elsewhere on the page (e.g. a curated rail)
 */
export function dedupeRails<T extends HasId>(
  rails: T[][],
  perRail: number,
  reserved: Iterable<string> = []
): T[][] {
  const used = new Set(reserved);
  return rails.map((rail) => {
    const out: T[] = [];
    for (const item of rail) {
      if (out.length >= perRail) break;
      if (!item || used.has(item.id)) continue;
      used.add(item.id);
      out.push(item);
    }
    return out;
  });
}

/** Drop null/undefined and any duplicate ids, preserving order. */
export function uniqueById<T extends HasId>(
  items: (T | null | undefined)[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
