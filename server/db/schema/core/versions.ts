import { pgTable, smallint, text, date, unique } from "drizzle-orm/pg-core";

/** 遊戲版本資料表 */
export const gameVersions = pgTable(
  "game_versions",
  {
    version: text().primaryKey(), // 6.4
    major: smallint().notNull(), // 大版本，如 6
    minor: smallint().notNull(), // 小版本，如 4
    releasedOn: date(), // 更新日期
  },
  (t) => [unique().on(t.major, t.minor)],
);
