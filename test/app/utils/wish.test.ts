import assert from "node:assert/strict";
import { test } from "node:test";
import type { WishItem, WishRecord } from "../../../app/utils/wish";
import { collectWishLog, parseWishUrl, type WishLogRow } from "../../../app/utils/wishLog";
import { localizeWishBanners, wishVersionStarts } from "../../../app/utils/wishBanners";
import { mergeWishRecords } from "../../../app/utils/wishMerge";
import { isPaimonBackup, paimonItemKey, parsePaimonBackup } from "../../../app/utils/wishPaimon";
import {
  annotateWishRecords,
  summarizeWishPool,
  summarizeWishVersions,
  wishUpStatus,
} from "../../../app/utils/wishStats";
import { buildUigf, isUigf, parseUigf } from "../../../app/utils/wishUigf";

const list: WishItem[] = [
  {
    id: 10000002,
    kind: "character",
    slug: "kamisato-ayaka",
    name: "神里綾華",
    rarity: 5,
    icon: "",
  },
  { id: 10000023, kind: "character", slug: "xiangling", name: "香菱", rarity: 4, icon: "" },
  { id: 12502, kind: "weapon", slug: "wolfs-gravestone", name: "狼的末路", rarity: 5, icon: "" },
  { id: 11301, kind: "weapon", slug: "cool-steel", name: "冷刃", rarity: 3, icon: "" },
];
const byId = new Map(list.map((i) => [i.id, i]));
const byName = new Map(list.map((i) => [i.name, i]));
const bySlug = new Map(list.map((i) => [paimonItemKey(i.slug), i]));

const v4 = {
  info: { export_timestamp: 1, export_app: "x", export_app_version: "1", version: "v4.0" },
  hk4e: [
    {
      uid: 800000001,
      timezone: 8,
      list: [
        {
          uigf_gacha_type: "301",
          gacha_type: "400",
          item_id: "10000002",
          time: "2024-01-01 12:00:00",
          id: "1704081600000000001",
        },
        // 不在物品清單裡的武器：星級從 ID 判斷
        {
          uigf_gacha_type: "302",
          gacha_type: "302",
          item_id: "13407",
          time: "2024-01-01 12:00:01",
          id: "1704081601000000001",
        },
        // 不在物品清單裡的角色：沒有 rank_type 就無法判斷星級
        {
          uigf_gacha_type: "301",
          gacha_type: "301",
          item_id: "10009999",
          time: "2024-01-01 12:00:02",
          id: "1704081602000000001",
        },
        { uigf_gacha_type: "301", gacha_type: "301", item_id: "10000023", time: "昨天", id: "1" },
      ],
    },
  ],
  hkrpg: [{ uid: "1", timezone: 8, list: [] }],
};

test("UIGF v4：讀出原神的紀錄，無法辨識的略過", () => {
  assert.ok(isUigf(v4));
  const [account] = parseUigf(v4, byId, byName);
  assert.equal(account!.uid, "800000001");
  assert.equal(account!.timezone, 8);
  assert.equal(account!.skipped, 2);
  assert.deepEqual(account!.records, [
    {
      id: "1704081600000000001",
      gachaType: "400",
      itemId: 10000002,
      rank: 5,
      time: "2024-01-01 12:00:00",
    },
    {
      id: "1704081601000000001",
      gachaType: "302",
      itemId: 13407,
      rank: 4,
      time: "2024-01-01 12:00:01",
    },
  ]);
});

test("UIGF v4：沒有原神的紀錄時報錯", () => {
  assert.throws(
    () => parseUigf({ info: { version: "v4.1" }, hkrpg: [] }, byId, byName),
    /沒有原神/,
  );
});

