import type { CharacterData } from "@/types/api";
type Ability = CharacterData["abilities"][number];

/** 有強化版本的技能才有 `enhanced` 與另一個版本 `alternate` */
export interface AbilityPopoverData {
  title: string;
  name: string;
  html: string;
  enhanced?: boolean;
  alternate?: AbilityPopoverData;
}

/**
 * 建立技能描述 popover 的內容
 * @param data 角色資料，用來查詢技能（`abilities`）與名詞解釋（`glossary`）
 * @param abilities 要對應連結的技能清單（可傳 ref／getter）
 * @returns `(type, name) => AbilityPopoverData`；找不到對應資料時回傳錯誤訊息
 * @example
 * const abilities = computed(() => data.abilities.filter((a) => !a.isEnhanced));
 * const resolvePopover = useAbilityPopover(data, abilities);
 * // <UIHoverPopover :resolve="resolvePopover">…</UIHoverPopover>
 */
export function useAbilityPopover(data: CharacterData, abilities: MaybeRefOrGetter<Ability[]>) {
  const { t } = useI18n();
  const html = (description: string) =>
    parseDescriptionText(description, toValue(abilities), data.glossary);

  const abilityData = (type: string, ability: Ability): AbilityPopoverData => ({
    title: t(`character.popover.${type}`),
    name: ability.name,
    html: html(describeAbility(data.abilities, ability)),
  });

  return (type: string, name: string): AbilityPopoverData => {
    if (type === "effect") {
      return {
        title: t("character.popover.effect"),
        name,
        html: html(data.glossary?.relatedEffects?.[name] || ""),
      };
    }
    const ability = toValue(abilities).find((a) => a.name === name);
    if (!ability) {
      return {
        title: t("character.popover.error.title"),
        name: t("character.popover.error.name"),
        html: html(t("character.popover.error.description")),
      };
    }
    const other = counterpartOf(data.abilities, ability);
    if (!other) return abilityData(type, ability);
    return {
      ...abilityData(type, ability),
      enhanced: ability.isEnhanced,
      alternate: { ...abilityData(type, other), enhanced: other.isEnhanced },
    };
  };
}
