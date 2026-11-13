import assert from "node:assert/strict";
import { test } from "node:test";
import { getFullResinResult } from "../../../app/utils/resin";

test("跨月仍標示明天", () => {
  const now = new Date(2026, 0, 31, 23, 0);
  const full = getFullResinResult(190, undefined, now).at(-1)!;
  assert.equal(full.prefix, "明天");
  assert.equal(full.time, "00:20");
});

test("從 0 回滿超過一天時標示後天", () => {
  const now = new Date(2026, 0, 30, 22, 0);
  const full = getFullResinResult(0, undefined, now).at(-1)!;
  assert.equal(full.prefix, "後天");
  assert.equal(full.time, "00:40");
  assert.deepEqual(full.date, new Date(2026, 1, 1, 0, 40));
});

test("以明天的時間為起點時，日期不會被丟掉", () => {
  const now = new Date(2026, 0, 31, 23, 0);
  const start = new Date(2026, 1, 1, 2, 0);
  const rows = getFullResinResult(0, start, now);
  assert.equal(rows[1]!.prefix, "明天");
  assert.equal(rows.at(-1)!.prefix, "後天");
});

test("超過後天時改顯示日期", () => {
  const now = new Date(2026, 0, 31, 23, 0);
  const start = new Date(2026, 1, 2, 2, 0);
  assert.equal(getFullResinResult(0, start, now).at(-1)!.prefix, "2/3");
});

test("已回滿", () => {
  assert.equal(getFullResinResult(200)[0]!.time, "已回滿");
});
