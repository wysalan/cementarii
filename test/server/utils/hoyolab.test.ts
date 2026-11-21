import assert from "node:assert/strict";
import { test } from "node:test";
import { generateDs, genshinServerOf } from "../../../server/utils/hoyolab";

test("動態簽章的格式為「秒數,隨機字串,md5」", () => {
  // md5 由 md5sum 對 salt=…&t=1700000000&r=abcdef 另外算出
  assert.equal(
    generateDs(1700000000_000, "abcdef"),
    "1700000000,abcdef,52ac4768378434146675f980be7d092a",
  );
  assert.match(generateDs(), /^\d+,[a-zA-Z]{6},[0-9a-f]{32}$/);
});

test("由 UID 判斷伺服器", () => {
  assert.equal(genshinServerOf("600000001"), "os_usa");
  assert.equal(genshinServerOf("700000001"), "os_euro");
  assert.equal(genshinServerOf("800000001"), "os_asia");
  assert.equal(genshinServerOf("1800000001"), "os_asia");
  assert.equal(genshinServerOf("900000001"), "os_cht");
  // 國服的 UID 不支援
  assert.equal(genshinServerOf("100000001"), undefined);
});
