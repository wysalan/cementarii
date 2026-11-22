import {
  WISH_TIME_PATTERN,
  WISH_UID_PATTERN,
  compareWishRecords,
  wishKindOf,
  wishPoolOf,
  wishRankOf,
  wishTimezoneOf,
  type IncomingWishRecord,
  type ParsedWishAccount,
  type WishAccount,
  type WishItem,
  type WishRecord,
} from "./wish";

type Raw = Record<string, unknown>;

const isObject = (value: unknown): value is Raw => typeof value === "object" && value !== null;

// 規格要求字串，但有些工具會輸出數字
const text = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

/** 是否為 UIGF 檔案（v4.x，或 v3.0 以前的單一帳號格式） */
export function isUigf(data: unknown): data is Raw {
  if (!isObject(data) || !isObject(data.info)) return false;
  return "version" in data.info || "uigf_version" in data.info;
}

/** 解析一個帳號的紀錄清單；官方祈願紀錄的欄位與 UIGF 相同，也用這個函式處理 */
export function parseUigfList(
  list: unknown,
  items: Map<number, WishItem>,
  names: Map<string, WishItem>,
): Pick<ParsedWishAccount, "records" | "skipped"> {
  const records: IncomingWishRecord[] = [];
  let skipped = 0;
  for (const raw of Array.isArray(list) ? list : []) {
    if (!isObject(raw)) {
      skipped++;
      continue;
    }
    const gachaType = text(raw.gacha_type) || text(raw.uigf_gacha_type);
    const time = text(raw.time);
    // v2.2 以前的檔案可能沒有 item_id，改用名稱對應
    const itemId = Number(text(raw.item_id)) || names.get(text(raw.name))?.id || 0;
    const rank = wishRankOf(itemId, items) ?? Number(text(raw.rank_type));
    if (!wishPoolOf(gachaType) || !WISH_TIME_PATTERN.test(time) || !itemId || !rank) {
      skipped++;
      continue;
    }
    const id = text(raw.id);
    records.push({ id: /^\d{1,19}$/.test(id) ? id : undefined, gachaType, itemId, rank, time });
  }
  return { records, skipped };
}

/**
 * 解析 UIGF 檔案裡的原神祈願紀錄
 * @param items 物品清單，以物品 ID 為 key
 * @param names 物品清單，以名稱為 key
 * @throws 檔案裡沒有原神的紀錄，或 UID 格式不正確
 */
export function parseUigf(
  data: Raw,
  items: Map<number, WishItem>,
  names: Map<string, WishItem>,
): ParsedWishAccount[] {
  const info = data.info as Raw;
  const accounts: Raw[] =
    "version" in info
      ? Array.isArray(data.hk4e)
        ? data.hk4e.filter(isObject)
        : []
      : [{ uid: info.uid, timezone: info.region_time_zone, list: data.list }];
  if (!accounts.length) throw new Error("檔案裡沒有原神的祈願紀錄");

  return accounts.map((account) => {
    const uid = text(account.uid);
    if (!WISH_UID_PATTERN.test(uid)) throw new Error(`UID 格式不正確：${uid || "（空白）"}`);
    const timezone = Number(account.timezone);
    return {
      uid,
      timezone:
        account.timezone != null && Number.isInteger(timezone) ? timezone : wishTimezoneOf(uid),
      ...parseUigfList(account.list, items, names),
    };
  });
}

const KIND_TEXT = { character: "角色", weapon: "武器" };

/** 匯出成 UIGF v4.2；名稱等選填欄位以繁體中文輸出 */
export function buildUigf(
  accounts: { account: WishAccount; records: WishRecord[] }[],
  items: Map<number, WishItem>,
  app: { name: string; version: string },
  now = Date.now(),
) {
  return {
    info: {
      export_timestamp: Math.floor(now / 1000),
      export_app: app.name,
      export_app_version: app.version,
      version: "v4.2",
    },
    hk4e: accounts.map(({ account, records }) => ({
      uid: account.uid,
      timezone: account.timezone,
      lang: "zh-tw",
      list: records.toSorted(compareWishRecords).map((r) => ({
        uigf_gacha_type: wishPoolOf(r.gachaType)!,
        gacha_type: r.gachaType,
        item_id: String(r.itemId),
        count: "1",
        time: r.time,
        ...(items.has(r.itemId) ? { name: items.get(r.itemId)!.name } : {}),
        item_type: KIND_TEXT[wishKindOf(r.itemId)],
        rank_type: String(r.rank),
        id: r.id,
      })),
    })),
  };
}
