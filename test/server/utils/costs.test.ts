import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByStage } from "../../../server/utils/costs";

// flattenI18n 在伺服器是自動匯入的，原檔載入時會用到資料庫的 schema，這裡放一個行為相同的版本
Object.assign(globalThis, {
  flattenI18n: ({ i18n, ...rest }: { i18n: object[] }) => ({ ...rest, ...i18n[0] }),
});

test("依 stage 分組，並把 count 併進素材", () => {
  const mora = { id: 202, i18n: [{ name: "摩拉" }] };
  const flower = { id: 101, i18n: [{ name: "湖光鈴蘭" }] };
  assert.deepEqual(
    groupByStage([
      { stage: 1, count: 20000, material: mora },
      { stage: 1, count: 3, material: flower },
      { stage: 2, count: 40000, material: mora },
    ]),
    [
      {
        stage: 1,
        materials: [
          { id: 202, name: "摩拉", count: 20000 },
          { id: 101, name: "湖光鈴蘭", count: 3 },
        ],
      },
      { stage: 2, materials: [{ id: 202, name: "摩拉", count: 40000 }] },
    ],
  );
  assert.deepEqual(groupByStage([]), []);
});