test("UIGF v2：單一帳號格式，沒有 item_id 時用名稱對應，時區由 UID 判斷", () => {
  const v2 = {
    info: { uid: "600000001", lang: "zh-tw", uigf_version: "v2.2" },
    list: [
      {
        uigf_gacha_type: "200",
        gacha_type: "200",
        item_id: "",
        name: "狼的末路",
        item_type: "武器",
        time: "2021-05-01 08:00:00",
        id: "",
      },
    ],
  };
  assert.ok(isUigf(v2));
  assert.deepEqual(parseUigf(v2, byId, byName), [
    {
      uid: "600000001",
      timezone: -5,
      skipped: 0,
      records: [
        { id: undefined, gachaType: "200", itemId: 12502, rank: 5, time: "2021-05-01 08:00:00" },
      ],
    },
  ]);
});

test("paimon.moe：依物品代號對應，分辨多個帳號", () => {
  const backup = {
    server: "America",
    "wish-uid": "600000001",
    "wish-counter-character-event": {
      total: 3,
      pulls: [
        {
          type: "character",
          code: "400",
          id: "kamisato_ayaka",
          time: "2023-01-05 18:23:11",
          pity: 76,
        },
        { type: "weapon", id: "cool_steel", time: "2023-01-05 18:23:11", pity: 1 },
        { type: "unknown_3_star", id: "unknown_3_star", time: "2023-01-05 18:23:11", pity: 1 },
      ],
    },
    "account-2-wish-counter-standard": {
      total: 1,
      pulls: [{ type: "weapon", code: "200", id: "wolfs_gravestone", time: "2022-01-01 00:00:00" }],
    },
  };
  assert.ok(isPaimonBackup(backup));
  assert.ok(!isPaimonBackup(v4));
  assert.deepEqual(parsePaimonBackup(backup, bySlug), [
    {
      uid: "600000001",
      timezone: -5,
      label: "主帳號",
      skipped: 1,
      records: [
        { gachaType: "400", itemId: 10000002, rank: 5, time: "2023-01-05 18:23:11" },
        { gachaType: "301", itemId: 11301, rank: 3, time: "2023-01-05 18:23:11" },
      ],
    },
    {
      uid: "",
      timezone: -5,
      label: "account-2",
      skipped: 0,
      records: [{ gachaType: "200", itemId: 12502, rank: 5, time: "2022-01-01 00:00:00" }],
    },
  ]);
});

const pull = (itemId: number, time: string, id?: string, gachaType = "301") => ({
  id,
  gachaType,
  itemId,
  rank: 3,
  time,
});

test("合併：有官方 ID 的紀錄以 ID 判斷重複", () => {
  const first = mergeWishRecords("1", [], [pull(11301, "2024-01-01 12:00:00", "10")]);
  assert.equal(first.added, 1);
  const again = mergeWishRecords("1", first.put, [
    pull(11301, "2024-01-01 12:00:00", "10"),
    // 同一秒抽到同一個物品但 ID 不同（十連）：是另一筆
    pull(11301, "2024-01-01 12:00:00", "11"),
  ]);
  assert.equal(again.added, 1);
  assert.equal(again.duplicated, 1);
  assert.deepEqual(
    again.put.map((r) => r.id),
    ["11"],
  );
});

test("合併：沒有 ID 的紀錄重複匯入不會增加，只補上不足的筆數", () => {
  const tenPull = [
    pull(11301, "2024-01-01 12:00:00"),
    pull(11301, "2024-01-01 12:00:00"),
    pull(10000023, "2024-01-01 12:00:00"),
  ];
  const first = mergeWishRecords("1", [], tenPull);
  assert.equal(first.added, 3);
  assert.ok(first.put.every((r) => r.generatedId && /^\d{19}$/.test(r.id)));
  assert.equal(new Set(first.put.map((r) => r.id)).size, 3);
  // 產生的 ID 要保留檔案裡的順序
  assert.deepEqual(
    first.put.map((r) => r.id).toSorted(),
    first.put.map((r) => r.id),
  );

  assert.equal(mergeWishRecords("1", first.put, tenPull).added, 0);

  const more = mergeWishRecords("1", first.put, [...tenPull, pull(11301, "2024-01-01 12:00:00")]);
  assert.equal(more.added, 1);
  assert.ok(!first.put.some((r) => r.id === more.put[0]!.id));
});

