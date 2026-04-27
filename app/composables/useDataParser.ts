interface Skills {
  talents: {
    name: string;
    description: string;
    descriptionBuffed: string;
    attributes: {
      labels: string[];
      parameters: {
        [key: string]: number[];
      };
    };
  }[];
  passives: {
    name: string;
    description: string;
    descriptionBuffed: string;
  }[];
  constellation?: {
    name: string;
    description: string;
    descriptionBuffed: string;
  }[];
}

interface TalentItem {
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
  relatedEffects: Record<string, string>;
  linkToEffect: Record<string, string>;
  linkToTalent: Record<string, string>;
  linkToPassive: Record<string, string>;
  linkToConstellation: Record<string, string>;
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
    skills?: Skills | null,
    dictionary?: Dictionary | null,
  ): string {
    if (!content) return "";
    const spanStyle = "cursor: pointer; font-weight: bold";
    const talentKeywords = skills?.talents.map((talent) => talent.name);
    const passiveKeywords = skills?.passives.map((passive) => passive.name);
    const constellationKeywords = skills?.constellation?.map((constellation) => constellation.name);
    let result = content
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
          if (talentKeywords?.includes(keyword)) {
            return `<span data-type="talent" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (passiveKeywords?.includes(keyword)) {
            return `<span data-type="passive" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (constellationKeywords && constellationKeywords.includes(keyword)) {
            return `<span data-type="constellation" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.relatedEffects &&
            Object.keys(dictionary.relatedEffects)?.includes(keyword)
          ) {
            return `<span data-type="effect" data-name="${keyword}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.linkToEffect &&
            Object.keys(dictionary.linkToEffect)?.includes(keyword)
          ) {
            return `<span data-type="effect" data-name="${dictionary.linkToEffect[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.linkToTalent &&
            Object.keys(dictionary.linkToTalent)?.includes(keyword)
          ) {
            return `<span data-type="talent" data-name="${dictionary.linkToTalent[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.linkToPassive &&
            Object.keys(dictionary.linkToPassive)?.includes(keyword)
          ) {
            return `<span data-type="passive" data-name="${dictionary.linkToPassive[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
          } else if (
            dictionary.linkToConstellation &&
            Object.keys(dictionary.linkToConstellation)?.includes(keyword)
          ) {
            return `<span data-type="constellation" data-name="${dictionary.linkToConstellation[keyword]}" style="${spanStyle}">${htmlContent}</span>`;
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

  function parseTalentAttributes(
    talents: TalentItem,
    targetLevel: number,
  ): TalentAttributeResult[] {
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
