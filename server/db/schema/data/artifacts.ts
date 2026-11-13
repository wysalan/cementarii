import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  integer,
  smallint,
  text,
  primaryKey,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { locale, timestamps } from "../shared";
import { gameVersions } from "../core/versions";

/** 聖遺物部位 */
export const artifactSlot = pgEnum("artifact_slot", [
  "flower",
  "plume",
  "sands",
  "goblet",
  "circlet",
]);

/** 聖遺物總表 */
export const artifactSets = pgTable(
  "artifact_sets",
  {
    id: integer().primaryKey(), // 遊戲內部 ID
    slug: text().notNull().unique(),
    minRarity: smallint().notNull(), // 最低稀有度
    maxRarity: smallint().notNull(), // 最高稀有度
    releasedIn: text()
      .notNull()
      .references(() => gameVersions.version),
    ...timestamps,
  },
  (t) => [
    check(
      "artifact_sets_rarity_check",
      sql`${t.minRarity} between 1 and 5 and ${t.maxRarity} between ${t.minRarity} and 5`,
    ),
  ],
);

/** 聖遺物細節（多語系）資料表 */
export const artifactSetI18n = pgTable(
  "artifact_set_i18n",
  {
    setId: integer()
      .notNull()
      .references(() => artifactSets.id, { onDelete: "cascade" }),
    locale: locale().notNull(),
    name: text().notNull(),
    bonus1pc: text(), // 沒有 1 件套效果時為 NULL
    bonus2pc: text(),
    bonus4pc: text(),
  },
  (t) => [primaryKey({ columns: [t.setId, t.locale] })],
);

/** 聖遺物部件總表 */
export const artifactPieces = pgTable(
  "artifact_pieces",
  {
    setId: integer()
      .notNull()
      .references(() => artifactSets.id, { onDelete: "cascade" }),
    slot: artifactSlot().notNull(),
    icon: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.setId, t.slot] })],
);

/** 聖遺物部件細節（多語系）資料表 */
export const artifactPieceI18n = pgTable(
  "artifact_piece_i18n",
  {
    setId: integer().notNull(),
    slot: artifactSlot().notNull(),
    locale: locale().notNull(),
    name: text().notNull(),
    description: text(),
    story: text(),
  },
  (t) => [
    primaryKey({ columns: [t.setId, t.slot, t.locale] }),
    foreignKey({
      columns: [t.setId, t.slot],
      foreignColumns: [artifactPieces.setId, artifactPieces.slot],
    }).onDelete("cascade"),
  ],
);
