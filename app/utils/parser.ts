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
      return (value * 100).toFixed(0) + "%";
    case "F1":
      return value.toFixed(1);
    case "F2":
      return value.toFixed(2);
    case "I":
      return Math.round(value).toLocaleString("en-US");
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
  return (
    result
      .replace(
        /\{LINK\}((?:<span[^>]*>)?(.*?)(?:<\/span>)?)\{\/LINK\}/g,
        (_, htmlContent: string, rawKeyword: string) => {
          const [type, name] = resolveLink(stripKeyword(rawKeyword), linkTypeOf, glossary);
          return `<span data-type="${type}" data-name="${name}" style="${spanStyle}">${htmlContent}</span>`;
        },
      )
      // 強化前後的差異標記（describeAbility）
      .replace(/\{DIFF=(new|changed)\}/g, '<span class="ability-diff-$1">')
      .replace(/\{\/DIFF\}/g, "</span>")
  );
}

/** 去掉關鍵字前後的引號與書名號，例如「影舞」→ 影舞 */
function stripKeyword(keyword: string): string {
  return keyword.replace(/[「」『』《》〈〉]/g, "").trim();
}

/**
 * 找出 `{LINK}` 關鍵字對應的類型與名稱
 * 順序：名詞說明中的別名（`linkTo*`）→ 技能名稱 → 相關效果（`relatedEffects`）
 */
function resolveLink(
  keyword: string,
  linkTypeOf: Map<string, string>,
  glossary: Glossary | null,
): [type: string, name: string] {
  const aliases = [
    ["effect", glossary?.linkToEffect],
    ["talent", glossary?.linkToTalent],
    ["passive", glossary?.linkToPassive],
    ["constellation", glossary?.linkToConstellation],
  ] as const;
  for (const [type, map] of aliases) {
    const target = map?.[keyword];
    if (target) return [type, target];
  }
  const type = linkTypeOf.get(keyword);
  if (type) return [type, keyword];
  if (glossary?.relatedEffects?.[keyword] !== undefined) return ["effect", keyword];
  return ["unknown", keyword];
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
    .replace(/\{([FM])#([^}]*)\}/g, (_, gender: string, text: string) =>
      (gender === "M") === (playerGender === "male") ? text : "",
    )
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
