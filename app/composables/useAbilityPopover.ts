import type { CharacterData } from "@/types/api";
type Ability = CharacterData["abilities"][number];

/**
 * 建立技能描述 popover 的內容
 * @param data 角色資料，用來查詢技能（`abilities`）與名詞解釋（`glossary`）
 * @param abilities 要對應連結的技能清單
 * @returns `(type, name) => { title, name, html }`；找不到對應資料時回傳錯誤訊息
 * @example
 * const abilities = data.abilities.filter((a) => !a.isEnhanced);
 * const resolvePopover = useAbilityPopover(data, abilities);
 * // <UIHoverPopover :resolve="resolvePopover">…</UIHoverPopover>
 */
export function useAbilityPopover(data: CharacterData, abilities: Ability[]) {
  const { t } = useI18n();

  const getPopupData = (type: string, name: string) => {
    if (type === "effect") {
      return {
        title: t("character.popover.effect"),
        name,
        description: data.glossary?.relatedEffects?.[name] || "",
      };
    }
    const ability = abilities.find((a) => a.name === name);
    if (!ability) {
      return {
        title: t("character.popover.error.title"),
        name: t("character.popover.error.name"),
        description: t("character.popover.error.description"),
      };
    }
    return { title: t(`character.popover.${type}`), name, description: ability.description };
  };

  return (type: string, name: string) => {
    const { title, name: popupName, description } = getPopupData(type, name);
    return {
      title,
      name: popupName,
      html: parseDescriptionText(description, abilities, data.glossary),
    };
  };
}
