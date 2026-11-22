import { WISH_POOLS, type WishPoolKey } from "./wish";

/** 官方祈願紀錄的一筆資料，欄位名稱與 UIGF 相同 */
export type WishLogRow = Record<
  "id" | "uid" | "gacha_type" | "item_id" | "name" | "rank_type" | "time",
  string
>;

export const WISH_LOG_PAGE_SIZE = 20;

/** 從貼上的祈願紀錄網址取出查詢需要的參數；不是有效的網址時回傳 null */
export function parseWishUrl(text: string) {
  const match = /https?:\/\/\S+/.exec(text);
  if (!match || !URL.canParse(match[0])) return null;
  const params = new URL(match[0]).searchParams;
  const authkey = params.get("authkey");
  if (!authkey) return null;
  return {
    authkey,
    // 遊戲產生的網址裡，這些參數可能是空的（例如 game_biz=）
    region: params.get("region") || undefined,
    gameBiz: params.get("game_biz") || undefined,
  };
}

/**
 * 逐一卡池、由新到舊翻頁抓取祈願紀錄，遇到已經儲存過的紀錄就換下一個卡池
 * @returns 新的紀錄；所有卡池都沒有紀錄時 uid 為空字串
 */
export async function collectWishLog(options: {
  fetchPage: (
    gachaType: WishPoolKey,
    endId: string,
  ) => Promise<{ list: WishLogRow[]; timezone: number | null }>;
  /** 該帳號已經儲存的紀錄 ID */
  knownIds: (uid: string) => Promise<Set<string>>;
  /** 每次請求之間的等待，避免被限流 */
  wait: () => Promise<void>;
  onProgress?: (pool: WishPoolKey, count: number) => void;
  isCancelled?: () => boolean;
}) {
  const rows: WishLogRow[] = [];
  let uid = "";
  let timezone: number | null = null;
  let known: Set<string> | undefined;
  let first = true;

  for (const { key } of WISH_POOLS) {
    let endId = "0";
    while (true) {
      if (options.isCancelled?.()) return null;
      if (!first) await options.wait();
      first = false;

      const page = await options.fetchPage(key, endId);
      if (page.list[0] && !uid) {
        uid = page.list[0].uid;
        known = await options.knownIds(uid);
      }
      timezone ??= page.timezone;
      const fresh = page.list.filter((row) => !known?.has(row.id));
      rows.push(...fresh);
      options.onProgress?.(key, rows.length);

      if (fresh.length < page.list.length || page.list.length < WISH_LOG_PAGE_SIZE) break;
      endId = page.list.at(-1)!.id;
    }
  }
  return { uid, timezone, rows };
}
