/**
 * 將素材按照 `stage` 分組成 `[{ stage, materials }]`，並在 `materials` 內加上 `count` 資料
 *
 * 輸入的資料**必須以 `stage` 排序**（相同 `stage` 的素材要排在一起）
 *
 * 順序不對會導致同一個 `stage` 被拆成多個且不會有錯誤
 *
 * 查詢時使用 `orderBy: (t, { asc }) => [asc(t.stage), asc(t.materialId)]` 排序
 *
 * @template T 一筆素材消耗，需有 `stage`、`count` 與含 `i18n` 的 `material`（角色或武器的 costs 都可以）
 * @param costs 已經按照 `stage` 排序的素材消耗
 * @returns 按照 `stage` 分組的陣列，只包含有素材的 `stage`；若輸入為空陣列則回傳 `[]`
 * @throws {H3Error} 404：任一素材沒有該語系的翻譯（由 `flattenI18n` 拋出）
 * @example
 * // 角色：按照 kind 分開後再各自分組
 * costs: {
 *   ascension: groupByStage(costs.filter((c) => c.kind === "ascension")),
 *   talent: groupByStage(costs.filter((c) => c.kind === "talent")),
 * }
 * // 武器：直接將素材輸入來分組
 * groupByStage([
 *   { stage: 1, count: 20000, material: { id: 202, i18n: [{ name: "摩拉" }] } },
 *   { stage: 1, count: 3, material: { id: 101, i18n: [{ name: "湖光鈴蘭" }] } },
 *   { stage: 2, count: 40000, material: { id: 202, i18n: [{ name: "摩拉" }] } },
 * ]);
 * // → [
 * //     { stage: 1, materials: [{ id: 202, name: "摩拉", count: 20000 },
 * //                             { id: 101, name: "湖光鈴蘭", count: 3 }
 * //                            ]
 * //     },
 * //     { stage: 2, materials: [{ id: 202, name: "摩拉", count: 40000 }] },
 * //   ]
 */
export function groupByStage<
  T extends { stage: number; count: number; material: { i18n: object[] } },
>(costs: T[]) {
  type CostMaterial = ReturnType<typeof flattenI18n<T["material"]>> & {
    count: number;
  };
  const stages: { stage: number; materials: CostMaterial[] }[] = [];
  for (const { stage, material, count } of costs) {
    let current = stages.at(-1);
    if (current?.stage !== stage) {
      current = { stage, materials: [] };
      stages.push(current);
    }
    current.materials.push(Object.assign(flattenI18n(material), { count }));
  }
  return stages;
}
