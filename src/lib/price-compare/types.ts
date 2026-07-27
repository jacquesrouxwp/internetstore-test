export type Competitor = {
  id: string;
  slug: string;
  name: string;
  website?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CompetitorProductLink = {
  id: string;
  productId: string;
  competitorId: string;
  competitorName?: string;
  productUrl: string;
  lastPrice: number | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  isActive: boolean;
};

export type PriceCompareLine = {
  competitorId: string;
  competitorName: string;
  competitorPrice: number;
  ourPrice: number;
  /** competitorPrice - ourPrice; positive = we are cheaper */
  savingUah: number;
  url?: string | null;
  checkedAt: string | null;
  isStale: boolean;
};

export type PriceCompareSummary = {
  ourPrice: number;
  /** Best (max) saving where we are cheaper */
  bestSavingUah: number;
  bestCompetitorName: string;
  bestCompetitorPrice: number;
  checkedAt: string | null;
  isStale: boolean;
  lines: PriceCompareLine[];
};

/** Hide tiny savings noise */
export const MIN_SAVINGS_UAH = Number(
  process.env.PRICE_COMPARE_MIN_SAVINGS || 300
);

/** Days after which data is marked stale */
export const STALE_DAYS = Number(process.env.PRICE_COMPARE_STALE_DAYS || 14);

export const MAX_COMPETITORS = 3;