test("合併：官方 ID 的紀錄會取代先前沒有 ID 的同一筆", () => {
  const existing = mergeWishRecords("1", [], [pull(11301, "2024-01-01 12:00:00")]).put;
  const result = mergeWishRecords("1", existing, [pull(11301, "2024-01-01 12:00:00", "10", "400")]);
  assert.equal(result.added, 0);
  assert.deepEqual(result.remove, [existing[0]!.id]);
  assert.deepEqual(result.put, [
    { uid: "1", id: "10", gachaType: "400", itemId: 11301, rank: 3, time: "2024-01-01 12:00:00" },
  ]);
});

test("合併：已有官方 ID 的紀錄時，沒有 ID 的同一筆不會重複加入", () => {
  const existing = mergeWishRecords("1", [], [pull(11301, "2024-01-01 12:00:00", "10")]).put;
  assert.equal(mergeWishRecords("1", existing, [pull(11301, "2024-01-01 12:00:00")]).added, 0);
});

test("匯出的 UIGF 可以原樣讀回", () => {
  const records: WishRecord[] = [
    {
      uid: "800000001",
      id: "20",
      gachaType: "302",
      itemId: 12502,
      rank: 5,
      time: "2024-01-02 00:00:00",
    },
    {
      uid: "800000001",
      id: "10",
      gachaType: "400",
      itemId: 10000002,
      rank: 5,
      time: "2024-01-01 00:00:00",
    },
  ];
  const file = buildUigf(
    [{ account: { uid: "800000001", timezone: 8, updatedAt: 0 }, records }],
    byId,
    { name: "Cementarii", version: "1" },
    1700000000000,
  );
  assert.equal(file.info.export_timestamp, 1700000000);
  assert.deepEqual(file.hk4e[0]!.list[0], {
    uigf_gacha_type: "301",
    gacha_type: "400",
    item_id: "10000002",
    count: "1",
    time: "2024-01-01 00:00:00",
    name: "神里綾華",
    item_type: "角色",
    rank_type: "5",
    id: "10",
  });
  const [account] = parseUigf(JSON.parse(JSON.stringify(file)), new Map(), new Map());
  assert.deepEqual(
    account!.records.map((r) => ({ ...r, uid: "800000001" })),
    records.toReversed(),
  );
});

test("從祈願紀錄網址取出 authkey", () => {
  const url =
    "https://gs.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html?lang=zh-tw&region=os_asia&authkey=ab%2Bc%2F%3D&game_biz=hk4e_global#/log";
  assert.deepEqual(
    parseWishUrl(`  ${url}
`),
    {
      authkey: "ab+c/=",
      region: "os_asia",
      gameBiz: "hk4e_global",
    },
  );
  // 遊戲快取裡的網址直接指向 API，而且 game_biz 是空的
  assert.deepEqual(
    parseWishUrl(
      "https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog?region=os_asia&authkey=abc&game_biz=",
    ),
    { authkey: "abc", region: "os_asia", gameBiz: undefined },
  );
  assert.equal(parseWishUrl("https://paimon.moe/wish/import"), null);
  assert.equal(parseWishUrl("不是網址"), null);
});

