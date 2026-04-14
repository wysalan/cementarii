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
      hp: Record<string, string | number>;
      attack: Record<string, string | number>;
      defense: Record<string, string | number>;
      substat: Record<string, string>;
      promotion: Record<string, string>[];
    };

    type characterCosts = {
      [key: string]: {
        id: number;
        name: string;
        count: number;
      };
    };

    type characterConstellation = {
      name: string;
      list: {
        name: string;
        description: string;
        descriptionBuffed: string;
      }[];
    };

    type characterImages = {
      [key: string]: string;
    };
  }
}
