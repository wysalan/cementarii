import { compareWishRecords, type WishRecord } from "./wish";
import type { LocalWishBanner } from "./wishBanners";

export type AnnotatedWishRecord = WishRecord & {
  /** 在這個卡池裡是第幾抽（從 1 開始） */
  no: number;
  /** 4 星與 5 星才有：距離上一個同星級物品的抽數 */
  pity?: number;
  /** 有傳入卡池資料、而且找得到當期卡池時才有：是不是當期 UP 的物品 */
  up?: boolean;
  /** 上一個同星級的物品不是 UP，這一個必定是 UP（大保底） */
  guaranteed?: boolean;
};

export type WishUpStatus = "won" | "lost" | "guaranteed";

export const WISH_UP_LABEL: Record<WishUpStatus, string> = {
  won: "沒歪",
  lost: "小保底",
  guaranteed: "大保底",
};

/** 這一抽有沒有歪；不知道是不是 UP 時是 undefined */
export function wishUpStatus(record: AnnotatedWishRecord): WishUpStatus | undefined {
  if (record.up === undefined) return undefined;
  if (!record.up) return "lost";
  return record.guaranteed ? "guaranteed" : "won";
}

/**
 * 把同一個卡池的紀錄由舊到新排序，標上第幾抽與出貨時的抽數
 * 抽到 5 星不會重算 4 星的抽數，與遊戲的保底計算一致
 * @param banners 有 UP 的卡池才傳入，用來標示每個 4 星與 5 星是不是當期 UP
 */
export function annotateWishRecords(
  records: WishRecord[],
  banners?: LocalWishBanner[],
): AnnotatedWishRecord[] {
  let since5 = 0;
  let since4 = 0;
  const guaranteed = { 4: false, 5: false };
  const markUp = (record: AnnotatedWishRecord, rank: 4 | 5) => {
    const banner = banners?.find((b) => b.start <= record.time && record.time <= b.end);
    if (!banner) return;
    record.up = banner.up[rank].has(record.itemId);
    record.guaranteed = guaranteed[rank];
    guaranteed[rank] = !record.up;
  };
  return records.toSorted(compareWishRecords).map((record, index) => {
    since5++;
    since4++;
    const annotated: AnnotatedWishRecord = { ...record, no: index + 1 };
    if (record.rank === 5) {
      annotated.pity = since5;
      since5 = 0;
      markUp(annotated, 5);
    } else if (record.rank === 4) {
      annotated.pity = since4;
      since4 = 0;
      markUp(annotated, 4);
    }
    return annotated;
  });
}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

/** 不歪率：不是大保底的情況下抽到 UP 的比例；沒有可以計算的紀錄時是 null */
function upRate(records: AnnotatedWishRecord[]) {
  const counted = records.filter((r) => r.up !== undefined && !r.guaranteed);
  return counted.length ? counted.filter((r) => r.up).length / counted.length : null;
}

/** 平均幾抽才抽到一個 UP：歪掉的抽數算進下一個 UP；沒有抽到過 UP 時是 null */
function upAverage(records: AnnotatedWishRecord[]) {
  const costs: number[] = [];
  let spent = 0;
  for (const record of records) {
    spent += record.pity!;
    if (record.up) costs.push(spent);
    // 找不到卡池的那一個不知道是不是 UP，之前累積的抽數不算
    if (record.up !== false) spent = 0;
  }
  return average(costs);
}

/** 一個卡池的統計；傳入 annotateWishRecords 的結果 */
export function summarizeWishPool(records: AnnotatedWishRecord[]) {
  const pities = (rank: number) => records.filter((r) => r.rank === rank).map((r) => r.pity!);
  const lastIndex = (rank: number) => records.findLastIndex((r) => r.rank === rank);
  const fives = records.filter((r) => r.rank === 5);
  const fours = records.filter((r) => r.rank === 4);
  return {
    total: records.length,
    rank5: fives.length,
    rank4: fours.length,
    rank3: records.filter((r) => r.rank === 3).length,
    /** 目前已經墊了幾抽 */
    pity5: records.length - 1 - lastIndex(5),
    pity4: records.length - 1 - lastIndex(4),
    average5: average(pities(5)),
    average4: average(pities(4)),
    upAverage5: upAverage(fives),
    upAverage4: upAverage(fours),
    upRate5: upRate(fives),
    upRate4: upRate(fours),
    fives,
    from: records[0]?.time.slice(0, 10),
    to: records.at(-1)?.time.slice(0, 10),
  };
}

export type WishVersionSummary = { version: string; total: number; fives: AnnotatedWishRecord[] };

/**
 * 每個版本的抽數與 5 星；從第一個到最後一個有紀錄的大版本，沒抽的小版本也會列出
 * @param versions wishVersionStarts 的結果
 */
export function summarizeWishVersions(
  records: AnnotatedWishRecord[],
  versions: { version: string; start: string }[],
): WishVersionSummary[] {
  const summary = versions.map(({ version }) => ({
    version,
    total: 0,
    fives: [] as AnnotatedWishRecord[],
  }));
  for (const record of records) {
    const entry = summary[versions.findLastIndex((v) => v.start <= record.time)];
    if (!entry) continue;
    entry.total++;
    if (record.rank === 5) entry.fives.push(record);
  }
  const majorOf = (entry?: WishVersionSummary) => entry?.version.split(".")[0];
  const first = majorOf(summary.find((v) => v.total));
  const last = majorOf(summary.findLast((v) => v.total));
  return summary.slice(
    summary.findIndex((v) => majorOf(v) === first),
    summary.findLastIndex((v) => majorOf(v) === last) + 1,
  );
}
