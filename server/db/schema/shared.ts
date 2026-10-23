import { pgEnum, timestamp } from "drizzle-orm/pg-core";

/** 時間戳 */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** 資料語系 */
export const locale = pgEnum("locale", ["zh-TW", "en", "ja", "ko"]);

/** 角色元素 */
export const element = pgEnum("element", [
  "pyro",
  "hydro",
  "anemo",
  "electro",
  "dendro",
  "cryo",
  "geo",
]);

/** 武器類型 */
export const weaponType = pgEnum("weapon_type", [
  "sword",
  "claymore",
  "polearm",
  "bow",
  "catalyst",
]);
