import { z } from "zod";
import type { H3Event } from "h3";

const localeQuery = z.object({
  locale: z.enum(tables.locale.enumValues).default("zh-TW"),
});

export async function getLocale(event: H3Event) {
  const { locale } = await getValidatedQuery(event, localeQuery.parse);
  return locale;
}

/**
 * 把查詢結果裡的 `i18n` 陣列攤平：合併到上一層並移除 `i18n` 欄位
 * @template T 含有 `i18n` 陣列的資料列，例如角色、技能、素材、服裝
 * @returns 原本的欄位（不含 `i18n`）加上從翻譯取出的欄位
 * @throws {H3Error} 404：`i18n` 是空陣列，表示這筆資料沒有該語系的翻譯
 * @example
 * const ability = { id: 1, kind: "normal_attack", i18n: [{ name: "普通攻擊", description: "…" }] };
 * flattenI18n(ability);
 * // → { id: 1, kind: "normal_attack", name: "普通攻擊", description: "…" }
 */
export function flattenI18n<T extends { i18n: object[] }>({
  i18n,
  ...rest
}: T): Omit<T, "i18n"> & T["i18n"][number] {
  const text = i18n[0];
  if (!text) throw createError({ statusCode: 404, statusMessage: "Translation not found" });
  return { ...rest, ...text };
}
