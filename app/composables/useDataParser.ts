interface Talents {
  name: string;
  description: string;
  descriptionBuffed: string | null;
  attributes: {
    labels: string[];
    parameters: Record<string, number[]>;
  };
}

interface TalentAttributeResult {
  text: string | undefined;
  value: string | undefined;
}

interface Dictionary {
  talentKeywords: string[];
  constellationKeywords: string[];
  relatedEffects: Record<string, string>;
  linkToEffect: Record<string, string>;
}

interface Effect {
  text: {
    name: string;
    description: string;
  };
  params: {
    [key: string]: string[];
  };
}

export default function useDataParser() {
  function parseDescriptionText(
    content: string | undefined,
    dictionary?: Dictionary | null,
  ): string {
    if (!content) return "";
    const spanStyle = "cursor: pointer; font-weight: bold";
    const result = content
      .replace(/\\n/g, "<br>")
      .replace(
        /<color=(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}>(.*?)<\/color>/g,
        (_, color: string, content: string) => {
          return `<span style="color: ${color}">${content}</span>`;
        },
      );
    if (dictionary) {
      return result.replace(
        /\{LINK\}((?:<span[^>]*>)?(.*?)(?:<\/span>)?)\{\/LINK\}/g,
        (_, htmlContent: string, keyword: string) => {
          if (dictionary.talentKeywords && dictionary.talentKeywords.includes(keyword)) {
            return `<span data-type="talent" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.constellationKeywords &&
            dictionary.constellationKeywords.includes(keyword)
          ) {
            return `<span data-type="constellation" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.relatedEffects &&
            Object.keys(dictionary.relatedEffects).includes(keyword)
          ) {
            return `<span data-type="effect" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.linkToEffect &&
            Object.keys(dictionary.linkToEffect).includes(keyword)
          ) {
            return `<span data-type="related" data-name="${dictionary.linkToEffect[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
          } else {
            return `<span data-type="unknown" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          }
        },
      );
    }
    return result;
  }

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

  function parseTalentAttributes(talents: Talents, targetLevel: number): TalentAttributeResult[] {
    const labelList = talents.attributes.labels;
    const params = talents.attributes.parameters;
    return labelList.map((label) => {
      const [text, formatPart] = label.split("|");
      const value = formatPart?.replace(
        /\{(param\d+):([\w]+)\}/g,
        (_, paramKey: string, format: string): string => {
          const rawValue = params[paramKey]?.[targetLevel - 1] || 0;
          return formatAttrParam(rawValue, format);
        },
      );
      return { text, value };
    });
  }

  function parseStoryContent(
    content: string | undefined | null,
    userName: string,
    playerGender: string,
  ) {
    if (!content) return "";
    return content
      .replace(/\\n/g, "<br>")
      .replace(/^#/g, "")
      .replace(/{F#妳}{M#你}/g, playerGender && (playerGender === "male" ? "你" : "妳"))
      .replace(/{NICKNAME}/g, userName);
  }

  function parseEffectDescription(effect: Effect | null, targetRank: number): string | undefined {
    if (!effect) return undefined;
    const params = effect.params;
    return effect.text.description
      .replace(
        /<color=(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}>(.*?)<\/color>/g,
        (_, color: string, content: string) => {
          return `<span style="color: #3299CC; font-weight: 600";>${content}</span>`;
        },
      )
      .replace(/\\n/g, "<br>")
      .replace(/{(.*?)}/g, (_, paramIndex: string): string => {
        return params[paramIndex]![targetRank - 1] || "";
      });
  }

  return {
    parseDescriptionText,
    parseTalentAttributes,
    parseStoryContent,
    parseEffectDescription,
  };
}
