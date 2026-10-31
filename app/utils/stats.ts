/**
 * 依屬性類型格式化數值：元素精通顯示整數，其餘顯示百分比（小數點後一位）
 * @param type 屬性類型（`FIGHT_PROP_*`）
 * @param value 原始數值
 * @example formatStatValue("FIGHT_PROP_CRITICAL_HURT", 0.441) // "44.1%"
 */
export function formatStatValue(type: string, value: number) {
  return type === "FIGHT_PROP_ELEMENT_MASTERY" ? value.toFixed(0) : (value * 100).toFixed(1) + "%";
}
