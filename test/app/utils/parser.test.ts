import assert from "node:assert/strict";
import { test } from "node:test";
import { parseStoryContent, parseTalentAttributes } from "../../../app/utils/parser";

function valueOf(format: string, value: number) {
  const ability = { labels: [`標籤|{param1:${format}}秒`], parameters: { param1: [value] } };
  return parseTalentAttributes(ability as never, 1)[0]!.value;
}

// 預期值是在遊戲內實際看到的字樣（班尼特、納西妲、雷電將軍、杜林）
test("天賦數值的格式與遊戲內一致", () => {
  assert.equal(valueOf("F1", 15), "15.0秒");
  assert.equal(valueOf("F1", 13.5), "13.5秒");
  assert.equal(valueOf("F2", 0.4464), "0.45秒");
  assert.equal(valueOf("F2", 9.0288), "9.03秒");
  assert.equal(valueOf("F2", 0.2), "0.20秒");
  assert.equal(valueOf("I", 1477.1501), "1,477秒");
  assert.equal(valueOf("P", 2.6144), "261%秒");
  assert.equal(valueOf("P", 4.656), "466%秒");
  assert.equal(valueOf("P", 1.12), "112%秒");
  assert.equal(valueOf("F1P", 1.13434), "113.4%秒");
  assert.equal(valueOf("F1P", 0.410048), "41.0%秒");
  assert.equal(valueOf("F1P", 0.44548), "44.5%秒");
  assert.equal(valueOf("F2P", 0.12), "12.00%秒");
  assert.equal(valueOf("F2P", 0.003), "0.30%秒");
});

test("性別標記依玩家性別取代，不限用字與順序", () => {
  assert.equal(parseStoryContent("{F#妳}{M#你}好", "", "male"), "你好");
  assert.equal(parseStoryContent("{F#妳}{M#你}好", "", "female"), "妳好");
  assert.equal(parseStoryContent("{M#他}{F#她}來了", "", "female"), "她來了");
  assert.equal(parseStoryContent("{M#他}{F#她}來了", "", "male"), "他來了");
});