test("抓取祈願紀錄：翻頁到最後一頁，遇到已儲存的紀錄就換下一個卡池", async () => {
  const row = (id: number, gachaType: string): WishLogRow => ({
    id: String(id),
    uid: "800000001",
    gacha_type: gachaType,
    item_id: "",
    name: "冷刃",
    rank_type: "3",
    time: "2024-01-01 12:00:00",
  });
  // 角色池 25 筆（ID 125 ~ 101），武器池 3 筆（其中 ID 202 以前已經儲存）
  const pools: Record<string, WishLogRow[]> = {
    "301": Array.from({ length: 25 }, (_, i) => row(125 - i, "301")),
    "302": [row(203, "302"), row(202, "302"), row(201, "302")],
  };
  const calls: string[] = [];
  let waits = 0;
  const result = await collectWishLog({
    fetchPage: async (gachaType, endId) => {
      calls.push(`${gachaType}:${endId}`);
      const all = pools[gachaType] ?? [];
      const start = endId === "0" ? 0 : all.findIndex((r) => r.id === endId) + 1;
      return { list: all.slice(start, start + 20), timezone: 8 };
    },
    knownIds: async () => new Set(["202", "201"]),
    wait: async () => void waits++,
  });
  assert.deepEqual(calls, ["301:0", "301:106", "302:0", "500:0", "200:0", "100:0"]);
  assert.equal(waits, calls.length - 1);
  assert.equal(result!.uid, "800000001");
  assert.equal(result!.timezone, 8);
  assert.equal(result!.rows.length, 26);
  assert.equal(result!.rows.at(-1)!.id, "203");
});

test("抓取祈願紀錄：取消後不回傳結果", async () => {
  const result = await collectWishLog({
    fetchPage: async () => ({ list: [], timezone: null }),
    knownIds: async () => new Set(),
    wait: async () => {},
    isCancelled: () => true,
  });
  assert.equal(result, null);
});

test("統計：出貨抽數、已墊抽數與平均", () => {
  // 依序抽到的星級；5 星不會重算 4 星的抽數
  const ranks = [3, 3, 4, 3, 5, 3, 4, 3, 3];
  const records: WishRecord[] = ranks.map((rank, i) => ({
    uid: "1",
    id: String(100 + i),
    gachaType: "301",
    itemId: 11301,
    rank,
    time: `2024-01-0${i + 1} 12:00:00`,
  }));
  const annotated = annotateWishRecords(records.toReversed());
  assert.deepEqual(
    annotated.map((r) => [r.no, r.pity]),
    [
      [1, undefined],
      [2, undefined],
      [3, 3],
      [4, undefined],
      [5, 5],
      [6, undefined],
      [7, 4],
      [8, undefined],
      [9, undefined],
    ],
  );
  const summary = summarizeWishPool(annotated);
  assert.deepEqual(
    { ...summary, fives: summary.fives.map((r) => r.id) },
    {
      total: 9,
      rank5: 1,
      rank4: 2,
      rank3: 6,
      pity5: 4,
      pity4: 2,
      average5: 5,
      average4: 3.5,
      upAverage5: null,
      upAverage4: null,
      upRate5: null,
      upRate4: null,
      fives: ["104"],
      from: "2024-01-01",
      to: "2024-01-09",
    },
  );
});

test("統計：沒有出過 5 星時，已墊抽數就是總抽數", () => {
  const summary = summarizeWishPool(
    annotateWishRecords([
      { uid: "1", id: "1", gachaType: "200", itemId: 11301, rank: 3, time: "2024-01-01 12:00:00" },
    ]),
  );
  assert.equal(summary.pity5, 1);
  assert.equal(summary.average5, null);
});

test("localizeWishBanners：全球同時開始的卡池換算成當地時間", () => {
  const banner = {
    pool: "character",
    version: "4.4",
    startsAt: "2024-01-31 06:00:00",
    endsAt: "2024-02-20 17:59:59",
    startsGlobally: true,
    endsGlobally: false,
    fiveStarIds: [1],
    fourStarIds: [2],
  };
  const [local] = localizeWishBanners([banner, { ...banner, pool: "weapon" }], "character", -5);
  assert.equal(local!.start, "2024-01-30 17:00:00");
  assert.equal(local!.end, "2024-02-20 17:59:59");
  assert.equal(localizeWishBanners([banner], "character", 8)[0]!.start, "2024-01-31 06:00:00");
});

