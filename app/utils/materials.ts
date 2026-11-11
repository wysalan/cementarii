/** 加總多個階段（`stage`）的素材：同一種素材會合併成一筆，結果會按照 `id` 由小到大排序
 *
 * 傳入 `costs.*` 篩選後的陣列即可，`stage` 等其他欄位不影響結果
 *
 * @template T 一筆素材，需要有 `id` 與 `count` 欄位；其他欄位（`name`、`icon`、`rarity`…）會保留原始資料
 * @param stages 要加總的階段（陣列），每個 `stage` 會有一組 `materials`
 * @returns 合併後的素材清單，每種素材只出現一次；`stages` 是空陣列時回傳 `[]`
 * @example
 * sumMaterials([
 *   { materials: [{ id: 202, name: "摩拉", count: 12500 },
 *                 { id: 104319, name: "「正義」的教導", count: 3 }] },
 *   { materials: [{ id: 202, name: "摩拉", count: 17500 },
 *                 { id: 104320, name: "「正義」的指引", count: 2 }] },
 * ]);
 * // → [
 * //     { id: 202, name: "摩拉", count: 30000 },
 * //     { id: 104319, name: "「正義」的教導", count: 3 },
 * //     { id: 104320, name: "「正義」的指引", count: 2 },
 * //   ]
 */
export function sumMaterials<T extends { id: number; count: number }>(
  stages: { materials: T[] }[],
): T[] {
  const totals = new Map<number, T>();
  for (const material of stages.flatMap((s) => s.materials)) {
    const total = totals.get(material.id);
    if (total) {
      total.count += material.count;
    } else {
      totals.set(material.id, { ...material });
    }
  }
  return [...totals.values()].sort((a, b) => a.id - b.id);
}
