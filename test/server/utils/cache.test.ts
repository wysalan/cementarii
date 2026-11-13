import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeCacheKey } from "../../../server/utils/cache";

// 與 Nitro 內部的 escapeKey 相同
const nitroEscape = (key: string) => key.replace(/\W/g, "");

test("經過 Nitro 的處理後，不同的路徑仍是不同的 key", () => {
  const paths = ["hu-tao", "hutao", "hu_tao", "hu/tao", "hu:tao", "hu_45_tao"];
  const keys = paths.map((p) => nitroEscape(escapeCacheKey(`/api/character/${p}:zh-TW`)));
  assert.equal(new Set(keys).size, paths.length);
});
