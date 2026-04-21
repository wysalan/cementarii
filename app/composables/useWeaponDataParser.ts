interface Effect {
  text: {
    name: string;
    description: string;
  };
  params: {
    [key: string]: string[];
  };
}

export default function useWeaponDataParser() {
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
  return { parseEffectDescription };
}
