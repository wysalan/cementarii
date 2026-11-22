/** 卡池資料的時間是亞服當地時間 */
const BANNER_TIMEZONE = 8;

export type WishBanner = {
  pool: string;
  version: string;
  startsAt: string;
  endsAt: string;
  /** 全球同時開始（結束），其他伺服器要換算成當地時間 */
  startsGlobally: boolean;
  endsGlobally: boolean;
  fiveStarIds: number[];
  fourStarIds: number[];
};

/** 換算成帳號所在伺服器當地時間的卡池 */
export type LocalWishBanner = { start: string; end: string; up: Record<4 | 5, Set<number>> };

function shiftTime(time: string, hours: number) {
  if (!hours) return time;
  const shifted = new Date(Date.parse(`${time.replace(" ", "T")}Z`) + hours * 3_600_000);
  return shifted.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * 取出一種卡池的各期資料，並把時間換成指定時區的當地時間，之後可以直接和祈願紀錄的時間比較
 * @param pool 卡池的 slug（character、weapon、chronicled）
 * @param timezone 帳號的時區（UTC 偏移的小時數）
 */
export function localizeWishBanners(
  banners: WishBanner[],
  pool: string,
  timezone: number,
): LocalWishBanner[] {
  const offset = timezone - BANNER_TIMEZONE;
  return banners
    .filter((banner) => banner.pool === pool)
    .map((banner) => ({
      start: shiftTime(banner.startsAt, banner.startsGlobally ? offset : 0),
      end: shiftTime(banner.endsAt, banner.endsGlobally ? offset : 0),
      up: { 4: new Set(banner.fourStarIds), 5: new Set(banner.fiveStarIds) },
    }));
}

/** 各版本在指定時區的開始時間（由舊到新）；以該版本最早開始的卡池為準 */
export function wishVersionStarts(banners: WishBanner[], timezone: number) {
  const starts = new Map<string, string>();
  for (const banner of banners) {
    const start = shiftTime(
      banner.startsAt,
      banner.startsGlobally ? timezone - BANNER_TIMEZONE : 0,
    );
    const known = starts.get(banner.version);
    if (!known || start < known) starts.set(banner.version, start);
  }
  return [...starts]
    .map(([version, start]) => ({ version, start }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
