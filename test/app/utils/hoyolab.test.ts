import assert from "node:assert/strict";
import { test } from "node:test";
import { getFullResinResult } from "../../../app/utils/resin";
import { parseHoyolabCookie, resinStartTime } from "../../../app/utils/hoyolab";

test("從整串 cookie 取出需要的三個值", () => {
  const text = "mi18nLang=zh-tw; ltoken_v2=v2_abc-DEF=; ltuid_v2=123456; ltmid_v2=0abc_hy; x=1";
  assert.deepEqual(parseHoyolabCookie(text), {
    ltuid: "123456",
    ltoken: "v2_abc-DEF=",
    ltmid: "0abc_hy",
  });
});

test("只貼單一個值時不當成 cookie 字串", () => {
  assert.deepEqual(parseHoyolabCookie("v2_abcdef"), {});
  // 名稱只是其他 cookie 的結尾時不算
  assert.deepEqual(parseHoyolabCookie("xltuid_v2=1"), {});
});

test("用推回的起始時間計算，回滿時間等於現在加上 HoYoLAB 回傳的秒數", () => {
  const now = new Date(2026, 10, 21, 12, 0, 0);
  // 150 樹脂，再 3 分鐘回下一點：49 點 × 8 分鐘 + 3 分鐘
  const recoverySeconds = 49 * 480 + 180;
  const start = resinStartTime(recoverySeconds, now);
  assert.equal(now.getTime() - start.getTime(), 5 * 60 * 1000);
  const full = getFullResinResult(150, start, now)[0]!;
  assert.equal(full.date.getTime(), now.getTime() + recoverySeconds * 1000);
});

test("剛回復一點或已回滿時，起始時間就是現在", () => {
  const now = new Date(2026, 10, 21, 12, 0, 0);
  assert.equal(resinStartTime(480 * 3, now).getTime(), now.getTime());
  assert.equal(resinStartTime(0, now).getTime(), now.getTime());
});
