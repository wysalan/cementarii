/** 角色基本資訊 */
export type CharacterStats = {
  // 基礎數值（ascensionStat 多數角色為 0，例如菈烏瑪為 200）；
  // extra 是突破屬性以外、不隨等級變化的基礎屬性（例如奈芙爾的 FIGHT_PROP_ELEMENT_MASTERY: 100），沒有時不填
  base: {
    hp: number;
    attack: number;
    defense: number;
    ascensionStat: number;
    extra?: Record<string, number>;
  };
  curves: { hp: string; attack: string; defense: string }; // 升級曲線（例如 GROW_CURVE_HP_S5）
  ascensionStat: string; // 例如 FIGHT_PROP_CRITICAL
  promotions: {
    maxLevel: number;
    hp: number;
    attack: number;
    defense: number;
    ascensionStat: number;
  }[];
};

/** 角色圖片 */
export type CharacterImages = { gacha: string; icon: string };

/** 天賦倍率：{ param1: [Lv1, …, Lv15] } */
export type AbilityParameters = Record<string, number[]>;

/** 角色詞彙表 */
export type Glossary = {
  linkToEffect?: Record<string, string>;
  linkToTalent?: Record<string, string>;
  linkToPassive?: Record<string, string>;
  linkToConstellation?: Record<string, string>;
  relatedEffects?: Record<string, string>;
};

/** 配音演員 */
export type VoiceActors = { en: string; ja: string; ko: string; zhCN: string };

/** 角色故事 */
export type Story = { title: string; text: string; title2?: string; text2?: string; tips?: string };

/** 語音解鎖條件：完成指定任務 */
export type VoicelineTask = {
  type: "finishMainQuest" | "finishSubQuest";
  questList: { id: number; chapterId?: number; chapterTitle?: string; questTitle?: string }[];
};

/** 角色語音 */
export type Voiceline = {
  type: "friendship" | "battle"; // 友好度語音、戰鬥語音
  title: string;
  text: string;
  tips?: string; // 解鎖條件的說明（例如「好感等級達到4級後開啟」）；沒有時不填
  tasks?: VoicelineTask[]; // 需要完成的任務；沒有時不填
};

/** 武器基本資訊 */
export type WeaponStats = {
  base: { attack: number; substat?: number };
  curves: { attack: string; substat?: string };
  promotions: { maxLevel: number; attack: number }[];
};

/** 武器精煉等級（[參數索引][精煉 1～5 階的數值]） */
export type RefinementParams = string[][];
