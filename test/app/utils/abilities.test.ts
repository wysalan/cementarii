import assert from "node:assert/strict";
import { test } from "node:test";
import {
  counterpartOf,
  describeAbility,
  diffAttributes,
  markEnhancedDiff,
} from "../../../app/utils/abilities";

test("新增的句子標成 new，原有的句子不標", () => {
  assert.equal(
    markEnhancedDiff("造成風元素傷害。", "造成風元素傷害。額外回復能量。"),
    "造成風元素傷害。{DIFF=new}額外回復能量。{/DIFF}",
  );
});

test("改寫過的句子標成 changed", () => {
  assert.equal(
    markEnhancedDiff("持續時間為10秒。", "持續時間為15秒。"),
    "{DIFF=changed}持續時間為15秒。{/DIFF}",
  );
});

test("只改標點的句子視為相同", () => {
  assert.equal(markEnhancedDiff("造成傷害，並擊退。", "造成傷害、並擊退。"), "造成傷害、並擊退。");
});

test("同一行相鄰的同類句子合併，換行則分開", () => {
  assert.equal(
    markEnhancedDiff("", "甲乙丙丁。戊己庚辛。"),
    "{DIFF=new}甲乙丙丁。戊己庚辛。{/DIFF}",
  );
  assert.equal(
    markEnhancedDiff("", "甲乙丙丁。\n戊己庚辛。"),
    "{DIFF=new}甲乙丙丁。{/DIFF}\n{DIFF=new}戊己庚辛。{/DIFF}",
  );
});

test("不會從標記中間切開句子", () => {
  assert.equal(
    markEnhancedDiff("甲。", "<color=#FFD780FF>甲。乙</color>丙。"),
    "{DIFF=new}<color=#FFD780FF>甲。乙</color>丙。{/DIFF}",
  );
});

const base = { kind: "skill", sortOrder: 1, isEnhanced: false, description: "造成傷害。" };
const enhanced = { ...base, isEnhanced: true, description: "造成傷害。回復生命。" };
const other = { ...base, kind: "burst" };
const abilities = [other, base, enhanced];

test("找到同一個技能的另一個版本", () => {
  assert.equal(counterpartOf(abilities, base), enhanced);
  assert.equal(counterpartOf(abilities, enhanced), base);
  assert.equal(counterpartOf(abilities, other), undefined);
});

test("只有強化後的技能會加上差異標記", () => {
  assert.equal(describeAbility(abilities, base), "造成傷害。");
  assert.equal(describeAbility(abilities, enhanced), "造成傷害。{DIFF=new}回復生命。{/DIFF}");
  const alone = { ...enhanced };
  assert.equal(describeAbility([alone], alone), "造成傷害。回復生命。");
});

test("詳細屬性與強化前逐列比對", () => {
  const baseRows = [
    { text: "技能傷害", value: "100%" },
    { text: "冷卻時間", value: "10.0秒" },
  ];
  const rows = [
    { text: "技能傷害", value: "150%" },
    { text: "冷卻時間", value: "10.0秒" },
    { text: "治療量", value: "5%" },
  ];
  assert.deepEqual(diffAttributes(rows, baseRows), ["changed", undefined, "new"]);
  assert.deepEqual(diffAttributes(rows, undefined), [undefined, undefined, undefined]);
});
