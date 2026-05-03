export {};

declare global {
  namespace PrismaJson {
    type characterBirthday = {
      mm: string;
      dd: string;
      mmdd: string;
    };

    type characterCV = {
      CHS: string;
      EN: string;
      JP: string;
      KR: string;
    };

    type characterStats = {
      hp: {
        base: number;
        curve: string;
      };
      attack: {
        base: number;
        curve: string;
      };
      defense: {
        base: number;
        curve: string;
      };
      substat: {
        text: string;
        type: string;
        base?: number;
      };
      promotion: Record<string, number>[];
    };

    type characterCosts = {
      [key: string]: {
        id: number;
        name: string;
        count: number;
      };
    };

    type characterTalents = {
      list: {
        [key: string]: {
          name: string;
          description: string;
          descriptionBuffed: string;
          attributes: {
            labels: string[];
            parameters: {
              [key: string]: number[];
            };
          };
        };
      };
      costs: Array<{ id: number; name: string; count: number }[]>;
    };

    type characterPassives = Array<{
      name: string;
      description: string;
      descriptionBuffed: string;
    }>;

    type characterConstellation = {
      name: string;
      list: {
        name: string;
        description: string;
        descriptionBuffed: string;
      }[];
    };

    type characterDictionary = {
      relatedEffects: Record<string, string>;
      linkToEffect: Record<string, string>;
      linkToTalent: Record<string, string>;
      linkToPassive: Record<string, string>;
      linkToConstellation: Record<string, string>;
    };

    type characterImages = {
      [key: string]: string;
    };

    type characterProfile = {
      story: {
        title: string;
        title2: string;
        text: string;
        text2: string;
        tips: string;
      }[];
      voiceover: {
        title: string;
        text: string;
        tasks?: [
          {
            type: string;
            questList: {
              id: number;
              questTitle: string;
              chapterId: number;
              chapterTitle: string;
            };
          },
        ];
      }[];
    };

    type characterOutfits = {
      id: number;
      name: string;
      version: string;
      sDefault: boolean;
      description: string;
      images: Record<string, string>;
    }[];

    type weaponEffect = {
      text: {
        name: string;
        description: string;
      };
      params: {
        [key: string]: string[];
      };
    };

    type weaponStats = {
      type: {
        attack: string;
        substat: string;
      };
      base: {
        attack: number;
        substat: number;
      };
      curve: {
        attack: string;
        substat: string;
      };
      promotion: Record<string, number>[];
    };

    type weaponCosts = {
      [key: string]: {
        id: number;
        name: string;
        count: number;
      };
    };

    type weaponImages = {
      [key: string]: string;
    };

    type artifactRarityList = number[];

    type artifactParts = {
      [key: string]: {
        name: string;
        relicType: string;
        relicText: string;
        description: string;
        story: string;
      };
    };

    type artifactImages = {
      flower: string;
      plume: string;
      sands: string;
      goblet: string;
      circlet: string;
    };
  }
}
