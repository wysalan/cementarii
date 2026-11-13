import { sql } from "drizzle-orm";
import { pgTable, integer, smallint, text, primaryKey, index, check } from "drizzle-orm/pg-core";
import { locale, timestamps } from "../shared";

/** 素材總表 */
export const materials = pgTable(
  "materials",
  {
    id: integer().primaryKey(),
    category: text().notNull(), // AVATAR_MATERIAL、EXCHANGE、CONSUME、EXP_FRUIT、ADSORBATE
    rarity: smallint().notNull(),
    icon: text().notNull(), // UI_ItemIcon_202
    ...timestamps,
  },
  (t) => [
    index("materials_category_rarity_idx").on(t.category, t.rarity),
    check("materials_rarity_check", sql`${t.rarity} between 1 and 5`),
  ],
);

/** 素材細節（多語系）資料表 */
export const materialI18n = pgTable(
  "material_i18n",
  {
    materialId: integer()
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    locale: locale().notNull(),
    name: text().notNull(),
    typeText: text(),
    description: text(),
    sources: text().array(), // NULL：沒有資料；[]：沒有一般取得方式
  },
  (t) => [primaryKey({ columns: [t.materialId, t.locale] })],
);
