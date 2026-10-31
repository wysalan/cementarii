import type { CharacterData } from "@/types/api";
type Ability = CharacterData["abilities"][number];
type Glossary = CharacterData["glossary"];

const LINK_TYPE: Record<Ability["kind"], string> = {
  normal_attack: "talent",
  elemental_skill: "talent",
  elemental_burst: "talent",
  alternate_sprint: "talent",
  passive: "passive",
  constellation: "constellation",
};

function formatAttrParam(value: number, format: string): string {
  switch (format) {
    case "F1P":
      return (value * 100).toFixed(1) + "%";
    case "F2P":
      return (value * 100).toFixed(2) + "%";
    case "P":
      return (value * 100).toFixed(1) + "%";
    case "F1":
      return value.toFixed(0);
    default:
      return String(value);
  }
}

export function parseDescriptionText(
  content: string | undefined,
  abilities: Ability[],
  glossary: Glossary | null,
): string {
  if (!content) return "";
  const spanStyle = "cursor: pointer; font-weight: bold";
  const linkTypeOf = new Map(abilities.map((a) => [a.name, LINK_TYPE[a.kind]]));
  const result = content
    .replace(/\n/g, "<br>")
    .replace(
      /<color=(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}>(.*?)<\/color>/g,
      (_, color: string, content: string) => {
        return `<span style="color: ${color}">${content}</span>`;
      },
    );
  return result.replace(
    /\{LINK\}((?:<span[^>]*>)?(.*?)(?:<\/span>)?)\{\/LINK\}/g,
    (_, htmlContent: string, keyword: string) => {
      const type = linkTypeOf.get(keyword);
      if (type) {
        return `<span data-type="${type}" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
      } else if (
        glossary?.relatedEffects &&
        Object.keys(glossary?.relatedEffects)?.includes(keyword)
      ) {
        return `<span data-type="effect" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
      } else if (glossary?.linkToEffect && Object.keys(glossary?.linkToEffect)?.includes(keyword)) {
        return `<span data-type="effect" data-name="${glossary?.linkToEffect[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
      } else if (glossary?.linkToTalent && Object.keys(glossary?.linkToTalent)?.includes(keyword)) {
        return `<span data-type="talent" data-name="${glossary?.linkToTalent[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
      } else if (
        glossary?.linkToPassive &&
        Object.keys(glossary?.linkToPassive)?.includes(keyword)
      ) {
        return `<span data-type="passive" data-name="${glossary?.linkToPassive[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
      } else if (
        glossary?.linkToConstellation &&
        Object.keys(glossary?.linkToConstellation)?.includes(keyword)
      ) {
        return `<span data-type="constellation" data-name="${glossary?.linkToConstellation[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
      } else {
        return `<span data-type="unknown" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
      }
    },
  );
}

export function parseTalentAttributes(ability: Ability, level: number) {
  const params = ability.parameters ?? {};
  return (ability.labels ?? []).map((label) => {
    const [text, formatPart] = label.split("|");
    const value = formatPart?.replace(
      /\{(param\d+):([\w]+)\}/g,
      (_, paramKey: string, format: string): string => {
        const rawValue = params[paramKey]?.[level - 1] || 0;
        return formatAttrParam(rawValue, format);
      },
    );
    return { text, value };
  });
}

export function parseStoryContent(
  content: string | undefined | null,
  userName: string,
  playerGender: string,
) {
  if (!content) return "";
  return content
    .replace(/\n/g, "<br>")
    .replace(
      /<color=(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}>(.*?)<\/color>/g,
      (_, color: string, content: string) => {
        return `<span style="color: ${color}">${content}</span>`;
      },
    )
    .replace(/^#/g, "")
    .replace(/{F#妳}{M#你}/g, playerGender && (playerGender === "male" ? "你" : "妳"))
    .replace(/{NICKNAME}/g, userName);
}

/**
 * 將武器特效說明的 `{0}`、`{1}` 佔位符換成指定精煉等階的數值，並處理顏色與換行
 * @param description 特效說明（`effectDescription`），沒有特效時為 `null`
 * @param params 精煉參數（`refinementParams`）：`[參數索引][精煉 1～5 階]`
 * @param rank 精煉等階
 */
export function parseEffectDescription(
  description: string | null,
  params: string[][],
  rank: number,
): string {
  if (!description) return "";
  return description
    .replace(
      /<color=#[0-9a-fA-F]{8}>(.*?)<\/color>/g,
      (_, content: string) => `<span style="color: #3299CC; font-weight: 600">${content}</span>`,
    )
    .replace(/\n/g, "<br>")
    .replace(/\{(\d+)\}/g, (_, index: string) => params[Number(index)]?.[rank - 1] ?? "");
}
