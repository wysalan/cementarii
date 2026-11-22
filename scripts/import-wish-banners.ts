// 從 paimon.moe 的卡池資料（MIT 授權）匯入歷期祈願卡池到 wish_banners
//
// 用法：pnpm tsx --env-file=.env scripts/import-wish-banners.ts [--confirm=<endpoint>]
//   沒有 --confirm 時只列出會新增與更新的卡池；加上 --confirm 才寫入
//   --confirm 必須等於 DATABASE_URL 主機名稱的第一段，避免寫錯分支
//
// 只新增與更新，不會刪除：來源還沒收錄、手動補上的卡池會保留，並列在「只在資料庫」裡
import { eq, notInArray } from "drizzle-orm";
import { db, closeDb } from "./_db";
import * as t from "../server/db/schema";
import { paimonItemKey } from "../app/utils/wishPaimon";

const SOURCE_URL =
  "https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/src/data/banners.js";

// 來源的分類名稱；常駐與新手沒有 UP，不匯入
const POOLS = { characters: "character", weapons: "weapon", chronicled: "chronicled" } as const;

// 旅行者每個元素各有一筆資料，而且不會出現在祈願裡
const TRAVELER_IDS = [10000005, 10000007];

const TIME_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

type Banner = typeof t.wishBanners.$inferInsert;

