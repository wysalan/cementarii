import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  smallint,
  text,
  jsonb,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { locale, weaponType, timestamps } from "../shared";
import { gameVersions } from "../core/versions";
import { materials } from "../core/materials";
import type { WeaponStats, RefinementParams } from "../types";

/** 武器總表 */
export const weapons = pgTable(
  "weapons",
  {
    id: integer().primaryKey(), // 遊戲內部 ID
    slug: text().notNull().unique(),
    weaponType: weaponType().notNull(),
    rarity: smallint().notNull(),
    substatType: text(), // 副詞條屬性
    stats: jsonb().$type<WeaponStats>().notNull(),
    refinementParams: jsonb().$type<RefinementParams>().notNull(),
    images: jsonb().$type<{ icon: string; gacha: string }>().notNull(),
    releasedIn: text()
      .notNull()
      .references(() => gameVersions.version),
    ...timestamps,
  },
  (t) => [
    index("weapons_type_rarity_idx").on(t.weaponType, t.rarity),
    check("weapons_rarity_check", sql`${t.rarity} between 1 and 5`),
  ],
);

/** 武器細節（多語系）資料表 */
export const weaponI18n = pgTable(
  "weapon_i18n",
  {
    weaponId: integer()
      .notNull()
      .references(() => weapons.id, { onDelete: "cascade" }),
    locale: locale().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    effectName: text(),
    effectDescription: text(), // 特效說明（包含 {0}、{1} 佔位符）
    story: text(),
  },
  (t) => [primaryKey({ columns: [t.weaponId, t.locale] })],
);

/** 武器消耗素材資料表 */
export const weaponCosts = pgTable(
  "weapon_costs",
  {
    weaponId: integer()
      .notNull()
      .references(() => weapons.id, { onDelete: "cascade" }),
    stage: smallint().notNull(), // 突破 1～6
    materialId: integer()
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    count: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.weaponId, t.stage, t.materialId] }),
    index("weapon_costs_material_idx").on(t.materialId),
    check("weapon_costs_count_check", sql`${t.count} > 0`),
  ],
);
