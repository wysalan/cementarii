export type WishItemKind = "character" | "weapon";

/** 祈願可能抽到的角色或武器 */
export type WishItem = {
  id: number;
  kind: WishItemKind;
  slug: string;
  name: string;
  rarity: number;
  icon: string;
};

export type WishRecord = {
  uid: string;
  /** 官方的祈願紀錄 ID；來源沒有提供時由本站產生 */
  id: string;
  generatedId?: true;
  /** 官方的卡池代碼：100、200、301、400、302、500 */
  gachaType: string;
  itemId: number;
  rank: number;
  /** 伺服器當地時間，格式為 YYYY-MM-DD HH:mm:ss */
  time: string;
};

export type WishAccount = {
  uid: string;
  /** 伺服器時區與 UTC 的時差（小時） */
  timezone: number;
  updatedAt: number;
};

/** 從檔案讀出、還沒寫入資料庫的紀錄；來源沒有紀錄 ID 時 id 為空 */
export type IncomingWishRecord = Omit<WishRecord, "uid" | "id" | "generatedId"> & { id?: string };

export type ParsedWishAccount = {
  /** 來源沒有記錄 UID 時為空字串，要請使用者補上 */
  uid: string;
  timezone: number;
  /** 來源對這個帳號的稱呼，沒有 UID 時用來分辨 */
  label?: string;
  records: IncomingWishRecord[];
  /** 無法辨識而略過的筆數 */
  skipped: number;
};

/** slug 用在網址；hardPity 是 5 星保底的抽數，新手祈願只有 20 抽所以沒有 */
export const WISH_POOLS = [
  { key: "301", slug: "character", name: "角色活動祈願", hardPity: 90 },
  { key: "302", slug: "weapon", name: "武器活動祈願", hardPity: 80 },
  { key: "500", slug: "chronicled", name: "集錄祈願", hardPity: 90 },
  { key: "200", slug: "standard", name: "常駐祈願", hardPity: 90 },
  { key: "100", slug: "beginner", name: "新手祈願", hardPity: null },
] as const;

export const WISH_RARE_PITY = 10;

export type WishPoolKey = (typeof WISH_POOLS)[number]["key"];

const POOL_OF: Record<string, WishPoolKey> = {
  "100": "100",
  "200": "200",
  "301": "301",
  // 角色活動祈願-2 與角色活動祈願共用保底
  "400": "301",
  "302": "302",
  "500": "500",
};

export const wishPoolOf = (gachaType: string): WishPoolKey | undefined => POOL_OF[gachaType];

/** 角色 ID 是 8 位數，武器是 5 位數 */
export const wishKindOf = (itemId: number): WishItemKind =>
  itemId >= 10000000 ? "character" : "weapon";

/** 物品的星級；武器 ID 的第三碼就是星級，角色要查物品清單 */
export function wishRankOf(itemId: number, items: Map<number, WishItem>) {
  const rarity = items.get(itemId)?.rarity;
  if (rarity) return rarity;
  if (itemId >= 11101 && itemId <= 15999) return Number(String(itemId)[2]);
  return undefined;
}

export const WISH_UID_PATTERN = /^\d{9,10}$/;

export const WISH_TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/** UID 開頭對應的伺服器時區；無法判斷時當成亞服 */
export function wishTimezoneOf(uid: string) {
  const prefix = uid.slice(0, uid.length - 8);
  if (prefix === "6") return -5;
  if (prefix === "7") return 1;
  return 8;
}

/** 由舊到新；同一秒內（例如十連）依紀錄 ID 排序 */
export function compareWishRecords(
  a: { time: string; id: string },
  b: { time: string; id: string },
) {
  if (a.time !== b.time) return a.time < b.time ? -1 : 1;
  if (a.id.length !== b.id.length) return a.id.length - b.id.length;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
