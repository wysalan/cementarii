import { wishPoolOf, type IncomingWishRecord, type WishRecord } from "./wish";

// 同一個卡池、同一秒抽到同一個物品，視為「可能是同一筆」
const keyOf = (r: IncomingWishRecord) => `${wishPoolOf(r.gachaType)}|${r.time}|${r.itemId}`;

const secondsOf = (time: string) => Math.floor(Date.parse(`${time.replace(" ", "T")}Z`) / 1000);

/**
 * 把匯入的紀錄併入既有紀錄，回傳要寫入與要刪除的內容
 * - 有官方 ID 的紀錄以 ID 判斷重複；遇到先前沒有 ID 的同一筆，就用官方 ID 取代
 * - 沒有 ID 的紀錄（例如 paimon.moe）以「卡池、時間、物品」的筆數比對，只補上不足的部分
 */
export function mergeWishRecords(
  uid: string,
  existing: WishRecord[],
  incoming: IncomingWishRecord[],
) {
  const ids = new Set(existing.map((r) => r.id));
  const counts = new Map<string, number>();
  const generated = new Map<string, WishRecord[]>();
  for (const r of existing) {
    const key = keyOf(r);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (r.generatedId) generated.set(key, [...(generated.get(key) ?? []), r]);
  }

  const put: WishRecord[] = [];
  const remove: string[] = [];
  let added = 0;

  for (const r of incoming) {
    if (!r.id || ids.has(r.id)) continue;
    const key = keyOf(r);
    const replaced = generated.get(key)?.pop();
    if (replaced) {
      remove.push(replaced.id);
      ids.delete(replaced.id);
    } else {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      added++;
    }
    ids.add(r.id);
    put.push({ ...r, id: r.id, uid });
  }

  const seen = new Map<string, number>();
  const sequences = new Map<number, number>();
  for (const r of incoming) {
    if (r.id) continue;
    const key = keyOf(r);
    const nth = (seen.get(key) ?? 0) + 1;
    seen.set(key, nth);
    if (nth <= (counts.get(key) ?? 0)) continue;

    // 產生的 ID 與官方 ID 一樣是 19 位數字、以時間開頭，同一秒內依檔案順序遞增
    const seconds = secondsOf(r.time);
    let sequence = sequences.get(seconds) ?? 0;
    let id: string;
    do id = `${seconds}${String(sequence++).padStart(9, "0")}`;
    while (ids.has(id));
    sequences.set(seconds, sequence);
    ids.add(id);
    put.push({ ...r, id, uid, generatedId: true });
    added++;
  }

  return { put, remove, added, duplicated: incoming.length - added };
}
