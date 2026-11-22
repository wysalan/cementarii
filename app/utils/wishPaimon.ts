import {
  WISH_TIME_PATTERN,
  WISH_UID_PATTERN,
  wishPoolOf,
  wishTimezoneOf,
  type IncomingWishRecord,
  type ParsedWishAccount,
  type WishItem,
} from "./wish";

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === "object" && value !== null;

// paimon.moe 各卡池的儲存名稱，以及紀錄沒有卡池代碼時使用的預設值
const COUNTERS = {
  "character-event": "301",
  "weapon-event": "302",
  chronicled: "500",
  standard: "200",
  beginners: "100",
};

const COUNTER_KEY = new RegExp(`^(.*)wish-counter-(${Object.keys(COUNTERS).join("|")})$`);

const TIMEZONES: Record<string, number> = { Asia: 8, China: 8, America: -5, Europe: 1 };

/**
 * paimon.moe 的物品代號與本站 slug 都是由英文名稱產生，只有標點的處理不同
 * （wolfs_gravestone／wolfs-gravestone、freedom-sworn），去掉標點後就能對應
 */
export const paimonItemKey = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, "");

/** 是否為 paimon.moe 的備份檔（設定 → 匯出的 JSON） */
export function isPaimonBackup(data: unknown): data is Raw {
  return isObject(data) && Object.keys(data).some((key) => COUNTER_KEY.test(key));
}

/**
 * 解析 paimon.moe 備份檔裡的祈願紀錄；備份檔沒有紀錄 ID，手動輸入的帳號也沒有 UID
 * @param items 物品清單，以 paimonItemKey(slug) 為 key
 */
export function parsePaimonBackup(data: Raw, items: Map<string, WishItem>): ParsedWishAccount[] {
  // 主帳號的 key 沒有前綴，其他帳號是「account-2-」這種形式
  const prefixes = new Set<string>();
  for (const key of Object.keys(data)) {
    const match = COUNTER_KEY.exec(key);
    if (match) prefixes.add(match[1]!);
  }

  return [...prefixes].map((prefix) => {
    const uid = String(data[`${prefix}wish-uid`] ?? "").trim();
    const server = data[`${prefix}server`] ?? data.server;
    const records: IncomingWishRecord[] = [];
    let skipped = 0;

    for (const [name, defaultType] of Object.entries(COUNTERS)) {
      const counter = data[`${prefix}wish-counter-${name}`];
      const pulls = isObject(counter) && Array.isArray(counter.pulls) ? counter.pulls : [];
      for (const pull of pulls) {
        const item = isObject(pull) ? items.get(paimonItemKey(String(pull.id))) : undefined;
        const time = isObject(pull) ? pull.time : undefined;
        // 手動補上的「不明三星」沒有物品資訊，無法保留
        if (!isObject(pull) || !item || typeof time !== "string" || !WISH_TIME_PATTERN.test(time)) {
          skipped++;
          continue;
        }
        const code = String(pull.code ?? "");
        records.push({
          gachaType: wishPoolOf(code) === wishPoolOf(defaultType) ? code : defaultType,
          itemId: item.id,
          rank: item.rarity,
          time,
        });
      }
    }

    return {
      uid: WISH_UID_PATTERN.test(uid) ? uid : "",
      timezone: (typeof server === "string" && TIMEZONES[server]) || wishTimezoneOf(uid),
      label: prefix ? prefix.replace(/-$/, "") : "主帳號",
      records,
      skipped,
    };
  });
}