test("annotateWishRecords：標示 UP 與大保底，不歪率不計入大保底", () => {
  const banners = [
    {
      start: "2024-01-01 00:00:00",
      end: "2024-01-31 23:59:59",
      up: { 4: new Set([20]), 5: new Set([10]) },
    },
  ];
  const record = (id: number, itemId: number, rank: number, time: string) => ({
    uid: "800000001",
    id: String(id),
    gachaType: "301",
    itemId,
    rank,
    time,
  });
  const annotated = annotateWishRecords(
    [
      record(1, 10, 5, "2024-01-02 00:00:00"), // 小保底贏
      record(2, 99, 5, "2024-01-03 00:00:00"), // 歪
      record(3, 10, 5, "2024-01-04 00:00:00"), // 大保底
      record(4, 10, 5, "2024-01-05 00:00:00"), // 小保底贏
      record(5, 10, 5, "2024-03-01 00:00:00"), // 找不到卡池
      record(6, 21, 4, "2024-01-06 00:00:00"), // 4 星歪
    ],
    banners,
  );
  assert.deepEqual(
    annotated.map((r) => [r.up, r.guaranteed]),
    [
      [true, false],
      [false, false],
      [true, true],
      [true, false],
      [false, false],
      [undefined, undefined],
    ],
  );
  assert.deepEqual(annotated.map(wishUpStatus), [
    "won",
    "lost",
    "guaranteed",
    "won",
    "lost",
    undefined,
  ]);
  const summary = summarizeWishPool(annotated);
  assert.equal(summary.upRate5, 2 / 3);
  assert.equal(summary.upRate4, 0);
  // 1、(歪 1 + 1)、1；找不到卡池的那一個不算
  assert.equal(summary.upAverage5, 4 / 3);
  assert.equal(summary.upAverage4, null);
  assert.equal(
    summarizeWishPool(annotateWishRecords([record(1, 10, 5, "2024-01-02 00:00:00")])).upRate5,
    null,
  );
});

test("各版本抽數：依版本開始時間分組，列出有紀錄的大版本裡所有的小版本", () => {
  const banner = (version: string, startsAt: string, pool = "character") => ({
    pool,
    version,
    startsAt,
    endsAt: "2099-01-01 00:00:00",
    startsGlobally: true,
    endsGlobally: false,
    fiveStarIds: [],
    fourStarIds: [],
  });
  const versions = wishVersionStarts(
    [
      banner("1.1", "2020-11-11 06:00:00"),
      banner("1.0", "2020-09-28 06:00:00"),
      banner("1.0", "2020-10-20 18:00:00", "weapon"),
      banner("1.2", "2020-12-23 06:00:00"),
      banner("1.3", "2021-02-03 06:00:00"),
      banner("2.0", "2021-07-21 06:00:00"),
    ],
    -5,
  );
  assert.deepEqual(versions.slice(0, 2), [
    { version: "1.0", start: "2020-09-27 17:00:00" },
    { version: "1.1", start: "2020-11-10 17:00:00" },
  ]);
  const record = (id: number, rank: number, time: string) => ({
    uid: "600000001",
    id: String(id),
    gachaType: "200",
    itemId: 1,
    rank,
    time,
  });
  const summary = summarizeWishVersions(
    annotateWishRecords([
      record(1, 3, "2020-11-10 16:59:59"),
      record(2, 5, "2020-11-10 17:00:00"),
      record(3, 3, "2021-01-01 00:00:00"),
      record(4, 3, "2020-01-01 00:00:00"), // 比第一個版本還早，不計入
    ]),
    versions,
  );
  assert.deepEqual(
    summary.map((v) => [v.version, v.total, v.fives.length]),
    [
      ["1.0", 1, 0],
      ["1.1", 1, 1],
      ["1.2", 1, 0],
      ["1.3", 0, 0],
    ],
  );
});