/** 取出來源檔的各期卡池；來源是 JS 原始碼，只用文字比對取值，不執行 */
function parseSource(source: string) {
  // 被註解掉的是雙角色池的另一筆，內容與保留的那筆相同
  const text = source
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
  const sections = [...text.matchAll(/^ {2}(\w+): \[$/gm)];
  const errors: string[] = [];
  const banners: { pool: Banner["pool"]; raw: Record<string, string>; items: string[][] }[] = [];

  sections.forEach((section, i) => {
    const pool = POOLS[section[1] as keyof typeof POOLS];
    if (!pool) return;
    const body = text.slice(section.index, sections[i + 1]?.index);
    for (const [, entry] of body.matchAll(/\{([^{}]*)\}/g)) {
      const field = (name: string) => new RegExp(`\\b${name}: '([^']*)'`).exec(entry!)?.[1] ?? "";
      const list = (name: string) =>
        new RegExp(`\\b${name}: \\[([^\\]]*)\\]`).exec(entry!)?.[1]?.match(/'[^']+'/g) ?? [];
      const raw = { start: field("start"), end: field("end"), version: field("version") };
      const label = `${pool} ${raw.version} ${raw.start}`;
      if (!TIME_PATTERN.test(raw.start) || !TIME_PATTERN.test(raw.end) || raw.start >= raw.end)
        errors.push(`${label}：時間格式不正確`);
      const items = [list("featured"), list("featuredRare")].map((names) =>
        names.map((name) => name.slice(1, -1)),
      );
      if (!items[0]!.length) errors.push(`${label}：沒有 UP 的 5 星`);
      banners.push({
        pool,
        raw: {
          ...raw,
          startsGlobally: String(/\btimezoneDependent: true\b/.test(entry!)),
          endsGlobally: String(/\btimezoneDependentEnd: true\b/.test(entry!)),
        },
        items,
      });
    }
  });
  for (const pool of Object.values(POOLS))
    if (!banners.some((b) => b.pool === pool))
      errors.push(`找不到 ${pool} 的卡池，來源格式可能改了`);
  return { banners, errors };
}

const sameIds = (a: number[], b: number[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

async function main() {
  const confirm = process.argv.find((a) => a.startsWith("--confirm="))?.slice(10);
  const endpoint = new URL(process.env.DATABASE_URL!).hostname.split(".")[0]!;
  if (confirm !== undefined && confirm !== endpoint)
    throw new Error(`目標是 ${endpoint}。確認無誤後加上 --confirm=${endpoint} 再執行`);

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`下載卡池資料失敗：HTTP ${res.status}`);
  const { banners, errors } = parseSource(await res.text());

  const [characters, weapons, versions, existing] = await Promise.all([
    db.query.characters.findMany({
      where: notInArray(t.characters.gameId, TRAVELER_IDS),
      columns: { gameId: true, slug: true, rarity: true },
    }),
    db.query.weapons.findMany({ columns: { id: true, slug: true, rarity: true } }),
    db.query.gameVersions.findMany({ columns: { version: true } }),
    db.query.wishBanners.findMany(),
  ]);
  const items = new Map<string, { id: number; rarity: number }>();
  for (const c of characters) items.set(paimonItemKey(c.slug), { id: c.gameId, rarity: c.rarity });
  for (const w of weapons) items.set(paimonItemKey(w.slug), { id: w.id, rarity: w.rarity });
  const knownVersions = new Set(versions.map((v) => v.version));

  const rows: Banner[] = banners.map(({ pool, raw, items: [fiveStars, fourStars] }) => {
    const label = `${pool} ${raw.version} ${raw.start}`;
    if (!knownVersions.has(raw.version!))
      errors.push(`${label}：game_versions 沒有 ${raw.version}`);
    const idsOf = (names: string[], rarity: number) =>
      names.flatMap((name) => {
        const item = items.get(paimonItemKey(name));
        if (!item) errors.push(`${label}：資料庫沒有 ${name}`);
        else if (item.rarity !== rarity) errors.push(`${label}：${name} 不是 ${rarity} 星`);
        return item ? [item.id] : [];
      });
    return {
      pool,
      version: raw.version!,
      startsAt: raw.start!,
      endsAt: raw.end!,
      startsGlobally: raw.startsGlobally === "true",
      endsGlobally: raw.endsGlobally === "true",
      fiveStarIds: idsOf(fiveStars!, 5),
      fourStarIds: idsOf(fourStars!, 4),
    };
  });
  if (errors.length)
    throw new Error(`來源資料有 ${errors.length} 個問題，沒有寫入：\n  ${errors.join("\n  ")}`);

  const keyOf = (b: { pool: string; startsAt: string }) => `${b.pool} ${b.startsAt}`;
  const current = new Map(existing.map((b) => [keyOf(b), b]));
  const added = rows.filter((b) => !current.has(keyOf(b)));
  const changed = rows.flatMap((b) => {
    const old = current.get(keyOf(b));
    const same =
      !old ||
      (old.version === b.version &&
        old.endsAt === b.endsAt &&
        old.startsGlobally === b.startsGlobally &&
        old.endsGlobally === b.endsGlobally &&
        sameIds(old.fiveStarIds, b.fiveStarIds) &&
        sameIds(old.fourStarIds, b.fourStarIds));
    return same ? [] : [{ id: old.id, row: b }];
  });
  const sourceKeys = new Set(rows.map(keyOf));
  const onlyInDb = existing.filter((b) => !sourceKeys.has(keyOf(b)));

  console.log(`來源 ${rows.length} 期、資料庫 ${existing.length} 期`);
  const perPool = Object.values(POOLS).map(
    (pool) => `${pool} ${added.filter((b) => b.pool === pool).length}`,
  );
  console.log(`新增 ${added.length} 期（${perPool.join("、")}）`);
  console.log(`更新 ${changed.length} 期`);
  for (const { row } of changed) console.log(`  ${row.pool} ${row.version} ${row.startsAt}`);
  console.log(`只在資料庫 ${onlyInDb.length} 期（不會刪除）`);
  for (const b of onlyInDb) console.log(`  ${b.pool} ${b.version} ${b.startsAt}`);

  if (confirm !== endpoint) {
    console.log(`\n以上只是檢查。要寫入時加上 --confirm=${endpoint}`);
    return;
  }
  await db.transaction(async (tx) => {
    if (added.length) await tx.insert(t.wishBanners).values(added);
    for (const { id, row } of changed)
      await tx.update(t.wishBanners).set(row).where(eq(t.wishBanners.id, id));
  });
  console.log(`\n已寫入 ${endpoint}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
