import { pgTable, pgEnum, integer, text, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { timestamps } from "../shared";
import { gameVersions } from "../core/versions";

/** 祈願卡池類型（常駐與新手沒有 UP，不需要紀錄） */
export const wishPool = pgEnum("wish_pool", ["character", "weapon", "chronicled"]);

/** 歷期祈願卡池資料表 */
export const wishBanners = pgTable(
  "wish_banners",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    pool: wishPool().notNull(),
    version: text()
      .notNull()
      .references(() => gameVersions.version),
    startsAt: timestamp({ mode: "string" }).notNull(), // 亞服當地時間，YYYY-MM-DD HH:mm:ss
    endsAt: timestamp({ mode: "string" }).notNull(),
    startsGlobally: boolean().notNull().default(false), // 全球同時開始，其他伺服器要換算時區
    endsGlobally: boolean().notNull().default(false),
    // 角色與武器的遊戲內部 ID，兩者混放所以沒有外鍵
    fiveStarIds: integer().array().notNull(), // UP 的 5 星，集錄祈願則是全部可選的 5 星
    fourStarIds: integer().array().notNull(), // UP 的 4 星
    ...timestamps,
  },
  (t) => [unique("wish_banners_pool_starts_at_key").on(t.pool, t.startsAt)],
);
