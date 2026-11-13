import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  integer,
  smallint,
  text,
  jsonb,
  boolean,
  timestamp,
  primaryKey,
  foreignKey,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { locale, element, weaponType, timestamps } from "../shared";
import { gameVersions } from "../core/versions";
import { materials } from "../core/materials";
import type {
  CharacterStats,
  CharacterImages,
  AbilityParameters,
  Glossary,
  VoiceActors,
  Story,
  Voiceline,
} from "../types";

/** 體型 */
export const bodyType = pgEnum("body_type", ["boy", "girl", "lady", "male", "loli"]);

/** 技能、天賦、命之座 */
export const abilityKind = pgEnum("ability_kind", [
  "normal_attack",
  "elemental_skill",
  "elemental_burst",
  "alternate_sprint",
  "passive",
  "constellation",
]);

/** 素材消耗類型 */
export const costKind = pgEnum("cost_kind", ["ascension", "talent"]);

/** 角色總表 */
export const characters = pgTable(
  "characters",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(), // 資料表辨識 ID
    gameId: integer().notNull(), // 遊戲內部 ID
    slug: text().notNull().unique(),
    element: element(),
    weaponType: weaponType().notNull(),
    bodyType: bodyType().notNull(), // 角色體型
    rarity: smallint().notNull(),
    association: text().notNull(), // 所屬地區
    birthMonth: smallint(),
    birthDay: smallint(),
    stats: jsonb().$type<CharacterStats>().notNull(),
    images: jsonb().$type<CharacterImages>().notNull(),
    releasedIn: text()
      .notNull()
      .references(() => gameVersions.version), // 實裝版本
    releasedAt: timestamp({ withTimezone: true }), // 實裝時間
    enhancedIn: text().references(() => gameVersions.version), // 角色加強實裝版本
    ...timestamps,
  },
  (t) => [
    unique("characters_game_id_element_key").on(t.gameId, t.element),
    index("characters_element_idx").on(t.element),
    check("characters_rarity_check", sql`${t.rarity} in (4, 5)`),
    check(
      "characters_birthday_check",
      sql`${t.birthMonth} between 1 and 12 and ${t.birthDay} between 1 and 31`,
    ),
  ],
);

/** 角色細節（多語系）資料表 */
export const characterI18n = pgTable(
  "character_i18n",
  {
    characterId: integer()
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    locale: locale().notNull(),
    name: text().notNull(),
    title: text(),
    description: text().notNull(),
    affiliation: text(),
    region: text(),
    constellationName: text(),
    voiceActors: jsonb().$type<VoiceActors>(),
    glossary: jsonb().$type<Glossary>(),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.locale] })],
);

/** 角色故事資料表 */
export const characterLore = pgTable(
  "character_lore",
  {
    characterId: integer()
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    locale: locale().notNull(),
    stories: jsonb().$type<Story[]>().notNull().default([]),
    voicelines: jsonb().$type<Voiceline[]>().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.locale] })],
);

/** 角色技能總表 */
export const characterAbilities = pgTable(
  "character_abilities",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    characterId: integer()
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    kind: abilityKind().notNull(),
    sortOrder: smallint().notNull().default(0), // 固有天賦與命之座的順序
    isEnhanced: boolean().notNull().default(false), // 是否為強化後技能
    icon: text(),
    parameters: jsonb().$type<AbilityParameters>(), // 固有天賦與命之座為 NULL
  },
  (t) => [
    unique("character_abilities_character_kind_order_enhanced_key").on(
      t.characterId,
      t.kind,
      t.sortOrder,
      t.isEnhanced,
    ),
  ],
);

/** 角色技能細節（多語系）資料表 */
export const characterAbilityI18n = pgTable(
  "character_ability_i18n",
  {
    abilityId: integer()
      .notNull()
      .references(() => characterAbilities.id, { onDelete: "cascade" }),
    locale: locale().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    labels: text().array(), // ['一段傷害|{param1:F1P}', …]
    // [等級 - 1][項目]：格式會隨等級改變時才有（F1P → P），各等級都與 labels 相同時為 NULL
    labelsByLevel: jsonb().$type<string[][]>(),
  },
  (t) => [primaryKey({ columns: [t.abilityId, t.locale] })],
);

/** 角色消耗素材資料表 */
export const characterCosts = pgTable(
  "character_costs",
  {
    characterId: integer()
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    kind: costKind().notNull(),
    stage: smallint().notNull(), // 階級：升級 1～6 階（及上限突破 7～8 階）；天賦 1～9（升到 2～10 級）
    materialId: integer()
      .notNull()
      .references(() => materials.id, { onDelete: "restrict" }),
    count: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.characterId, t.kind, t.stage, t.materialId] }),
    index("character_costs_material_idx").on(t.materialId),
    check("character_costs_count_check", sql`${t.count} > 0`),
  ],
);

/** 角色衣裝總表 */
export const outfits = pgTable(
  "outfits",
  {
    id: integer().notNull(), // 遊戲內部 ID
    variant: text().notNull().default("default"), // 衣裝變體（一般為 default；旅行者為 aether、lumine）
    images: jsonb().$type<CharacterImages>().notNull(),
    releasedIn: text().references(() => gameVersions.version),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.id, t.variant] })],
);

/** 角色衣裝細節（多語系）資料表 */
export const outfitI18n = pgTable(
  "outfit_i18n",
  {
    outfitId: integer().notNull(),
    variant: text().notNull().default("default"),
    locale: locale().notNull(),
    name: text().notNull(),
    description: text(),
  },
  (t) => [
    primaryKey({ columns: [t.outfitId, t.variant, t.locale] }),
    foreignKey({
      columns: [t.outfitId, t.variant],
      foreignColumns: [outfits.id, outfits.variant],
    }).onDelete("cascade"),
  ],
);

/** 角色衣裝對應角色資料表 */
export const characterOutfits = pgTable(
  "character_outfits",
  {
    characterId: integer()
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    outfitId: integer().notNull(),
    variant: text().notNull().default("default"),
    isDefault: boolean().notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.characterId, t.outfitId] }),
    foreignKey({
      columns: [t.outfitId, t.variant],
      foreignColumns: [outfits.id, outfits.variant],
    }).onDelete("cascade"),
  ],
);
