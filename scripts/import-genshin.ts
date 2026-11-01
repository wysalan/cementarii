// 從 genshin-db（主）與 Yatta API（輔）產生資料，補進資料庫中缺少的角色、武器、聖遺物
//
// 執行方式與各指令的說明見 HELP（pnpm tsx --env-file=.env scripts/import-genshin.ts --help）
//
// 資料來源分工（與資料庫既有資料一致）：
// - genshin-db：分類欄位、名稱與描述、突破與天賦素材、天賦倍率、衣裝、版本；武器與聖遺物幾乎全部
// - Yatta：生日、數值與突破加成、天賦與命之座文字（genshin-db 會拿掉顏色標籤）、名詞說明、故事、語音、實裝時間
//
// 需要手動補的部分（新角色才有，舊角色的 Yatta 文字本身就有）：
// - 戰技、爆發描述最後的 <em>「…」</em> 引言（Yatta 從伊法開始沒有提供）：會用 hoyowikiQuotes 從 HoYoWiki 補上，
//   wiki 也沒有的才要手動補
// - glossary 的 linkTo*：只放別名（{LINK} 關鍵字去掉「」等符號後，仍不等於技能名稱或 relatedEffects 的 key 時）。
//   匯入與 --sync-abilities 會用 inferLinkAliases 自動補上能唯一對應的，列為「不處理」的才要手動補
import fs from "node:fs";
import path from "node:path";
import { getTableName, inArray, sql, TransactionRollbackError } from "drizzle-orm";
import gdb from "genshin-db";
import { z } from "zod";
import { db, closeDb } from "./_db";
import * as t from "../server/db/schema";
import type {
  AbilityParameters,
  CharacterImages,
  CharacterStats,
  Glossary,
  RefinementParams,
  Story,
  VoiceActors,
  Voiceline,
  WeaponStats,
} from "../server/db/schema/types";

const LOCALE = "zh-TW" as const;
const GDB_OPTIONS = { resultLanguage: gdb.Language.ChineseTraditional };
const CACHE_DIR = path.resolve("node_modules/.cache/genshin-import");
/** 圖片的下載位置：.cache/<R2 上的路徑>.webp，資料夾與 R2 相同（avatar-icon/、skill-icon/…） */
const ASSET_DIR = path.resolve(".cache");
const R2_URL = "https://assets.cementarii.net";
const LUNARIS_URL = "https://api.lunaris.moe/data/assets";

/** --help 顯示的說明 */
const HELP = `從 genshin-db（主）與 Yatta API（輔）產生資料，寫入 DATABASE_URL 指向的資料庫（本機，直連 Neon）

用法：pnpm tsx --env-file=.env scripts/import-genshin.ts <指令> [參數]

匯入新項目
  --confirm=<endpoint> [--dry-run] [--only=characters,weapons,artifacts] [--slugs=a,b]
    匯入 genshin-db 收錄、資料庫還沒有的角色、武器、聖遺物（已存在的完全不會被動到）
    - 用到但資料庫還沒有的素材會一併寫入；寫入成功後下載新內容中 R2 還沒有的圖片
    - --slugs 中已在資料庫或拼錯的 slug 會被忽略並列出；slug 由英文名稱產生

同步會隨版本增加的內容
  --sync-voicelines | --sync-stories | --sync-lore | --sync-abilities | --sync-outfits [--slugs=a,b] [--refresh]
    [--confirm=<endpoint> --pick=all|slug|slug#編號 [--dry-run]]
    沒有 --confirm 時只列出新內容與編號；加上 --confirm 與 --pick 才寫入挑選的項目
    （all 全部、slug 該角色全部、slug#編號 指定項目，逗號分隔）。不指定 --slugs 時檢查所有角色
    --sync-voicelines  Yatta 有、資料庫沒有的語音（先以標題、再以內容對應）依 Yatta 的順序插入，
                       標題改變的更新標題；既有內容不覆寫
    --sync-stories     Yatta 有、資料庫沒有的故事依 Yatta 的順序插入；標題或內容不同的也列出，
                       挑選時整篇覆蓋（會蓋掉手動修改）
    --sync-lore        --sync-stories 與 --sync-voicelines 一起執行，編號以 s（故事）、v（語音）區分，
                       例如 --pick=mitya#s2,mitya#v15
    --sync-abilities   缺少的技能（角色加強、新增的被動）與名詞說明；被動排序、isEnhanced、
                       加強相關的 labels、圖示、enhancedIn 在挑選該角色時一併調整，既有說明不覆蓋
    --sync-outfits     角色還沒有的衣裝

補上空的欄位
  --fill-missing --confirm=<endpoint> [--dry-run] [--only=characters,weapons,artifacts] [--slugs=a,b]
    重新產生既有項目，只補空的欄位（NULL、空字串、空陣列、空物件，jsonb 逐層補）與缺少的素材、聖遺物部位；
    有值但內容不同的只列出不更新。新的技能、語音、故事、衣裝請用同步指令

比對
  --compare=slug,... | --compare=all [--only=characters,weapons,artifacts]
    重新產生指定項目，與資料庫現有內容逐欄比對（不寫入），用來驗證轉換規則
    all 比對資料庫中所有項目，只列出有差異的；產生失敗的項目列在最後

下載圖片
  --download-images [--only=characters,weapons,artifacts,materials] [--slugs=a,b]
    檢查既有項目的圖片，R2 還沒有的從 lunaris 下載到 .cache/<R2 的路徑>.webp，資料夾與 R2 相同可直接上傳
    （characters 包含頭像、立繪、衣裝與技能圖示；指定 --slugs 時不檢查素材）

共用參數
  --confirm=<endpoint>  必須等於 DATABASE_URL 主機名稱的第一段（例如 ep-muddy-union-b31yy74g），避免寫錯分支
  --dry-run             完整跑完寫入後 ROLLBACK，資料庫不會變動
  --refresh             重新抓取 Yatta，不用 node_modules/.cache/genshin-import/ 的快取（檢查新內容時使用）
  --help, -h            顯示這份說明

注意
  - 所有資料先用 zod 驗證，任何一筆不合格就停下；寫入在單一交易內，任一步失敗整個回滾
  - 來自 genshin-db 的內容（技能、衣裝等），要先 pnpm add -D genshin-db@latest 才會有新資料
  - 戰技、爆發描述最後的 <em>「…」</em> 引言：Yatta 沒有時（伊法之後的角色）會自動從 HoYoWiki 補上，
    wiki 也沒有的要手動補
  - glossary 的 linkTo* 別名：匯入與 --sync-abilities 會自動補上能唯一對應的，列為「不處理」的才要手動補`;

/**
 * 圖片檔名中的遊戲內部名稱 → R2 上使用的名稱
 * （UI_AvatarIcon_Qin → UI_AvatarIcon_Jean；UI_Costume_QinCostumeSea → UI_Costume_JeanCostumeSea）
 */
const R2_NAME_KEYS: Record<string, string> = {
  Qin: "Jean",
  Ambor: "Amber",
  Noel: "Noelle",
  Feiyan: "Yanfei",
  Tohma: "Thoma",
  Shougun: "Shogun",
  Heizo: "Heizou",
  Momoka: "Kirara",
  Baizhuer: "Baizhu",
  Alhatham: "Alhaitham",
  Yae: "YaeMiko",
  Linette: "Lynette",
  Liney: "Lyney",
  Liuyun: "Xianyun",
  Olorun: "Ororon",
  SkirkNew: "Skirk",
  MarionetteNew: "Sandrone",
  MannequinBoy: "Manekin",
  MannequinGirl: "Manekina",
  Aether: "PlayerBoy", // 旅行者的立繪
  Lumine: "PlayerGirl",
};

/** 轉成 R2 上的圖片檔名 */
function r2FileName(name: string) {
  return name
    .replace("UI_AvaratIcon_", "UI_AvatarIcon_") // 舊資料的拼字錯誤
    .replace(
      /^(UI_AvatarIcon_|UI_Gacha_AvatarImg_|UI_Costume_)([A-Z][A-Za-z]*?)(?=Costume|$)/,
      (_, prefix: string, key: string) => prefix + (R2_NAME_KEYS[key] ?? key),
    );
}
const r2Images = (images: CharacterImages): CharacterImages => ({
  icon: r2FileName(images.icon),
  gacha: r2FileName(images.gacha),
});

/**
 * 精煉的覆寫：R1 的特效說明與 R2～R5 不同時，genshin-db 與 Yatta 的 r1.values 都會錯位
 * - r1：R1 的參數，對應說明的 {0}、{1}…
 * - r1Missing：R2～R5 才有的文字；說明中的這段換成新的佔位符，R1 為空字串
 * （星鋒劍的 R1 沒有「每與一種元素共鳴過…」，r1.values 為 ["16%","8","3","5"]，對應說明的 {0}、{1} 應為 16% 與 3）
 */
const REFINEMENT_OVERRIDES: Record<number, { r1: string[]; r1Missing?: string }> = {
  // 星鋒劍
  11521: {
    r1: ["16%", "3"],
    r1Missing: "每與一種元素共鳴過，旅行者的暴擊傷害就會提升6%。此外，旅行者的攻擊",
  },
};

/** 一般情況下拿不到的特殊道具，不匯入（「一心傳」名刀：一心傳任務中途的半成品） */
const EXCLUDED_WEAPON_IDS = new Set([11419, 11420, 11421]);

// ---------- 驗證（與 server/db/schema/types.ts 的型別對齊） ----------

const nonEmpty = z.string().min(1);
const textMap = z.record(z.string(), z.string());

const CharacterStatsSchema = z.strictObject({
  base: z.strictObject({
    hp: z.number(),
    attack: z.number(),
    defense: z.number(),
    ascensionStat: z.number(),
    extra: z.record(z.string().startsWith("FIGHT_PROP_"), z.number()).optional(),
  }),
  curves: z.strictObject({ hp: nonEmpty, attack: nonEmpty, defense: nonEmpty }),
  ascensionStat: nonEmpty,
  promotions: z
    .array(
      z.strictObject({
        maxLevel: z.number().int(),
        hp: z.number(),
        attack: z.number(),
        defense: z.number(),
        ascensionStat: z.number(),
      }),
    )
    .length(7),
}) satisfies z.ZodType<CharacterStats>;

const ImagesSchema = z.strictObject({
  icon: nonEmpty,
  gacha: nonEmpty,
}) satisfies z.ZodType<CharacterImages>;

const GlossarySchema = z.strictObject({
  linkToEffect: textMap,
  linkToTalent: textMap,
  linkToPassive: textMap,
  linkToConstellation: textMap,
  relatedEffects: textMap,
}) satisfies z.ZodType<Glossary>;

const VoiceActorsSchema = z.strictObject({
  en: z.string(),
  ja: z.string(),
  ko: z.string(),
  zhCN: z.string(),
}) satisfies z.ZodType<VoiceActors>;

const StorySchema = z.strictObject({
  title: nonEmpty,
  text: z.string(),
  title2: nonEmpty.optional(),
  text2: nonEmpty.optional(),
  tips: nonEmpty.optional(),
}) satisfies z.ZodType<Story>;

const VoicelineSchema = z.strictObject({
  type: z.enum(["friendship", "battle"]),
  title: nonEmpty,
  text: nonEmpty,
  tips: nonEmpty.optional(),
  tasks: z
    .array(
      z.strictObject({
        type: z.enum(["finishMainQuest", "finishSubQuest"]),
        questList: z
          .array(
            z.strictObject({
              id: z.number().int(),
              chapterId: z.number().int().optional(),
              chapterTitle: z.string().optional(),
              questTitle: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1)
    .optional(),
}) satisfies z.ZodType<Voiceline>;

const AbilityParametersSchema = z.record(
  z.string(),
  z.array(z.number()).length(15),
) satisfies z.ZodType<AbilityParameters>;

const WeaponStatsSchema = z.strictObject({
  base: z.strictObject({ attack: z.number(), substat: z.number().optional() }),
  curves: z.strictObject({ attack: nonEmpty, substat: nonEmpty.optional() }),
  promotions: z.array(z.strictObject({ maxLevel: z.number().int(), attack: z.number() })).min(5),
}) satisfies z.ZodType<WeaponStats>;

// 參數可以是空字串：REFINEMENT_OVERRIDES 的 r1Missing 在 R1 為空
const RefinementParamsSchema = z.array(
  z.array(z.string()).length(5),
) satisfies z.ZodType<RefinementParams>;

// genshin-db 的素材另外帶有 name，只取 id 與 count
const CostSchema = z.array(z.object({ id: z.number().int(), count: z.number().int().positive() }));

// ---------- 轉換用的小工具 ----------

/** 項目無法產生時丟出，主流程會略過並列出原因（與資料錯誤分開） */
class SkipError extends Error {}

/** Yatta 的換行是字面上的 \n；{LINK#N11310001} 只保留 {LINK}；<i> 改成 <em> */
const yattaText = (s: string | null | undefined) =>
  s
    ? s
        // 時區變數（例如愛可菲「每週一凌晨4點重置。{TIMEZONE}」）在遊戲中會換成伺服器時區，網站上不顯示；
        // 開頭的 # 是標記文字含有變數用的，一起去掉（其他含變數的文字保留 #，由前端 parser 去掉）
        .replace(/^#([^]*)\{TIMEZONE\}/, "$1")
        .replace(/\\n/g, "\n")
        .replace(/LINK#[A-Z]+\d+/g, "LINK")
        // 沒有內容的連結（官方文字的錯誤，例如瓦列里普攻結尾的 {LINK#N11370002}{/LINK}）整個移除
        .replace(/\{LINK\}\s*\{\/LINK\}/g, "")
        .replace(/<(\/?)i>/g, "<$1em>")
    : null;

/** 必填的文字欄位，空白時丟出含欄位名稱的錯誤 */
const required = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value) throw new Error(`${label} 是空的`);
  return value;
};

/** 空字串一律轉成 NULL */
const emptyToNull = (s: string | null | undefined) => (s ? s : null);

/** 依對照表轉換代碼，遇到不認得的值立刻停下 */
function mapCode<T extends string>(map: Record<string, T>, code: string, label: string): T {
  const value = map[code];
  if (!value) throw new Error(`未知的${label}：${code}`);
  return value;
}

const ELEMENT_MAP = {
  ELEMENT_PYRO: "pyro",
  ELEMENT_HYDRO: "hydro",
  ELEMENT_ANEMO: "anemo",
  ELEMENT_ELECTRO: "electro",
  ELEMENT_DENDRO: "dendro",
  ELEMENT_CRYO: "cryo",
  ELEMENT_GEO: "geo",
} as const;

const WEAPON_TYPE_MAP = {
  WEAPON_SWORD_ONE_HAND: "sword",
  WEAPON_CLAYMORE: "claymore",
  WEAPON_POLE: "polearm",
  WEAPON_BOW: "bow",
  WEAPON_CATALYST: "catalyst",
} as const;

const BODY_TYPE_MAP = {
  BODY_BOY: "boy",
  BODY_GIRL: "girl",
  BODY_LADY: "lady",
  BODY_MALE: "male",
  BODY_LOLI: "loli",
} as const;

type Element = (typeof t.element.enumValues)[number];

/** 旅行者：aether-hydro → { variant: "aether", element: "hydro" } */
function travelerOf(slug: string) {
  const m = /^(aether|lumine)-([a-z]+)$/.exec(slug);
  return m ? { variant: m[1]!, element: m[2] as Element } : null;
}

const BATTLE_START = "元素戰技·其一";

/**
 * 角色加強（魔導·秘儀）的實裝版本：Yatta 以 buff 標記加強角色，加強後的天賦與命之座說明在 descriptionBuff，
 * 但兩邊都沒有實裝版本，在此手動對照（與 Yatta 的 buff 不一致時會停下）
 */
const ENHANCED_IN: Record<number, string> = {
  10000020: "6.2", // 雷澤
  10000022: "6.2", // 溫迪
  10000029: "6.2", // 可莉
  10000031: "6.2", // 菲謝爾
  10000038: "6.2", // 阿貝多
  10000041: "6.2", // 莫娜
  10000043: "6.2", // 砂糖
  10000024: "6.7", // 北斗
  10000035: "6.7", // 七七
  10000039: "6.7", // 迪奧娜
  10000058: "6.7", // 八重神子
  10000071: "6.7", // 賽諾
  10000086: "6.7", // 萊歐斯利
  10000109: "6.7", // 夢見月瑞希
};

/**
 * 加強前的內容：資料來源只剩加強後的版本、加強前的內容只存在既有資料庫時，在此保存（鍵為「角色 ID:技能種類:排序」）；
 * 該技能的原本版本改用這裡的內容，加強版改用資料來源的內容（有 descriptionBuff 時用 descriptionBuff）
 */
const BEFORE_ENHANCEMENT: Record<
  string,
  { description: string; labels?: string[]; parameters?: AbilityParameters }
> = {
  // 夢見月瑞希 戰技 秋沙歌枕巡禮
  "10000109:elemental_skill:0": {
    description:
      "編織出「美夢」的回憶，進入懸浮於地面之上的<color=#FFD780FF>夢浮</color>狀態，並對周圍的敵人造成一次<color=#80FFD7FF>風元素範圍傷害</color>。\n\n<color=#FFD780FF>夢浮</color>\n·處於夢浮狀態下時，夢見月瑞希將持續向前浮行，並將週期性對附近的敵人造成<color=#80FFD7FF>風元素範圍傷害</color>。\n·期間，夢見月瑞希可以控制浮行的方向，並提升元素爆發<color=#FFD780FF>安樂秘湯療法</color>中的<color=#FFD780FF>夢見風名物點心</color>的拾取距離。\n·基於夢見月瑞希的元素精通，提升隊伍中附近的角色觸發的擴散反應造成的傷害。\n·夢見月瑞希退場時，或是再次施放技能時，夢浮狀態將會結束。\n\n<em>「宵宵夕月夢相逢，心曲繾綣繞意中。」</em>",
    labels: [
      "技能傷害|{param4:F1P}",
      "持續攻擊傷害|{param1:F1P}",
      "夢浮持續時間|{param5:F1}秒",
      "每點精通提升擴散傷害百分比|{param2:F2P}",
      "冷卻時間|{param3:F1}秒",
    ],
    parameters: {
      param1: [
        0.44912, 0.482804, 0.516488, 0.5614, 0.595084, 0.628768, 0.67368, 0.718592, 0.763504,
        0.808416, 0.853328, 0.89824, 0.95438, 1.01052, 1.06666,
      ],
      param2: [
        0.0018, 0.0021, 0.0024, 0.0027, 0.003, 0.0033, 0.0036, 0.0039, 0.0042, 0.0045, 0.0048,
        0.0051, 0.0054, 0.0057, 0.006,
      ],
      param3: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
      param4: [
        0.57744, 0.620748, 0.664056, 0.7218, 0.765108, 0.808416, 0.86616, 0.923904, 0.981648,
        1.039392, 1.097136, 1.15488, 1.22706, 1.29924, 1.37142,
      ],
      param5: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    },
  },
  // 夢見月瑞希 被動 名月浮聲
  "10000109:passive:1": {
    description:
      "夢見月瑞希在夢浮狀態下觸發擴散反應時，夢浮狀態的持續時間延長2.5秒。該效果每0.3秒至多觸發1次，在一次夢浮狀態期間至多觸發2次。",
  },
  // 夢見月瑞希 命座 宿霧若水遙
  "10000109:constellation:1": {
    description:
      "夢見月瑞希處於夢浮狀態下時，每3.5秒將對附近的敵人施加持續3秒的「二十三夜待」效果。處於二十三夜待狀態下的敵人受到風元素傷害而觸發擴散反應時，將移除該效果，使此次擴散反應對該敵人造成的傷害提升，提升值相當於夢見月瑞希元素精通的1100%。",
  },
  // 夢見月瑞希 命座 慕念縈心間
  "10000109:constellation:6": {
    description:
      "夢見月瑞希處於夢浮狀態下時，隊伍中附近的角色觸發的擴散反應造成的傷害能夠造成暴擊，暴擊率固定為30%，暴擊傷害固定為100%。",
  },
};

/**
 * genshin-db 與 Yatta 的 labels 已是加強後的版本，加強前後各自依索引挑出（鍵為「角色 ID:技能種類」）；
 * labels 數量與 length 不同時會停下，避免資料來源更新後對錯位置
 */
const ENHANCED_LABELS: Record<string, { length: number; before: number[]; after: number[] }> = {
  // 溫迪普攻：加強後多了「颶風箭傷害」
  "10000022:normal_attack": {
    length: 11,
    before: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    after: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  // 七七戰技：加強後的冷卻時間（param11）取代原本 param7 的位置，再接上協同攻擊傷害與協同攻擊冷卻時間
  "10000035:elemental_skill": {
    length: 9,
    before: [0, 1, 2, 3, 4, 5],
    after: [0, 1, 2, 3, 4, 8, 6, 7],
  },
};

/**
 * 上限突破（90→95、95→100 級）的素材：所有角色（含奇偶）共用，只需要無主的命星；
 * genshin-db 與 Yatta 的突破資料只到 90 級，在此補上第 7、8 階
 */
const LEVEL_BREAK_COSTS = [
  { kind: "ascension" as const, stage: 7, materialId: 104300, count: 1 },
  { kind: "ascension" as const, stage: 8, materialId: 104300, count: 2 },
];

/**
 * 語音解鎖條件裡值為 null 的欄位（例如 questTitle）直接拿掉；
 * 缺少翻譯時 Yatta 會把標題回傳成文本雜湊（數字，例如 2971500783），同樣拿掉
 */
const tasksWithoutNull = (task: { type: string; questList: Record<string, unknown>[] }) => ({
  type: task.type,
  questList: task.questList.map((q) =>
    Object.fromEntries(
      Object.entries(q).filter(
        ([k, v]) => v != null && !(k.endsWith("Title") && typeof v !== "string"),
      ),
    ),
  ),
});

/** 突破素材 ascend1～ascend6 → [stage, items] */
const ascensionStagesOf = (costs: Record<string, unknown>) =>
  Object.entries(costs).map(([key, items]) => {
    const stage = Number(key.replace("ascend", ""));
    if (!Number.isInteger(stage) || stage < 1 || stage > 6)
      throw new Error(`未知的突破階段：${key}`);
    // 星鋒劍的突破不需要素材，genshin-db 列為「摩拉 0」，拿掉數量為 0 的項目
    return [
      stage,
      CostSchema.parse((items as { count: number }[]).filter((m) => m.count > 0)),
    ] as const;
  });

const versionRow = (version: string) => {
  const m = /^(\d+)\.(\d+)$/.exec(version);
  if (!m) throw new Error(`版本格式不正確：${version}`);
  return { version, major: Number(m[1]), minor: Number(m[2]) };
};

// ---------- 資料來源 ----------

/** --refresh：忽略快取，這次執行中每個 endpoint 重新抓一次 */
let refreshYatta = false;
const refreshed = new Set<string>();

/** Yatta API，回應快取到本機；請求之間間隔 1 秒，避免造成對方負擔 */
async function yatta(endpoint: string, lang = "cht"): Promise<any> {
  const key = lang === "cht" ? endpoint : `${lang}/${endpoint}`;
  const file = path.join(CACHE_DIR, `${key.replace(/\//g, "_")}.json`);
  if (!fs.existsSync(file) || (refreshYatta && !refreshed.has(key))) {
    refreshed.add(key);
    const res = await fetch(`https://gi.yatta.moe/api/v2/${lang}/${endpoint}`);
    if (!res.ok) throw new Error(`Yatta ${key}：HTTP ${res.status}`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, await res.text());
    await new Promise((r) => setTimeout(r, 1000));
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).data;
}

/** 英文名稱 → slug（Hu Tao → hu-tao；King's Squire → kings-squire），與既有資料的 slug 規則一致 */
const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’"“”]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** genshin-db 收錄的所有角色、武器、聖遺物（slug 與遊戲 ID），依 ID 排序 */
function gdbTargets() {
  const english = (query: (q: string, o: object) => unknown) =>
    (
      query("names", {
        resultLanguage: gdb.Language.English,
        matchCategories: true,
        verboseCategories: true,
      }) as {
        id: number;
        name: string;
      }[]
    ).sort((a, b) => a.id - b.id);

  // 旅行者依 genshin-db 中有天賦的元素展開（aether-anemo、lumine-anemo…）
  const travelerElements = t.element.enumValues.filter((e) => gdb.talents(`traveler${e}`));
  const characters = english(gdb.characters).flatMap((c) => {
    const variant = Object.entries(TRAVELER_IDS).find(([, id]) => id === c.id)?.[0];
    return variant
      ? travelerElements.map((e) => ({ slug: `${variant}-${e}`, id: c.id }))
      : [{ slug: slugify(c.name), id: c.id }];
  });
  const weapons = english(gdb.weapons)
    .filter((w) => !EXCLUDED_WEAPON_IDS.has(w.id))
    .map((w) => ({ slug: slugify(w.name), id: w.id }));
  const artifacts = english(gdb.artifacts).map((a) => ({ slug: slugify(a.name), id: a.id }));

  for (const [label, list] of Object.entries({ characters, weapons, artifacts })) {
    const dup = list.filter((x, i) => list.findIndex((y) => y.slug === x.slug) !== i);
    if (dup.length)
      throw new Error(
        `${label} 的 slug 重複：${dup.map((x) => `${x.slug}（${x.id}）`).join("、")}`,
      );
  }
  return { characters, weapons, artifacts };
}

/** genshin-db 的全部資料，依遊戲 ID 建立索引 */
function gdbIndex<T extends { id: number }>(query: (q: string, o: object) => unknown) {
  const all = query("names", {
    ...GDB_OPTIONS,
    matchCategories: true,
    verboseCategories: true,
  }) as T[];
  return new Map(all.map((x) => [x.id, x]));
}

const HOYOWIKI_HEADERS = { "x-rpc-language": "zh-tw", Referer: "https://wiki.hoyolab.com/" };

/** HoYoWiki API（快取方式與 yatta 相同，--refresh 時重新抓取） */
async function hoyowiki(key: string, load: () => Promise<Response>): Promise<any> {
  const file = path.join(CACHE_DIR, `hoyowiki_${key}.json`);
  if (!fs.existsSync(file) || (refreshYatta && !refreshed.has(`hoyowiki/${key}`))) {
    refreshed.add(`hoyowiki/${key}`);
    const res = await load();
    if (!res.ok) throw new Error(`HoYoWiki ${key}：HTTP ${res.status}`);
    const json = await res.json();
    if (json.retcode !== 0) throw new Error(`HoYoWiki ${key}：${json.message}`);
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(json));
    await new Promise((r) => setTimeout(r, 500));
  }
  return JSON.parse(fs.readFileSync(file, "utf8")).data;
}

/** HoYoWiki 角色名稱 → entry_page_id（角色列表 menu_id 2，每頁 30 筆） */
let hoyowikiEntries: Promise<Map<string, string>> | undefined;
function hoyowikiEntryIds() {
  return (hoyowikiEntries ??= (async () => {
    const ids = new Map<string, string>();
    for (let page = 1; ; page++) {
      const data = await hoyowiki(`list_${page}`, () =>
        fetch("https://sg-act-public-api.hoyolab.com/hoyowiki/genshin/wapi/get_entry_page_list", {
          method: "POST",
          headers: { ...HOYOWIKI_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({
            filters: [],
            menu_id: "2",
            page_num: page,
            page_size: 30,
            use_es: true,
          }),
        }),
      );
      for (const e of data.list) ids.set(e.name, e.entry_page_id);
      if (page * 30 >= Number(data.total) || !data.list.length) break;
    }
    return ids;
  })());
}

/**
 * HoYoWiki 技能描述結尾的引言：結尾連續、整行包在 <i> 或 <em> 裡的行
 * （舊角色是 <i>…</i><br/>，新角色是 <p><em>…</em></p>），拿掉標籤後以換行連接；
 * 性別用字「妳/你」改成與 Yatta 相同的 {F#妳}{M#你}。已用 191 個既有引言驗證
 */
function hoyowikiQuote(desc: string) {
  const lines = desc
    .replace(/<br\s*\/?>|<\/p>/g, "\n")
    .replace(/<p>/g, "")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim());
  while (lines.length && !lines.at(-1)) lines.pop();
  const quote: string[] = [];
  while (lines.length && /^<(i|em)>[\s\S]*<\/\1>$/.test(lines.at(-1)!))
    quote.unshift(lines.pop()!.replace(/<[^>]*>/g, ""));
  return quote.length ? quote.join("\n").replace(/妳\/你/g, "{F#妳}{M#你}") : null;
}

/** 角色在 HoYoWiki 上各技能的引言（技能名稱 → 引言）；wiki 上找不到角色時為空 */
async function hoyowikiQuotes(characterName: string) {
  const id = (await hoyowikiEntryIds()).get(characterName);
  const quotes = new Map<string, string>();
  if (!id) return quotes;
  const data = await hoyowiki(`entry_${id}`, () =>
    fetch(
      `https://sg-act-public-api-static.hoyolab.com/hoyowiki/genshin/wapi/entry_page?entry_page_id=${id}`,
      { headers: HOYOWIKI_HEADERS },
    ),
  );
  for (const m of data.page.modules)
    for (const c of m.components)
      if (c.component_id === "talent")
        for (const t of JSON.parse(c.data).list) {
          const q = hoyowikiQuote(t.desc);
          if (q) quotes.set(t.title, q);
        }
  return quotes;
}

// ---------- 角色 ----------

/** 故事與語音（Yatta avatarFetter）；旅行者的各元素共用同一份 */
function loreOf(slug: string, fetter: any, isTraveler: boolean) {
  // 「元素戰技·其一」之前是友好度語音；之後是戰鬥語音，但旅行者排在後面的地區話題（關於…）算友好度
  const quotes = Object.values(fetter.quotes) as any[];
  const battleStart = quotes.findIndex((q) => q.title === BATTLE_START);
  // 奇偶沒有故事與語音
  if (quotes.length && battleStart < 0) throw new Error(`${slug} 找不到「${BATTLE_START}」`);
  return {
    locale: LOCALE,
    stories: (Object.values(fetter.story) as any[]).map((s) =>
      StorySchema.parse({
        title: s.title,
        text: yattaText(s.text) ?? "",
        ...(s.title2 ? { title2: s.title2 } : {}),
        ...(s.text2 ? { text2: yattaText(s.text2) } : {}),
        ...(s.tips ? { tips: yattaText(s.tips) } : {}),
      }),
    ),
    voicelines: quotes.map((q, i) =>
      VoicelineSchema.parse({
        type:
          i < battleStart || (isTraveler && q.title.startsWith("關於")) ? "friendship" : "battle",
        title: q.title,
        text: yattaText(q.text),
        ...(q.tips ? { tips: q.tips } : {}),
        ...(q.tasks?.length ? { tasks: q.tasks.map(tasksWithoutNull) } : {}),
      }),
    ),
  };
}

/** 空、熒的遊戲 ID */
const TRAVELER_IDS = { aether: 10000005, lumine: 10000007 } as const;

/** 與鍵的順序無關的 JSON（jsonb 會重新排列物件的鍵） */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

/**
 * 從 Yatta 天賦的 promote（各等級的說明與參數）產生 genshin-db 格式的 labels 與 parameters，
 * 只用於 genshin-db 沒有天賦的角色（奇偶）；已用 72 位角色的 216 個天賦驗證與 genshin-db 完全一致
 */
function yattaAttributes(yt: any) {
  const levels = Object.values(yt.promote ?? {}) as { description: string[]; params: number[] }[];
  if (levels.length !== 15) throw new Error(`「${yt.name}」的天賦等級有 ${levels.length} 級`);
  // genshin-db 只保留任一等級不為 0 的參數
  const used = levels[0]!.params.flatMap((_, i) =>
    levels.some((l) => l.params[i] !== 0) ? [i] : [],
  );
  return {
    labels: levels[0]!.description.filter(Boolean),
    parameters: Object.fromEntries(
      used.map((i) => [`param${i + 1}`, levels.map((l) => l.params[i]!)]),
    ),
  };
}

const LINK_ALIAS_KEYS = [
  "linkToEffect",
  "linkToTalent",
  "linkToPassive",
  "linkToConstellation",
] as const;
type LinkAliasKey = (typeof LINK_ALIAS_KEYS)[number];
const LINK_ALIAS_KEY_OF: Record<string, LinkAliasKey> = {
  normal_attack: "linkToTalent",
  elemental_skill: "linkToTalent",
  elemental_burst: "linkToTalent",
  alternate_sprint: "linkToTalent",
  passive: "linkToPassive",
  constellation: "linkToConstellation",
};
/** 與 app/utils/parser.ts 的 stripKeyword 相同 */
const stripKeyword = (s: string) => s.replace(/[「」『』《》〈〉]/g, "").trim();

/**
 * 找出 {LINK} 關鍵字中，前端（app/utils/parser.ts 的 resolveLink）對不到的，補上 glossary 的 linkTo* 別名：
 * 依序在 relatedEffects 的名稱（包含關鍵字者，例如 強化效果 → 額外強化效果）、relatedEffects 的說明、
 * 天賦、固有天賦、命之座的描述中尋找提到關鍵字的項目，只有一個符合時才加入；
 * 多個符合時，若只有一個的名稱包含關鍵字（夜魂加持 → 夜魂加持·伊法）就選它，其餘只列出不處理。
 * 既有的別名不會被修改
 */
function inferLinkAliases(
  glossary: Glossary,
  abilities: { kind: string; i18n: { name: string; description: string } }[],
) {
  // 搜尋用的純文字：去掉 {LINK}…{/LINK}（避免對到連結本身）與標籤
  const plain = (s: string) => s.replace(/\{LINK\}.*?\{\/LINK\}/g, "").replace(/<[^>]*>/g, "");
  const effects = glossary.relatedEffects ?? {};
  const names = new Set(abilities.map((a) => a.i18n.name));
  const keywords = new Set(
    [...abilities.map((a) => a.i18n.description), ...Object.values(effects)].flatMap((text) =>
      [...text.matchAll(/\{LINK\}(.*?)\{\/LINK\}/g)].map((m) =>
        stripKeyword(m[1]!.replace(/<[^>]*>/g, "")),
      ),
    ),
  );
  const added: { key: LinkAliasKey; keyword: string; target: string }[] = [];
  const skipped: string[] = [];
  for (const kw of keywords) {
    if (!kw || names.has(kw) || kw in effects || LINK_ALIAS_KEYS.some((k) => glossary[k]?.[kw]))
      continue;
    const keyHits = Object.keys(effects).filter((name) => name.includes(kw));
    let hits = keyHits.length
      ? keyHits
      : Object.entries(effects)
          .filter(([, text]) => plain(text).includes(kw))
          .map(([name]) => name);
    let key: LinkAliasKey | undefined = hits.length ? "linkToEffect" : undefined;
    for (const k of ["linkToTalent", "linkToPassive", "linkToConstellation"] as const) {
      if (key) break;
      hits = [
        ...new Set(
          abilities
            .filter(
              (a) => LINK_ALIAS_KEY_OF[a.kind] === k && plain(a.i18n.description).includes(kw),
            )
            .map((a) => a.i18n.name),
        ),
      ];
      if (hits.length) key = k;
    }
    const named = hits.filter((name) => name.includes(kw));
    if (hits.length > 1 && named.length === 1) hits = named;
    if (key && hits.length === 1) added.push({ key, keyword: kw, target: hits[0]! });
    else skipped.push(key ? `「${kw}」有多個符合：${hits.join("、")}` : `「${kw}」找不到對應`);
  }
  const merged = structuredClone(glossary);
  for (const a of added) (merged[a.key] ??= {})[a.keyword] = a.target;
  return { glossary: merged, added, skipped };
}

function buildCharacterFactory() {
  const gdbCharacters = gdbIndex<any>(gdb.characters);
  // 衣裝以 characterId 對應角色（旅行者的空、熒各一組）
  const gdbOutfits = Map.groupBy(
    gdb.outfits("names", {
      ...GDB_OPTIONS,
      matchCategories: true,
      verboseCategories: true,
    }) as any[],
    (o) => o.characterId as number,
  );

  return async function buildCharacter(slug: string, gameId: number) {
    const c = gdbCharacters.get(gameId);
    if (!c) throw new SkipError(`genshin-db 沒有 ID ${gameId}`);
    const traveler = travelerOf(slug);
    // 奇偶（manekin、manekina）是千星奇域的角色：沒有元素與命之座，以千星奇域等級升級（不需要突破與天賦素材），
    // genshin-db 也沒有牠們的天賦，天賦倍率改由 Yatta 產生
    const isManekin = !traveler && c.elementType === "ELEMENT_NONE";
    const element =
      traveler?.element ?? (isManekin ? null : mapCode(ELEMENT_MAP, c.elementType, "元素"));

    // 天賦的 ID 是技能組 ID，以名稱查詢；旅行者依元素查詢（travelerhydro）
    const talents: any = isManekin
      ? null
      : traveler
        ? gdb.talents(`traveler${traveler.element}`, GDB_OPTIONS)
        : gdb.talents(c.name, {
            ...GDB_OPTIONS,
            queryLanguages: [gdb.Language.ChineseTraditional],
          });
    if (!isManekin && !talents) throw new Error(`genshin-db 找不到 ${slug} 的天賦`);
    const y = await yatta(`avatar/${traveler ? `${gameId}-${traveler.element}` : gameId}`);
    const fetter = await yatta(`avatarFetter/${gameId}`);

    // Yatta 天賦：type 0 = 普攻、戰技、替代衝刺（依序），1 = 爆發，2 = 被動
    // 名稱空白的是遊戲內部用的佔位資料（雷電將軍的被動、薇斯納的技能），先排除
    const yTalents = (Object.values(y.talent) as any[]).filter((x) => x.name);
    const [normalAttack, skill, sprint] = yTalents.filter((x) => x.type === 0);
    const burst = yTalents.find((x) => x.type === 1);
    // 被動依「突破天賦 → 額外天賦 → 固有天賦」排列。資料來源沒有類型欄位，依 Yatta skillId 末兩碼判斷：
    // 21、22 為突破天賦；24、51 為額外天賦（魔女的前夜禮、迪奧娜的珍選秘藏、旅行者的異邦的層冰等）；其餘為固有天賦
    const passiveGroup = (p: any) => {
      const suffix = (p.skillId as number) % 100;
      return suffix === 21 || suffix === 22 ? 0 : suffix === 24 || suffix === 51 ? 1 : 2;
    };
    const passives = yTalents
      .filter((x) => x.type === 2)
      .map((p, i) => ({ p, i }))
      .sort((a, b) => passiveGroup(a.p) - passiveGroup(b.p) || a.i - b.i)
      .map(({ p }) => p);

    const enhancedIn = ENHANCED_IN[gameId] ?? null;
    if (!!y.buff !== !!enhancedIn)
      throw new Error(`${slug} 的加強標記與 ENHANCED_IN 不一致（Yatta buff：${!!y.buff}）`);
    /**
     * 有 descriptionBuff（或 BEFORE_ENHANCEMENT 有加強前內容）時，另外產生一筆加強後的技能（kind 與 sortOrder 相同）；
     * 加強時新增的被動（魔女的前夜禮等）在遊戲中不論是否解鎖加強都會顯示，視為一般被動
     */
    const withEnhanced = <
      T extends {
        kind: string;
        sortOrder: number;
        parameters: AbilityParameters | null;
        i18n: { description: string; labels: string[] | null };
      },
    >(
      generated: T,
      src: any,
      enhancedLabels = generated.i18n.labels,
    ) => {
      const before = BEFORE_ENHANCEMENT[`${gameId}:${generated.kind}:${generated.sortOrder}`];
      if (!src.descriptionBuff && !before) return [generated];
      if (!enhancedIn) throw new Error(`${slug} 的「${src.name}」有加強內容，但不在 ENHANCED_IN`);
      const enhanced = {
        ...generated,
        isEnhanced: true,
        i18n: {
          ...generated.i18n,
          description: src.descriptionBuff
            ? required(yattaText(src.descriptionBuff), "descriptionBuff")
            : generated.i18n.description,
          labels: enhancedLabels,
        },
      };
      const base = before
        ? {
            ...generated,
            parameters: before.parameters ?? generated.parameters,
            i18n: {
              ...generated.i18n,
              description: before.description,
              labels: before.labels ?? generated.i18n.labels,
            },
          }
        : generated;
      return [base, enhanced];
    };

    const combat = (
      yt: any,
      gt: any,
      kind: "normal_attack" | "elemental_skill" | "elemental_burst" | "alternate_sprint",
    ) => {
      if (!yt || (!gt && !isManekin)) throw new Error(`${slug} 缺少 ${kind}`);
      gt ??= { name: yt.name, attributes: yattaAttributes(yt) };
      if (yt.name !== gt.name)
        throw new Error(
          `${slug} 的 ${kind} 名稱不一致：Yatta「${yt.name}」／genshin-db「${gt.name}」`,
        );
      const labels = z.array(nonEmpty).parse(gt.attributes.labels) as string[];
      const split = ENHANCED_LABELS[`${gameId}:${kind}`];
      if (split && (labels.length !== split.length || !yt.descriptionBuff))
        throw new Error(
          `${slug} 的 ${kind} 與 ENHANCED_LABELS 不符（labels 有 ${labels.length} 個）`,
        );
      const pick = (indexes?: number[]) => (indexes ? indexes.map((i) => labels[i]!) : labels);
      const base = {
        kind,
        sortOrder: 0,
        isEnhanced: false,
        icon: nonEmpty.parse(yt.icon),
        // 替代衝刺在 genshin-db 只有 1 級，重複補滿 15 級，與其他技能一致
        parameters: AbilityParametersSchema.parse(
          Object.fromEntries(
            Object.entries(gt.attributes.parameters as Record<string, number[]>).map(([k, v]) => [
              k,
              v.length === 1 ? Array(15).fill(v[0]) : v,
            ]),
          ),
        ),
        i18n: {
          locale: LOCALE,
          name: yt.name as string,
          description: required(yattaText(yt.description), "description"),
          labels: pick(split?.before) as string[] | null,
        },
      };
      return withEnhanced(base, yt, pick(split?.after));
    };
    const plain = (kind: "passive" | "constellation") => (a: any, i: number) =>
      withEnhanced(
        {
          kind,
          sortOrder: i + 1,
          isEnhanced: false,
          icon: nonEmpty.parse(a.icon) as string | null,
          parameters: null as AbilityParameters | null,
          i18n: {
            locale: LOCALE,
            name: a.name as string,
            description: required(yattaText(a.description), "description"),
            labels: null as string[] | null,
          },
        },
        a,
        null,
      );

    const constellations = Object.values(y.constellation ?? {}) as any[];
    if (constellations.length !== (isManekin ? 0 : 6))
      throw new Error(`${slug} 的命之座有 ${constellations.length} 個`);
    const abilities = [
      ...combat(normalAttack, talents?.combat1, "normal_attack"),
      ...combat(skill, talents?.combat2, "elemental_skill"),
      ...combat(burst, talents?.combat3, "elemental_burst"),
      // 歐洛倫的第三個戰鬥天賦是特殊跳躍（genshin-db 的 combatju），與資料庫既有資料一致不存
      ...(sprint && talents?.combatju?.name !== sprint.name
        ? combat(sprint, talents?.combatsp, "alternate_sprint")
        : []),
      ...passives.flatMap(plain("passive")),
      ...constellations.flatMap(plain("constellation")),
    ];
    // Yatta 從伊法開始沒有戰技、爆發描述最後的 <em>「…」</em> 引言，改從 HoYoWiki 補上（依技能名稱對應）
    const withoutQuote = abilities.filter(
      (a) =>
        (a.kind === "elemental_skill" || a.kind === "elemental_burst") &&
        !a.i18n.description.includes("<em>"),
    );
    if (withoutQuote.length && !traveler && !isManekin) {
      const quotes = await hoyowikiQuotes(c.name);
      for (const a of withoutQuote) {
        const quote = quotes.get(a.i18n.name);
        if (quote) a.i18n.description += `\n\n<em>${quote}</em>`;
      }
    }

    // 剛實裝的角色在 genshin-db 可能還沒有 images（米提亞、瓦列里）：頭像改用 Yatta 的 icon，
    // 再沒有就依戰技圖示的內部名稱推導（Skill_S_Mitya_01 → UI_AvatarIcon_Mitya）
    // 旅行者在 genshin-db 沒有立繪檔名，依頭像推導（UI_AvatarIcon_PlayerBoy → UI_Gacha_AvatarImg_PlayerBoy）
    // 奇偶男女共用同一張立繪
    const skillName = (skill?.icon as string | undefined)?.match(/^Skill_S_(\w+?)_\d+$/)?.[1];
    const icon: string | undefined =
      c.images?.filename_icon ?? y.icon ?? (skillName && `UI_AvatarIcon_${skillName}`);
    const rawImages = ImagesSchema.parse({
      icon,
      gacha: isManekin
        ? "UI_Gacha_AvatarImg_Mannequin"
        : (c.images?.filename_gachaSplash ??
          icon?.replace("UI_AvatarIcon_", "UI_Gacha_AvatarImg_")),
    });
    const images = r2Images(rawImages);

    const substat: string = c.substatType;
    const prop = (type: string) => (y.upgrade.prop as any[]).find((p) => p.propType === type);
    const base = (type: string) => {
      const p = prop(type);
      if (!p) throw new Error(`${slug} 缺少 ${type}`);
      return p;
    };
    const extraProps = Object.entries((y.upgrade.propOther ?? {}) as Record<string, number>).filter(
      ([type]) => type !== substat,
    );
    const row = {
      gameId,
      slug,
      element,
      weaponType: mapCode(WEAPON_TYPE_MAP, c.weaponType, "武器類型"),
      bodyType: mapCode(BODY_TYPE_MAP, c.bodyType, "體型"),
      rarity: c.rarity as number,
      association: required(c.associationType, "association"),
      birthMonth: (y.birthday?.[0] as number) || null, // 旅行者沒有生日
      birthDay: (y.birthday?.[1] as number) || null,
      stats: CharacterStatsSchema.parse({
        base: {
          hp: base("FIGHT_PROP_BASE_HP").initValue,
          attack: base("FIGHT_PROP_BASE_ATTACK").initValue,
          defense: base("FIGHT_PROP_BASE_DEFENSE").initValue,
          // 突破屬性的初始值：大多數角色是 0；有初始值的在 upgrade.propOther（例如菈烏瑪的元素精通 200）
          ascensionStat: prop(substat)?.initValue ?? y.upgrade.propOther?.[substat] ?? 0,
          // propOther 中突破屬性以外的基礎屬性（例如奈芙爾、米提亞的元素精通 100，突破屬性是暴擊傷害）；沒有時不填
          ...(extraProps.length ? { extra: Object.fromEntries(extraProps) } : {}),
        },
        curves: {
          hp: base("FIGHT_PROP_BASE_HP").type,
          attack: base("FIGHT_PROP_BASE_ATTACK").type,
          defense: base("FIGHT_PROP_BASE_DEFENSE").type,
        },
        ascensionStat: substat,
        promotions: (y.upgrade.promote as any[]).map((p) => ({
          maxLevel: p.unlockMaxLevel,
          hp: p.addProps?.FIGHT_PROP_BASE_HP ?? 0,
          attack: p.addProps?.FIGHT_PROP_BASE_ATTACK ?? 0,
          defense: p.addProps?.FIGHT_PROP_BASE_DEFENSE ?? 0,
          ascensionStat: p.addProps?.[substat] ?? 0,
        })),
      }),
      images,
      releasedIn: required(traveler ? talents.version : c.version, "releasedIn"),
      releasedAt: new Date((y.release as number) * 1000),
      enhancedIn,
    };

    // 名詞說明裡的 {PARAM#P1312101|3S1} 依 params 代入數值；結尾的 :I 表示以整數顯示（{PARAM#P1402201|3S1:I}）
    const effects = (Object.values(y.dictionary?.effectsInfo ?? {}) as any[]).map((e) => [
      e.name as string,
      yattaText(
        (e.description as string).replace(/\{PARAM#([^}]+)\}/g, (_, full: string) => {
          const [ref, display] = full.split(":") as [string, string | undefined];
          if (display !== undefined && display !== "I")
            throw new Error(`${slug} 的名詞「${e.name}」的參數 ${full} 有未知的顯示格式`);
          const p = (e.params as any[]).find((x) => x.skillFull === ref);
          if (!p) throw new Error(`${slug} 的名詞「${e.name}」找不到參數 ${full}`);
          const v = p.skillParam.paramValue * p.skillParam.paramMultiplier;
          if (display === "I") return `${Math.round(v)}`;
          return /P/.test(ref.split("|")[1] ?? "")
            ? `${+(v * 100).toFixed(2)}%`
            : `${+v.toFixed(2)}`;
        }),
      )!,
    ]);

    const i18n = {
      locale: LOCALE,
      name: required(c.name, "name"),
      title: emptyToNull(c.title),
      description: required(c.description, "description"),
      affiliation: emptyToNull(c.affiliation),
      region: emptyToNull(c.region),
      constellationName: emptyToNull(c.constellation),
      voiceActors: VoiceActorsSchema.parse({
        en: c.cv.english,
        ja: c.cv.japanese,
        ko: c.cv.korean,
        zhCN: c.cv.chinese,
      }),
      glossary: GlossarySchema.parse({
        linkToEffect: {},
        linkToTalent: {},
        linkToPassive: {},
        linkToConstellation: {},
        relatedEffects: Object.fromEntries(effects),
      }),
    };

    const lore = loreOf(slug, fetter, !!traveler);

    const costs = isManekin
      ? [...LEVEL_BREAK_COSTS]
      : [
          ...ascensionStagesOf(c.costs).flatMap(([stage, items]) =>
            items.map((m) => ({
              kind: "ascension" as const,
              stage,
              materialId: m.id,
              count: m.count,
            })),
          ),
          ...LEVEL_BREAK_COSTS,
          ...Array.from({ length: 9 }, (_, i) =>
            CostSchema.parse(talents.costs[`lvl${i + 2}`]).map((m) => ({
              kind: "talent" as const,
              stage: i + 1,
              materialId: m.id,
              count: m.count,
            })),
          ).flat(),
        ];

    // 旅行者的衣裝：空、熒共用空的衣裝 ID（依名稱對應），以 variant 區分各自的圖片，與資料庫既有資料一致
    const variant = traveler?.variant ?? "default";
    const aetherOutfitIds = new Map(
      (gdbOutfits.get(10000005) ?? []).map((o) => [o.name as string, o.id as number]),
    );
    const outfitIdOf = (o: any) => {
      if (!traveler) return o.id as number;
      const id = aetherOutfitIds.get(o.name);
      if (!id) throw new Error(`${slug} 的衣裝「${o.name}」找不到對應的空衣裝 ID`);
      return id;
    };
    const assets = portraitAssets(rawImages);
    const outfits = (gdbOutfits.get(gameId) ?? []).map((o) => {
      // 預設衣裝沒有自己的圖片，沿用角色的
      const raw = ImagesSchema.parse({
        icon: o.images.filename_icon ?? rawImages.icon,
        gacha: o.images.filename_splash ?? rawImages.gacha,
      });
      assets.push(...portraitAssets(raw));
      return {
        outfitId: outfitIdOf(o),
        variant,
        isDefault: o.isDefault as boolean,
        images: r2Images(raw),
        releasedIn: emptyToNull(o.version),
        name: required(o.name, "name"),
        description: emptyToNull(o.description),
      };
    });
    // genshin-db 沒有奇偶的衣裝：依預設衣裝的 ID 規則（200000 + 角色編號 × 100，122 套全部符合）建立，
    // 名稱取自 Yatta，圖片沿用角色的
    if (isManekin && !outfits.length) {
      const costume = (y.other?.costume as any[] | undefined)?.find((o) => o.isDefault);
      outfits.push({
        outfitId: 200000 + (gameId - 10000000) * 100,
        variant,
        isDefault: true,
        images,
        releasedIn: required(c.version, "releasedIn"),
        name: required(costume?.name, "name"),
        description: emptyToNull(costume?.description),
      });
    }
    if (outfits.filter((o) => o.isDefault).length !== 1)
      throw new Error(`${slug} 的預設衣裝不是剛好一套`);

    for (const a of abilities) if (a.icon) assets.push(skillAsset(a.icon));
    return { row, i18n, lore, abilities, costs, outfits, assets };
  };
}

// ---------- 武器 ----------

function buildWeaponFactory() {
  const gdbWeapons = gdbIndex<any>(gdb.weapons);

  return async function buildWeapon(slug: string, id: number) {
    const w = gdbWeapons.get(id);
    if (!w) throw new SkipError(`genshin-db 沒有 ID ${id}`);
    const y = await yatta(`weapon/${id}`);
    const [attack, substat] = y.upgrade.prop as any[];
    // 1～2 星武器沒有副詞條：substatType 為 null，stats 不帶 substat

    // 精煉數值 r1.values[i]～r5.values[i] → [參數索引][精煉 1～5 階]
    // 無法精煉的武器（降臨之劍、「一心傳」名刀等）只有 r1，其餘各階沿用前一階
    const values: (string[] | undefined)[] = [w.r1, w.r2, w.r3, w.r4, w.r5].map((r) => r?.values);
    if (REFINEMENT_OVERRIDES[id]) values[0] = REFINEMENT_OVERRIDES[id].r1;
    for (let i = 1; i < 5; i++) values[i] ??= values[i - 1];
    if (values[0] && values.some((v) => v!.length !== values[0]!.length))
      throw new Error(
        `${slug} 各階精煉的參數數量不同（${values.map((v) => v!.length).join("/")}），請在 REFINEMENT_OVERRIDES 指定 R1`,
      );
    const params = (values[0] ?? []).map((_, i) => values.map((v) => v![i]!));
    let effectTemplate: string = w.effectTemplateRaw ?? "";
    const missing = REFINEMENT_OVERRIDES[id]?.r1Missing;
    if (missing) {
      if (!effectTemplate.includes(missing))
        throw new Error(`${slug} 的特效說明中找不到 REFINEMENT_OVERRIDES 的 r1Missing`);
      effectTemplate = effectTemplate.replace(missing, `{${params.length}}`);
      params.push(["", missing, missing, missing, missing]);
    }
    const refinementParams = RefinementParamsSchema.parse(params);
    const used = [...effectTemplate.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
    if (used.length && Math.max(...used) >= refinementParams.length)
      throw new Error(
        `${slug} 的特效用到 {${Math.max(...used)}}，但只有 ${refinementParams.length} 組精煉數值`,
      );

    return {
      row: {
        id,
        slug,
        weaponType: mapCode(WEAPON_TYPE_MAP, w.weaponType, "武器類型"),
        rarity: w.rarity as number,
        substatType: substat ? required(w.mainStatType, "substatType") : null,
        stats: WeaponStatsSchema.parse({
          base: { attack: w.baseAtkValue, ...(substat && { substat: substat.initValue }) },
          curves: { attack: attack.type, ...(substat && { substat: substat.type }) },
          promotions: (y.upgrade.promote as any[]).map((p) => ({
            maxLevel: p.unlockMaxLevel,
            attack: p.addProps?.FIGHT_PROP_BASE_ATTACK ?? 0,
          })),
        }),
        refinementParams,
        images: ImagesSchema.parse({
          icon: w.images.filename_icon,
          gacha: w.images.filename_gacha,
        }),
        releasedIn: required(w.version, "releasedIn"),
      },
      i18n: {
        locale: LOCALE,
        name: required(w.name, "name"),
        description: required(w.description, "description"),
        effectName: emptyToNull(w.effectName),
        effectDescription: emptyToNull(effectTemplate), // 保留 {0}、{1} 佔位符
        story: emptyToNull(w.story),
      },
      costs: ascensionStagesOf(w.costs).flatMap(([stage, items]) =>
        items.map((m) => ({ stage, materialId: m.id, count: m.count })),
      ),
      assets: weaponAssets({ icon: w.images.filename_icon, gacha: w.images.filename_gacha }),
    };
  };
}

// ---------- 聖遺物 ----------

function buildArtifactFactory() {
  const gdbArtifacts = gdbIndex<any>(gdb.artifacts);

  return async function buildArtifact(slug: string, id: number) {
    const a = gdbArtifacts.get(id);
    if (!a) throw new SkipError(`genshin-db 沒有 ID ${id}`);
    const slots = t.artifactSlot.enumValues.filter((s) => a[s]);
    if (!slots.length) throw new Error(`${slug} 沒有任何部件`);
    const icons: string[] = slots.map((slot) => required(a.images[`filename_${slot}`], "icon"));
    return {
      assets: icons.map(relicAsset),
      row: {
        id,
        slug,
        minRarity: Math.min(...a.rarityList),
        maxRarity: Math.max(...a.rarityList),
        releasedIn: required(a.version, "releasedIn"),
      },
      i18n: {
        locale: LOCALE,
        name: required(a.name, "name"),
        bonus1pc: emptyToNull(a.effect1Pc),
        bonus2pc: emptyToNull(a.effect2Pc),
        bonus4pc: emptyToNull(a.effect4Pc),
      },
      pieces: slots.map((slot, i) => ({
        slot,
        icon: icons[i]!,
        i18n: {
          locale: LOCALE,
          name: required(a[slot].name, "name"),
          description: emptyToNull(a[slot].description),
          story: emptyToNull(a[slot].story),
        },
      })),
    };
  };
}

// ---------- 素材 ----------

/** 素材（只補資料庫缺少的）；格式與既有資料一致：zh-TW 有完整內容，en 只有名稱 */
function buildMaterial() {
  // 與 gdbIndex 相同，透過寬鬆的函式型別呼叫，避開 genshin-db 對 "names" 查詢的回傳型別
  const all = (language: gdb.Language) =>
    (gdb.materials as (q: string, o: object) => unknown)("names", {
      matchCategories: true,
      verboseCategories: true,
      resultLanguage: language,
    }) as any[];
  const cht = new Map(all(gdb.Language.ChineseTraditional).map((m) => [m.id as number, m]));
  const english = new Map(all(gdb.Language.English).map((m) => [m.id as number, m.name as string]));

  return async (id: number) => {
    const m = cht.get(id);
    if (!m) return yattaMaterial(id);
    return {
      row: {
        id,
        category: required(m.category, `素材 ${id} 的 category`),
        rarity: (m.rarity as number | undefined) ?? 1, // genshin-db 沒有稀有度的，既有資料皆為 1
        icon: required(m.images?.filename_icon, `素材 ${id} 的 icon`),
      },
      i18n: [
        {
          materialId: id,
          locale: LOCALE,
          name: required(m.name, `素材 ${id} 的 name`),
          typeText: emptyToNull(m.typeText),
          description: emptyToNull(m.description),
          // genshin-db 會帶「佔位-可合成數量:{0}」之類的項目，拿掉
          sources:
            ((m.sources ?? null) as string[] | null)?.filter((s) => !s.startsWith("佔位")) ?? null,
        },
        {
          materialId: id,
          locale: "en" as const,
          name: required(english.get(id), `素材 ${id} 的英文名稱`),
        },
      ],
    };
  };
}

/** Yatta 素材的 type → genshin-db 的 category；其他類型遇到時再確認對應 */
const yattaMaterialCategory = (type: string) =>
  type.endsWith("區域特產")
    ? "EXCHANGE"
    : type === "角色培養素材" || type === "角色與武器培養素材"
      ? "AVATAR_MATERIAL"
      : undefined;

/**
 * genshin-db 還沒收錄的素材（剛實裝的區域特產、週本素材）改由 Yatta 產生，格式與 genshin-db 的相同：
 * 已用金蕨、游離者的裂甲驗證說明一致；sources 拿掉 genshin-db 沒有的「塵歌壺種植」
 */
async function yattaMaterial(id: number) {
  const y = await yatta(`material/${id}`);
  const en = await yatta(`material/${id}`, "en");
  const category = yattaMaterialCategory(y.type);
  if (!category)
    throw new Error(`genshin-db 沒有素材 ${id}，Yatta 的類型「${y.type}」沒有對應的 category`);
  const sources = ((y.source ?? []) as { name: string }[])
    .map((s) => s.name)
    .filter((s) => s !== "塵歌壺種植");
  return {
    row: {
      id,
      category,
      rarity: (y.rank as number | undefined) ?? 1,
      icon: required(y.icon, `素材 ${id} 的 icon`),
    },
    i18n: [
      {
        materialId: id,
        locale: LOCALE,
        name: required(y.name, `素材 ${id} 的 name`),
        typeText: emptyToNull(y.type),
        description: yattaText(y.description),
        sources: sources.length ? sources : null,
      },
      { materialId: id, locale: "en" as const, name: required(en?.name, `素材 ${id} 的英文名稱`) },
    ],
  };
}

type BuiltCharacter = Awaited<ReturnType<ReturnType<typeof buildCharacterFactory>>>;
type BuiltWeapon = Awaited<ReturnType<ReturnType<typeof buildWeaponFactory>>>;
type BuiltArtifact = Awaited<ReturnType<ReturnType<typeof buildArtifactFactory>>>;

// ---------- 比對（--compare） ----------

const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
const OMIT_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "characterId",
  "weaponId",
  "setId",
  "abilityId",
]);

/** 資料庫的列（snake_case）→ 與產生結果相同的形狀 */
function normalizeRow(r: Record<string, unknown>, keepId: boolean) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r)) {
    const key = camel(k);
    if (OMIT_KEYS.has(key) || (key === "id" && !keepId)) continue;
    // timestamptz 回傳 "2026-05-18 21:00:00+00"，轉成與 Date#toJSON 相同的格式
    o[key] = key === "releasedAt" && typeof v === "string" ? new Date(v).toISOString() : v;
  }
  return o;
}
const withI18n = (r: Record<string, unknown>, fields: string[]) => {
  const rest = { ...r };
  const i18n: Record<string, unknown> = {};
  for (const f of ["locale", ...fields]) {
    i18n[f] = rest[f];
    delete rest[f];
  }
  return { ...rest, i18n };
};

/** JSON 化後比對；Date 轉成 ISO 字串 */
const plainJson = (v: unknown) => JSON.parse(JSON.stringify(v));
const stableSort = <T>(list: T[]) =>
  [...list].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));

function deepDiff(label: string, expected: unknown, actual: unknown, out: string[]) {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return;
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    if (Array.isArray(expected) && Array.isArray(actual) && expected.length !== actual.length)
      out.push(`${label}：長度 資料庫 ${expected.length}／產生 ${actual.length}`);
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    for (const k of new Set([...Object.keys(e), ...Object.keys(a)]))
      deepDiff(`${label}.${k}`, e[k], a[k], out);
    return;
  }
  const show = (v: unknown) => (v === undefined ? "（無）" : JSON.stringify(v).slice(0, 200));
  out.push(`${label}\n    資料庫：${show(expected)}\n    產生：  ${show(actual)}`);
}

/**
 * 過濾 deepDiff 的結果：只有資料庫有、產生的資料沒有的（例如手動加的 linkTo* 別名、舊資料的任務名稱）
 * 不算不同；陣列長度不同時只留長度那行，不列之後每一項錯開的差異
 */
function significantDiffs(lines: string[]) {
  const resized = lines.filter((l) => l.includes("：長度 ")).map((l) => l.split("：")[0]!);
  return lines
    .filter((l) => !l.endsWith("產生：  （無）"))
    .filter((l) => !resized.some((p) => l.startsWith(`${p}.`)));
}

async function rows(query: ReturnType<typeof sql>) {
  return (await db.execute(query)).rows as Record<string, unknown>[];
}

/**
 * --compare=all：資料庫中所有角色、武器、聖遺物（可用 --only 限定類型），只列出有差異的項目；
 * 產生失敗的項目列在最後，不會中斷比對
 */
async function compareAll(only: Set<string>, build: Builders) {
  const slugs: string[] = [];
  for (const [type, table] of [
    ["characters", "characters"],
    ["weapons", "weapons"],
    ["artifacts", "artifact_sets"],
  ] as const)
    if (only.has(type))
      slugs.push(
        ...(await rows(sql`select slug from ${sql.identifier(table)} order by slug`)).map(
          (r) => r.slug as string,
        ),
      );
  return compare(slugs, build, { onlyDiff: true });
}

async function compare(slugs: string[], build: Builders, opts: { onlyDiff?: boolean } = {}) {
  let total = 0;
  const changed: string[] = [];
  const failed: string[] = [];
  for (const [i, slug] of slugs.entries()) {
    if (opts.onlyDiff) process.stdout.write(`\r  ${i + 1}/${slugs.length} ${slug.padEnd(40)}`);
    const out: string[] = [];
    try {
      await compareOne(slug, build, out, !!opts.onlyDiff);
    } catch (error) {
      if (!opts.onlyDiff) throw error;
      failed.push(`${slug}：${error instanceof Error ? error.message : error}`);
      continue;
    }
    total += out.length;
    if (out.length) changed.push(slug);
    if (opts.onlyDiff && !out.length) continue;
    if (opts.onlyDiff) process.stdout.write(`\r${" ".repeat(60)}\r`);
    console.log(`\n== ${slug}：${out.length ? `${out.length} 處差異` : "完全一致"}`);
    for (const line of out) console.log(`  ${line}`);
  }
  if (opts.onlyDiff) {
    process.stdout.write(`\r${" ".repeat(60)}\r`);
    console.log(`\n比對 ${slugs.length} 項：有差異 ${changed.length} 項、共 ${total} 處`);
    if (failed.length) console.log(`產生失敗 ${failed.length} 項：\n  ${failed.join("\n  ")}`);
  } else console.log(`\n共 ${total} 處差異`);
}

/**
 * 重新產生一個項目，與資料庫逐欄比對，差異寫入 out
 * @param filtered 過濾雜訊（--compare=all）：沒有 key 與空值視為相同、產生的 glossary 先推導 linkTo* 別名、
 *   語音依對應逐條比對、只有資料庫有的內容不列（見 significantDiffs）
 */
async function compareOne(slug: string, build: Builders, out: string[], filtered = false) {
  const lines: string[] = [];
  const diff = (label: string, expected: unknown, actual: unknown) =>
    filtered
      ? deepDiff(label, pruneEmpty(plainJson(expected)), pruneEmpty(plainJson(actual)), lines)
      : deepDiff(label, expected, actual, lines);
  const [character] = await rows(sql`select * from characters where slug = ${slug}`);
  const [weapon] = await rows(sql`select * from weapons where slug = ${slug}`);
  const [artifact] = await rows(sql`select * from artifact_sets where slug = ${slug}`);

  if (character) {
    const id = character.id;
    const c = await build.character(slug, character.game_id as number);
    const [i18n] = await rows(
      sql`select * from character_i18n where character_id = ${id} and locale = ${LOCALE}`,
    );
    const [lore] = await rows(
      sql`select * from character_lore where character_id = ${id} and locale = ${LOCALE}`,
    );
    const abilities = await rows(sql`
        select a.*, i.locale, i.name, i.description, i.labels from character_abilities a
        join character_ability_i18n i on i.ability_id = a.id and i.locale = ${LOCALE}
        where a.character_id = ${id} order by a.kind, a.sort_order, a.is_enhanced`);
    const costs = await rows(sql`select * from character_costs where character_id = ${id}`);
    const outfits = await rows(sql`
        select co.outfit_id, co.variant, co.is_default, o.images, o.released_in, oi.name, oi.description
        from character_outfits co
        join outfits o on o.id = co.outfit_id and o.variant = co.variant
        join outfit_i18n oi on oi.outfit_id = o.id and oi.variant = o.variant and oi.locale = ${LOCALE}
        where co.character_id = ${id}`);
    diff("row", normalizeRow(character, false), plainJson(c.row));
    let { i18n: genI18n, lore: genLore } = c;
    if (filtered) {
      genI18n = {
        ...genI18n,
        glossary: GlossarySchema.parse(inferLinkAliases(genI18n.glossary, c.abilities).glossary),
      };
      const v = alignVoicelines((lore!.voicelines ?? []) as Voiceline[], genLore.voicelines);
      if (v.added) lines.push(`lore.voicelines：${v.added} 條新語音（--sync-voicelines）`);
      genLore = { ...genLore, voicelines: v.aligned };
    }
    diff("i18n", normalizeRow(i18n!, false), plainJson(genI18n));
    diff("lore", normalizeRow(lore!, false), plainJson(genLore));
    diff(
      "abilities",
      abilities.map((a) => withI18n(normalizeRow(a, false), ["name", "description", "labels"])),
      plainJson(c.abilities),
    );
    diff("costs", stableSort(costs.map((x) => normalizeRow(x, false))), stableSort(c.costs));
    diff(
      "outfits",
      stableSort(outfits.map((x) => normalizeRow(x, false))),
      stableSort(plainJson(c.outfits)),
    );
  } else if (weapon) {
    const w = await build.weapon(slug, weapon.id as number);
    const [i18n] = await rows(
      sql`select * from weapon_i18n where weapon_id = ${weapon.id} and locale = ${LOCALE}`,
    );
    const costs = await rows(sql`select * from weapon_costs where weapon_id = ${weapon.id}`);
    diff("row", normalizeRow(weapon, true), plainJson(w.row));
    diff("i18n", normalizeRow(i18n!, false), w.i18n);
    diff("costs", stableSort(costs.map((x) => normalizeRow(x, false))), stableSort(w.costs));
  } else if (artifact) {
    const a = await build.artifact(slug, artifact.id as number);
    const [i18n] = await rows(
      sql`select * from artifact_set_i18n where set_id = ${artifact.id} and locale = ${LOCALE}`,
    );
    const pieces = await rows(sql`
        select p.*, i.locale, i.name, i.description, i.story from artifact_pieces p
        join artifact_piece_i18n i on i.set_id = p.set_id and i.slot = p.slot and i.locale = ${LOCALE}
        where p.set_id = ${artifact.id} order by p.slot`);
    diff("row", normalizeRow(artifact, true), plainJson(a.row));
    diff("i18n", normalizeRow(i18n!, false), a.i18n);
    diff(
      "pieces",
      pieces.map((p) => withI18n(normalizeRow(p, false), ["name", "description", "story"])),
      a.pieces,
    );
  } else {
    lines.push("資料庫沒有這個 slug");
  }
  out.push(...(filtered ? significantDiffs(lines) : lines));
}

// ---------- 同步會隨版本增加的內容（--sync-voicelines、--sync-stories、--sync-lore、--sync-abilities、--sync-outfits） ----------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** 一位角色可以補上的內容；items 是可以用 --pick 個別挑選的新內容，notes 是挑選這位角色時一併套用的調整 */
type SyncPlan<P> = {
  slug: string;
  characterId: number;
  items: { id: string; label: string }[];
  notes: string[];
  data: P;
};
type SyncOptions = {
  slugs: string[] | undefined;
  pick: string | undefined;
  write: boolean;
  dryRun: boolean;
  endpoint: string;
};

/**
 * 同步的共用流程：逐一產生角色的 SyncPlan 並列出；write 時依 --pick 寫入挑選的內容
 * --pick：all（全部）、slug（該角色全部）、slug#編號（指定項目），以逗號分隔
 */
async function runSync<P>(
  name: string,
  opts: SyncOptions,
  plan: (ch: Record<string, unknown>) => Promise<SyncPlan<P> | undefined>,
  apply: (tx: Tx, plan: SyncPlan<P>, picked: Set<string>) => Promise<void>,
  /** 寫入成功後要下載的圖片 */
  assetsOf?: (plan: SyncPlan<P>, picked: Set<string>) => ImageAsset[],
) {
  const characters = (await rows(sql`select * from characters order by game_id, slug`)).filter(
    (c) => !opts.slugs || opts.slugs.includes(c.slug as string),
  );
  const plans: SyncPlan<P>[] = [];
  for (const [i, ch] of characters.entries()) {
    process.stdout.write(`\r  ${i + 1}/${characters.length} ${(ch.slug as string).padEnd(40)}`);
    const p = await plan(ch);
    if (p && (p.items.length || p.notes.length)) plans.push(p);
  }
  process.stdout.write("\n");

  const tokens = opts.pick?.split(",").filter(Boolean) ?? [];
  const used = new Set<string>();
  const isPicked = (slug: string, id?: string) => {
    const hit = tokens.find(
      (p) => p === "all" || p === slug || (id !== undefined && p === `${slug}#${id}`),
    );
    if (hit) used.add(hit);
    return !!hit;
  };
  const selected = plans.flatMap((p) => {
    const whole = isPicked(p.slug);
    const picked = new Set(p.items.filter((x) => whole || isPicked(p.slug, x.id)).map((x) => x.id));
    return whole || picked.size ? [{ plan: p, picked }] : [];
  });

  console.log(`${name}：有新內容的角色 ${plans.length} 位`);
  for (const p of plans) {
    const picked = selected.find((s) => s.plan === p)?.picked;
    console.log(`\n== ${p.slug}`);
    for (const x of p.items)
      console.log(`  ${picked?.has(x.id) ? "✔" : " "} ${`#${x.id}`.padEnd(8)} ${x.label}`);
    for (const n of p.notes)
      console.log(`    （${picked ? "一併套用" : "挑選此角色時一併套用"}）${n}`);
  }
  const unused = tokens.filter((p) => !used.has(p));
  if (unused.length) throw new Error(`--pick 中沒有對應內容的項目：${unused.join(", ")}`);

  if (!opts.write) {
    if (plans.length)
      console.log(
        `\n以上只是檢查。要寫入時加上 --confirm=${opts.endpoint} --pick=…（all、slug 或 slug#編號，逗號分隔）`,
      );
    return;
  }
  if (!tokens.length) throw new Error("寫入時需要 --pick 指定要補的內容（all、slug 或 slug#編號）");
  console.log(
    `\n寫入 ${selected.length} 位角色、${selected.reduce((n, s) => n + s.picked.size, 0)} 項新內容`,
  );
  try {
    await db.transaction(async (tx) => {
      for (const s of selected) await apply(tx, s.plan, s.picked);
      if (opts.dryRun) tx.rollback();
    });
    console.log(`\n已更新 ${opts.endpoint}`);
    const assets = assetsOf ? selected.flatMap((s) => assetsOf(s.plan, s.picked)) : [];
    if (assets.length) {
      console.log("\n下載新內容的圖片：");
      await downloadAssets(assets);
    }
  } catch (error) {
    if (!(opts.dryRun && error instanceof TransactionRollbackError)) throw error;
    console.log("\n--dry-run：已 ROLLBACK，資料庫沒有任何變動");
  }
}

/** 語音的識別鍵：標題＋第幾次出現（迪盧克等角色有同標題的語音） */
const voicelineKeys = (list: Voiceline[]) => {
  const seen = new Map<string, number>();
  return list.map((v) => {
    const n = (seen.get(v.title) ?? 0) + 1;
    seen.set(v.title, n);
    return `${v.title}#${n}`;
  });
};

/**
 * 產生的語音各自對應到資料庫的哪一條：先以標題對應，剩下的再以內容對應（Yatta 會改標題，例如
 * 關於「木偶」… → 關於「木偶」·研究）；對應不到的是新語音
 */
function matchVoicelines(current: Voiceline[], generated: Voiceline[]) {
  const byKey = new Map(voicelineKeys(current).map((k, i) => [k, i]));
  const used = new Set<number>();
  const match: (number | undefined)[] = voicelineKeys(generated).map((k) => {
    const j = byKey.get(k);
    if (j !== undefined) used.add(j);
    return j;
  });
  generated.forEach((g, i) => {
    if (match[i] !== undefined) return;
    const j = current.findIndex((c, ci) => !used.has(ci) && c.text === g.text);
    if (j >= 0) {
      match[i] = j;
      used.add(j);
    }
  });
  return match;
}

/**
 * 把產生的語音排成資料庫的順序（以 matchVoicelines 對應），讓兩邊可以逐條比對、補空欄位：
 * 對不到的（資料庫才有的）放資料庫原本的內容；added 是資料庫還沒有的新語音條數
 */
function alignVoicelines(current: Voiceline[], generated: Voiceline[]) {
  const aligned = [...current];
  let added = 0;
  matchVoicelines(current, generated).forEach((j, i) => {
    if (j === undefined) added++;
    else aligned[j] = generated[i]!;
  });
  return { aligned, added };
}

/**
 * 依產生的順序合併：有挑選的新項目插入、有對應的項目依 replace 決定是否換成產生的內容，
 * 資料庫才有的項目在遇到下一個有對應的項目前輸出（留在原本的相對位置）
 */
function mergeInOrder<T>(
  current: T[],
  generated: T[],
  match: (number | undefined)[],
  picked: Set<string>,
  replace: (current: T, generated: T) => T,
) {
  const out: T[] = [];
  let next = 0;
  generated.forEach((g, i) => {
    const j = match[i];
    const take = picked.has(String(i + 1));
    if (j === undefined) {
      if (take) out.push(g);
      return;
    }
    while (next < j) out.push(current[next++]!);
    if (next === j) {
      out.push(take ? replace(current[j]!, g) : current[j]!);
      next++;
    }
  });
  while (next < current.length) out.push(current[next++]!);
  return out;
}

type LoreDiff<T> = {
  current: T[];
  generated: T[];
  match: (number | undefined)[];
  items: { id: string; label: string }[];
};

/**
 * 語音：Yatta 有、資料庫沒有的語音依 Yatta 的順序插入，標題改變的語音更新標題；
 * 既有語音的內容（含手動修改）不覆寫，資料庫才有的語音留在原本的相對位置
 */
function diffVoicelines(current: Voiceline[], generated: Voiceline[]): LoreDiff<Voiceline> {
  const match = matchVoicelines(current, generated);
  const items = generated.flatMap((g, i) => {
    const j = match[i];
    if (j === undefined) return [{ id: String(i + 1), label: `新增［${g.type}］${g.title}` }];
    if (current[j]!.title !== g.title)
      return [{ id: String(i + 1), label: `標題變更 ${current[j]!.title} → ${g.title}` }];
    return [];
  });
  return { current, generated, match, items };
}
const mergeVoicelines = (d: LoreDiff<Voiceline>, picked: Set<string>) =>
  mergeInOrder(d.current, d.generated, d.match, picked, (c, g) => ({ ...c, title: g.title }));

/**
 * 故事：Yatta 有、資料庫沒有的故事依 Yatta 的順序插入；內容或標題不同的故事也列出，
 * 挑選時整篇換成 Yatta 的內容（會蓋掉手動修改），沒挑選的維持原樣
 */
function diffStories(current: Story[], generated: Story[]): LoreDiff<Story> {
  // 先以標題對應；對應不到時，同一位置的故事也沒有對應到別篇，就視為同一篇（標題被改過）
  const used = new Set<number>();
  const match: (number | undefined)[] = generated.map((g) => {
    const j = current.findIndex((c, ci) => !used.has(ci) && c.title === g.title);
    if (j < 0) return undefined;
    used.add(j);
    return j;
  });
  generated.forEach((_, i) => {
    if (match[i] === undefined && i < current.length && !used.has(i)) {
      match[i] = i;
      used.add(i);
    }
  });
  const items = generated.flatMap((g, i) => {
    const j = match[i];
    if (j === undefined) return [{ id: String(i + 1), label: `新增 ${g.title}` }];
    const row = current[j]!;
    if (row.title !== g.title)
      return [
        { id: String(i + 1), label: `標題變更 ${row.title} → ${g.title}（挑選後會整篇覆蓋）` },
      ];
    if (canonicalJson(row) !== canonicalJson(g))
      return [{ id: String(i + 1), label: `內容不同 ${g.title}（挑選後會整篇覆蓋）` }];
    return [];
  });
  return { current, generated, match, items };
}
const mergeStories = (d: LoreDiff<Story>, picked: Set<string>) =>
  mergeInOrder(d.current, d.generated, d.match, picked, (_, g) => g);

/** 資料庫中角色的故事與語音，以及重新產生的版本 */
async function loreDiffOf(ch: Record<string, unknown>, build: Builders) {
  const c = await build.character(ch.slug as string, ch.game_id as number);
  const [lore] = await rows(sql`
    select stories, voicelines from character_lore where character_id = ${ch.id} and locale = ${LOCALE}`);
  return {
    stories: diffStories((lore?.stories ?? []) as Story[], c.lore.stories),
    voicelines: diffVoicelines((lore?.voicelines ?? []) as Voiceline[], c.lore.voicelines),
  };
}
const updateLore = (
  tx: Tx,
  characterId: number,
  set: { stories?: Story[]; voicelines?: Voiceline[] },
) =>
  tx
    .update(t.characterLore)
    .set(set)
    .where(
      sql`${t.characterLore.characterId} = ${characterId} and ${t.characterLore.locale} = ${LOCALE}`,
    );

function syncVoicelines(opts: SyncOptions, build: Builders) {
  return runSync<LoreDiff<Voiceline>>(
    "語音",
    opts,
    async (ch) => {
      const d = (await loreDiffOf(ch, build)).voicelines;
      return {
        slug: ch.slug as string,
        characterId: ch.id as number,
        items: d.items,
        notes: [],
        data: d,
      };
    },
    async (tx, { slug, characterId, data }, picked) => {
      const voicelines = mergeVoicelines(data, picked);
      console.log(`  ${slug}：語音 ${data.current.length} → ${voicelines.length} 條`);
      await updateLore(tx, characterId, { voicelines });
    },
  );
}

function syncStories(opts: SyncOptions, build: Builders) {
  return runSync<LoreDiff<Story>>(
    "故事",
    opts,
    async (ch) => {
      const d = (await loreDiffOf(ch, build)).stories;
      return {
        slug: ch.slug as string,
        characterId: ch.id as number,
        items: d.items,
        notes: [],
        data: d,
      };
    },
    async (tx, { slug, characterId, data }, picked) => {
      const stories = mergeStories(data, picked);
      console.log(`  ${slug}：故事 ${data.current.length} → ${stories.length} 篇`);
      await updateLore(tx, characterId, { stories });
    },
  );
}

/**
 * 故事與語音一起同步（--sync-stories ＋ --sync-voicelines），每位角色只產生一次、寫入一次；
 * 編號加上前綴區分：s 為故事、v 為語音（--pick=slug#s2,slug#v15）
 */
function syncLore(opts: SyncOptions, build: Builders) {
  type Data = Awaited<ReturnType<typeof loreDiffOf>>;
  /** 挑選的編號中，屬於指定前綴的（去掉前綴） */
  const only = (picked: Set<string>, prefix: string) =>
    new Set([...picked].filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length)));
  return runSync<Data>(
    "故事與語音",
    opts,
    async (ch) => {
      const d = await loreDiffOf(ch, build);
      return {
        slug: ch.slug as string,
        characterId: ch.id as number,
        items: [
          ...d.stories.items.map((x) => ({ id: `s${x.id}`, label: `故事 ${x.label}` })),
          ...d.voicelines.items.map((x) => ({ id: `v${x.id}`, label: `語音 ${x.label}` })),
        ],
        notes: [],
        data: d,
      };
    },
    async (tx, { slug, characterId, data }, picked) => {
      const stories = only(picked, "s");
      const voicelines = only(picked, "v");
      const set: { stories?: Story[]; voicelines?: Voiceline[] } = {};
      if (stories.size) {
        set.stories = mergeStories(data.stories, stories);
        console.log(`  ${slug}：故事 ${data.stories.current.length} → ${set.stories.length} 篇`);
      }
      if (voicelines.size) {
        set.voicelines = mergeVoicelines(data.voicelines, voicelines);
        console.log(
          `  ${slug}：語音 ${data.voicelines.current.length} → ${set.voicelines.length} 條`,
        );
      }
      if (stories.size || voicelines.size) await updateLore(tx, characterId, set);
    },
  );
}

/** 衣裝：genshin-db 有、角色還沒有的衣裝（衣裝本身已存在時不覆寫） */
function syncOutfits(opts: SyncOptions, build: Builders) {
  type Outfit = BuiltCharacter["outfits"][number] & { assets: ImageAsset[] };
  return runSync<Outfit[]>(
    "衣裝",
    opts,
    async (ch) => {
      const c = await build.character(ch.slug as string, ch.game_id as number);
      const have = new Set(
        (
          await rows(sql`select outfit_id from character_outfits where character_id = ${ch.id}`)
        ).map((r) => r.outfit_id),
      );
      const missing = c.outfits.filter((o) => !have.has(o.outfitId));
      return {
        slug: ch.slug as string,
        characterId: ch.id as number,
        items: missing.map((o) => ({
          id: String(o.outfitId),
          label: `「${o.name}」（${o.releasedIn ?? "版本未知"}）`,
        })),
        notes: [],
        // 衣裝的圖片：c.assets 中與衣裝檔名相同的（R2 路徑 ← lunaris 路徑）
        data: missing.map((o) => ({
          ...o,
          assets: c.assets.filter((a) =>
            [`avatar-icon/${o.images.icon}`, `avatar-img/${o.images.gacha}`].includes(a.target),
          ),
        })),
      };
    },
    async (tx, p, picked) => {
      const outfits = p.data.filter((o) => picked.has(String(o.outfitId)));
      if (!outfits.length) return;
      const versions = [...new Set(outfits.flatMap((o) => (o.releasedIn ? [o.releasedIn] : [])))];
      if (versions.length)
        await tx.insert(t.gameVersions).values(versions.map(versionRow)).onConflictDoNothing();
      await tx
        .insert(t.outfits)
        .values(
          outfits.map((o) => ({
            id: o.outfitId,
            variant: o.variant,
            images: o.images,
            releasedIn: o.releasedIn,
          })),
        )
        .onConflictDoNothing();
      await tx
        .insert(t.outfitI18n)
        .values(
          outfits.map((o) => ({
            outfitId: o.outfitId,
            variant: o.variant,
            locale: LOCALE,
            name: o.name,
            description: o.description,
          })),
        )
        .onConflictDoNothing();
      await tx.insert(t.characterOutfits).values(
        outfits.map((o) => ({
          characterId: p.characterId,
          outfitId: o.outfitId,
          variant: o.variant,
          isDefault: o.isDefault,
        })),
      );
    },
    (p, picked) => p.data.filter((o) => picked.has(String(o.outfitId))).flatMap((o) => o.assets),
  );
}

/**
 * 技能：補上缺少的技能（角色加強後的技能、之後新增的被動）與名詞說明，可個別挑選；
 * 被動排序、isEnhanced 標記、加強相關的 labels、圖示、enhancedIn 在挑選該角色時一併調整。
 * 既有技能的說明（含手動修改）不會被覆蓋
 */
function syncAbilities(opts: SyncOptions, build: Builders) {
  type Ability = Awaited<ReturnType<Builders["character"]>>["abilities"][number];
  type Data = {
    inserts: (Ability & { itemId: string })[];
    labelUpdates: { abilityId: number; labels: string[] | null }[];
    flagUpdates: { abilityId: number; isEnhanced: boolean }[];
    reorders: { abilityId: number; to: number }[];
    iconUpdates: { abilityId: number; icon: string | null }[];
    enhancedIn: string | null | undefined;
    glossary: Glossary;
    effects: { itemId: string; name: string; text: string }[];
    aliases: ReturnType<typeof inferLinkAliases>["added"];
  };
  const key = (a: { kind: string; sortOrder: number; isEnhanced: boolean }) =>
    `${a.kind}|${a.sortOrder}|${a.isEnhanced}`;

  return runSync<Data>(
    "技能",
    opts,
    async (ch) => {
      const slug = ch.slug as string;
      const c = await build.character(slug, ch.game_id as number);
      const dbAbilities = await rows(sql`
        select a.id, a.kind, a.sort_order, a.is_enhanced, a.icon, i.name, i.labels from character_abilities a
        join character_ability_i18n i on i.ability_id = a.id and i.locale = ${LOCALE}
        where a.character_id = ${ch.id}`);
      const notes: string[] = [];
      // 被動以名稱對應，排序與產生的不同時調整 sortOrder（例如依天賦類型重新排列）
      const reorders: Data["reorders"] = [];
      for (const a of c.abilities.filter((x) => x.kind === "passive")) {
        const row = dbAbilities.find(
          (r) => r.kind === "passive" && r.is_enhanced === a.isEnhanced && r.name === a.i18n.name,
        );
        if (row && row.sort_order !== a.sortOrder) {
          reorders.push({ abilityId: row.id as number, to: a.sortOrder });
          notes.push(
            `被動順序 ${a.i18n.name}${a.isEnhanced ? "［加強］" : ""} ${row.sort_order}→${a.sortOrder}`,
          );
          row.sort_order = a.sortOrder;
        }
      }
      const current = new Map(
        dbAbilities.map((a) => [
          key({
            kind: a.kind as string,
            sortOrder: a.sort_order as number,
            isEnhanced: a.is_enhanced as boolean,
          }),
          a,
        ]),
      );
      // 只差在 isEnhanced 的技能改為更新標記，不重複新增
      const generatedKeys = new Set(c.abilities.map(key));
      const flagUpdates: Data["flagUpdates"] = [];
      const missing = c.abilities.filter((a) => {
        if (current.has(key(a))) return false;
        const flipped = key({ ...a, isEnhanced: !a.isEnhanced });
        const other = current.get(flipped);
        if (other && !generatedKeys.has(flipped) && other.name === a.i18n.name) {
          flagUpdates.push({ abilityId: other.id as number, isEnhanced: a.isEnhanced });
          notes.push(`isEnhanced ${a.i18n.name} → ${a.isEnhanced}`);
          return false;
        }
        return true;
      });
      const labelUpdates = c.abilities.flatMap((a) => {
        const row = current.get(key(a));
        if (!row) return [];
        // 位置相同但名稱不同，代表資料庫的排列與產生的不一致，不能直接補
        if (row.name !== a.i18n.name)
          throw new Error(`${slug} 的 ${key(a)}：資料庫「${row.name}」／產生「${a.i18n.name}」`);
        const split = !a.isEnhanced && ENHANCED_LABELS[`${ch.game_id}:${a.kind}`];
        return split && canonicalJson(row.labels) !== canonicalJson(a.i18n.labels)
          ? [{ abilityId: row.id as number, labels: a.i18n.labels }]
          : [];
      });
      if (labelUpdates.length) notes.push(`更新加強相關的 labels ${labelUpdates.length} 筆`);
      // 圖示檔名以資料來源為準
      const iconUpdates = c.abilities.flatMap((a) => {
        const row = current.get(key(a));
        return row && row.icon !== a.icon ? [{ abilityId: row.id as number, icon: a.icon }] : [];
      });
      if (iconUpdates.length) notes.push(`更新圖示 ${iconUpdates.length} 筆`);
      const enhancedIn = ch.enhanced_in === c.row.enhancedIn ? undefined : c.row.enhancedIn;
      if (enhancedIn !== undefined) notes.push(`enhancedIn → ${enhancedIn}`);
      // 名詞說明只補缺少的名詞（既有的說明與 linkTo* 可能是手動修改，不覆蓋）
      const [i18n] = await rows(sql`
        select glossary from character_i18n where character_id = ${ch.id} and locale = ${LOCALE}`);
      const glossary = (i18n?.glossary ?? {}) as Glossary;
      const missingEffects = Object.entries(c.i18n.glossary.relatedEffects).filter(
        ([name]) => !(name in (glossary.relatedEffects ?? {})),
      );
      // 新技能或名詞說明可能帶來新的 {LINK} 關鍵字：以補上名詞說明後的 glossary 推導別名，挑選該角色時一併加入
      const aliases = inferLinkAliases(
        {
          ...glossary,
          relatedEffects: { ...glossary.relatedEffects, ...Object.fromEntries(missingEffects) },
        },
        c.abilities,
      );
      for (const a of aliases.added) notes.push(`新增別名 ${a.key}: ${a.keyword} → ${a.target}`);
      for (const s of aliases.skipped) notes.push(`別名不處理：${s}（請手動補）`);

      let n = 0;
      const inserts = missing.map((a) => ({ ...a, itemId: String(++n) }));
      const effects = missingEffects.map(([name, text]) => ({ itemId: String(++n), name, text }));
      return {
        slug,
        characterId: ch.id as number,
        items: [
          ...inserts.map((a) => ({
            id: a.itemId,
            label: `技能 ${a.kind}[${a.sortOrder}]「${a.i18n.name}」${a.isEnhanced ? "［加強］" : ""}`,
          })),
          ...effects.map((e) => ({ id: e.itemId, label: `名詞說明「${e.name}」` })),
        ],
        notes,
        data: {
          inserts,
          labelUpdates,
          flagUpdates,
          reorders,
          iconUpdates,
          enhancedIn,
          glossary,
          effects,
          aliases: aliases.added,
        },
      };
    },
    async (tx, { characterId, data: d }, picked) => {
      if (d.enhancedIn)
        await tx.insert(t.gameVersions).values(versionRow(d.enhancedIn)).onConflictDoNothing();
      const byId = (id: number) => sql`${t.characterAbilities.id} = ${id}`;
      // 先移到負數暫存位置，避免與 (character, kind, sort_order, is_enhanced) 的唯一鍵衝突
      for (const u of d.reorders)
        await tx.update(t.characterAbilities).set({ sortOrder: -u.to }).where(byId(u.abilityId));
      for (const u of d.reorders)
        await tx.update(t.characterAbilities).set({ sortOrder: u.to }).where(byId(u.abilityId));
      const inserts = d.inserts.filter((a) => picked.has(a.itemId));
      if (inserts.length) {
        const ids = await tx
          .insert(t.characterAbilities)
          .values(
            inserts.map((a) => ({
              characterId,
              kind: a.kind,
              sortOrder: a.sortOrder,
              isEnhanced: a.isEnhanced,
              icon: a.icon,
              parameters: a.parameters,
            })),
          )
          .returning({ id: t.characterAbilities.id });
        await tx
          .insert(t.characterAbilityI18n)
          .values(inserts.map((a, i) => ({ ...a.i18n, abilityId: ids[i]!.id })));
      }
      for (const u of d.flagUpdates)
        await tx
          .update(t.characterAbilities)
          .set({ isEnhanced: u.isEnhanced })
          .where(byId(u.abilityId));
      for (const u of d.iconUpdates)
        await tx.update(t.characterAbilities).set({ icon: u.icon }).where(byId(u.abilityId));
      for (const u of d.labelUpdates)
        await tx
          .update(t.characterAbilityI18n)
          .set({ labels: u.labels })
          .where(
            sql`${t.characterAbilityI18n.abilityId} = ${u.abilityId} and ${t.characterAbilityI18n.locale} = ${LOCALE}`,
          );
      if (d.enhancedIn !== undefined)
        await tx
          .update(t.characters)
          .set({ enhancedIn: d.enhancedIn })
          .where(sql`${t.characters.id} = ${characterId}`);
      const effects = d.effects.filter((e) => picked.has(e.itemId));
      if (effects.length || d.aliases.length) {
        const glossary: Glossary = {
          ...d.glossary,
          relatedEffects: {
            ...d.glossary.relatedEffects,
            ...Object.fromEntries(effects.map((e) => [e.name, e.text])),
          },
        };
        for (const a of d.aliases) glossary[a.key] = { ...glossary[a.key], [a.keyword]: a.target };
        await tx
          .update(t.characterI18n)
          .set({ glossary })
          .where(
            sql`${t.characterI18n.characterId} = ${characterId} and ${t.characterI18n.locale} = ${LOCALE}`,
          );
      }
    },
    // 新增技能與更新後的圖示
    ({ data: d }, picked) =>
      [
        ...d.inserts.filter((a) => picked.has(a.itemId)).map((a) => a.icon),
        ...d.iconUpdates.map((u) => u.icon),
      ].flatMap((icon) => (icon ? [skillAsset(icon)] : [])),
  );
}

// ---------- 補上資料庫缺少的內容（--fill-missing） ----------

const isEmptyValue = (v: unknown) =>
  v === null ||
  v === undefined ||
  v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** 拿掉物件中空的值，讓「沒有這個 key」與「空值」視為相同 */
function pruneEmpty(v: unknown): unknown {
  if (isEmptyValue(v)) return null;
  if (Array.isArray(v)) return v.map(pruneEmpty);
  if (!isPlainObject(v)) return v;
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v)) if (!isEmptyValue(x)) out[k] = pruneEmpty(x);
  return isEmptyValue(out) ? null : out;
}

/** 以 generated 補上 current 中空的部分，有值的不動；陣列長度相同時逐項補，長度不同時整個不動 */
function fillEmpty(current: unknown, generated: unknown): unknown {
  if (isEmptyValue(current)) return isEmptyValue(generated) ? current : generated;
  if (Array.isArray(current) && Array.isArray(generated))
    return current.length === generated.length
      ? current.map((v, i) => fillEmpty(v, generated[i]))
      : current;
  if (isPlainObject(current) && isPlainObject(generated)) {
    const out = { ...current };
    for (const [k, v] of Object.entries(generated)) {
      const filled = fillEmpty(out[k], v);
      if (filled !== undefined) out[k] = filled;
    }
    return out;
  }
  return current;
}

/**
 * 逐欄補空值
 * @param current 資料庫的列（已轉成 camelCase）
 * @param generated 產生的資料；只處理 current 也有的欄位
 * @returns 要更新的欄位（傳給 update().set()），補上的內容與仍然不同的地方記錄到 log
 */
function fillColumns(
  label: string,
  current: Record<string, unknown>,
  generated: Record<string, unknown>,
  log: { filled: string[]; differs: string[] },
) {
  const plain = plainJson(generated) as Record<string, unknown>;
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(plain)) {
    if (!(k in current)) continue;
    const merged = fillEmpty(current[k], v);
    if (canonicalJson(merged) !== canonicalJson(current[k])) {
      // 整欄是空的直接用產生的值（保留 Date 等型別），否則用合併後的 JSON
      set[k] = isEmptyValue(current[k]) ? generated[k] : merged;
      deepDiff(`${label}.${k}`, current[k], merged, log.filled);
    }
    const lines: string[] = [];
    deepDiff(`${label}.${k}`, pruneEmpty(merged), pruneEmpty(v), lines);
    log.differs.push(...significantDiffs(lines).map((l) => l.split("\n")[0]!));
  }
  return set;
}

/**
 * 依目前的轉換規則重新產生既有的角色、武器、聖遺物，只補上資料庫中空的欄位（NULL、空字串、空陣列、空物件）
 * 與缺少的整筆資料（素材、衣裝、聖遺物部位、技能的細節）；有值但內容不同的地方只列出，不更新
 */
async function fillMissing(
  only: Set<string>,
  slugs: string[] | undefined,
  build: Builders,
  dryRun: boolean,
  endpoint: string,
) {
  const pick = (list: Record<string, unknown>[]) =>
    list.filter((r) => !slugs || slugs.includes(r.slug as string));
  const targets = {
    characters: only.has("characters")
      ? pick(await rows(sql`select * from characters order by game_id, slug`))
      : [],
    weapons: only.has("weapons") ? pick(await rows(sql`select * from weapons order by id`)) : [],
    artifacts: only.has("artifacts")
      ? pick(await rows(sql`select * from artifact_sets order by id`))
      : [],
  };
  const total = Object.values(targets).reduce((n, list) => n + list.length, 0);

  type Update = { table: any; set: Record<string, unknown>; where: ReturnType<typeof sql> };
  type Insert = { table: any; values: Record<string, unknown>[] };
  const plans: {
    slug: string;
    filled: string[];
    differs: string[];
    updates: Update[];
    inserts: Insert[];
  }[] = [];
  const materialIds = new Set<number>();
  const versions = new Set<string>();
  const noteVersion = (v: unknown) => typeof v === "string" && versions.add(v);
  const key = (...parts: unknown[]) => parts.join("|");
  let done = 0;
  const progress = (slug: string) =>
    process.stdout.write(`\r  ${++done}/${total} ${slug.padEnd(40)}`);

  for (const ch of targets.characters) {
    const slug = ch.slug as string;
    progress(slug);
    const id = ch.id as number;
    const c = await build.character(slug, ch.game_id as number);
    const log = { filled: [] as string[], differs: [] as string[] };
    const updates: Update[] = [];
    const inserts: Insert[] = [];
    const byCharacter = sql`character_id = ${id} and locale = ${LOCALE}`;

    const rowSet = fillColumns("row", normalizeRow(ch, false), c.row, log);
    if (Object.keys(rowSet).length)
      updates.push({ table: t.characters, set: rowSet, where: sql`id = ${id}` });
    noteVersion(rowSet.releasedIn);
    noteVersion(rowSet.enhancedIn);
    const [i18n] = await rows(sql`select * from character_i18n where ${byCharacter}`);
    const i18nSet = fillColumns("i18n", normalizeRow(i18n!, false), c.i18n, log);
    if (Object.keys(i18nSet).length)
      updates.push({ table: t.characterI18n, set: i18nSet, where: byCharacter });
    const [lore] = await rows(sql`select * from character_lore where ${byCharacter}`);
    // 語音依對應逐條補（解鎖條件等）；新語音交給 --sync-voicelines（需要決定插入的位置）
    const voicelines = alignVoicelines((lore!.voicelines ?? []) as Voiceline[], c.lore.voicelines);
    if (voicelines.added)
      log.differs.push(
        `lore.voicelines：${voicelines.added} 條新語音，請用 --sync-voicelines 補上`,
      );
    const loreSet = fillColumns(
      "lore",
      normalizeRow(lore!, false),
      { ...c.lore, voicelines: voicelines.aligned },
      log,
    );
    if (Object.keys(loreSet).length)
      updates.push({ table: t.characterLore, set: loreSet, where: byCharacter });

    // 技能：只補既有技能的空欄位；缺少整個技能時交給 --sync-abilities（需要調整排序等）
    const abilities = new Map(
      (
        await rows(sql`
          select a.*, i.name, i.description, i.labels from character_abilities a
          join character_ability_i18n i on i.ability_id = a.id and i.locale = ${LOCALE}
          where a.character_id = ${id}`)
      ).map((a) => [key(a.kind, a.sort_order, a.is_enhanced), a]),
    );
    for (const a of c.abilities) {
      const label = `abilities.${a.kind}[${a.sortOrder}]${a.isEnhanced ? "［加強］" : ""}`;
      const row = abilities.get(key(a.kind, a.sortOrder, a.isEnhanced));
      if (!row) {
        log.differs.push(`${label}：資料庫沒有「${a.i18n.name}」，請用 --sync-abilities 補上`);
        continue;
      }
      if (row.name !== a.i18n.name) {
        log.differs.push(
          `${label}：名稱不同（資料庫「${row.name}」／產生「${a.i18n.name}」），略過`,
        );
        continue;
      }
      const abilitySet = fillColumns(
        label,
        { icon: row.icon, parameters: row.parameters },
        { icon: a.icon, parameters: a.parameters },
        log,
      );
      if (Object.keys(abilitySet).length)
        updates.push({ table: t.characterAbilities, set: abilitySet, where: sql`id = ${row.id}` });
      const abilityI18nSet = fillColumns(
        label,
        { description: row.description, labels: row.labels },
        { description: a.i18n.description, labels: a.i18n.labels },
        log,
      );
      if (Object.keys(abilityI18nSet).length)
        updates.push({
          table: t.characterAbilityI18n,
          set: abilityI18nSet,
          where: sql`ability_id = ${row.id} and locale = ${LOCALE}`,
        });
    }

    // 素材：缺少的 (kind, stage, materialId) 新增，數量不同只列出
    const costs = new Map(
      (await rows(sql`select * from character_costs where character_id = ${id}`)).map((r) => [
        key(r.kind, r.stage, r.material_id),
        r,
      ]),
    );
    const missingCosts = c.costs.filter((m) => {
      const row = costs.get(key(m.kind, m.stage, m.materialId));
      if (row && row.count !== m.count)
        log.differs.push(
          `costs.${m.kind}[${m.stage}].${m.materialId}：數量 ${row.count}／${m.count}`,
        );
      return !row;
    });
    if (missingCosts.length) {
      inserts.push({
        table: t.characterCosts,
        values: missingCosts.map((m) => ({ ...m, characterId: id })),
      });
      for (const m of missingCosts) {
        materialIds.add(m.materialId);
        log.filled.push(`costs.${m.kind}[${m.stage}]：新增 ${m.materialId} ×${m.count}`);
      }
    }

    // 衣裝：新衣裝交給 --sync-outfits（可個別挑選），這裡只提示
    const outfitIds = new Set(
      (await rows(sql`select outfit_id from character_outfits where character_id = ${id}`)).map(
        (r) => r.outfit_id,
      ),
    );
    for (const o of c.outfits.filter((o) => !outfitIds.has(o.outfitId)))
      log.differs.push(`outfits：資料庫沒有 ${o.outfitId}「${o.name}」，請用 --sync-outfits 補上`);
    plans.push({ slug, ...log, updates, inserts });
  }

  for (const w of targets.weapons) {
    const slug = w.slug as string;
    progress(slug);
    const id = w.id as number;
    const built = await build.weapon(slug, id);
    const log = { filled: [] as string[], differs: [] as string[] };
    const updates: Update[] = [];
    const inserts: Insert[] = [];
    const rowSet = fillColumns("row", normalizeRow(w, true), built.row, log);
    if (Object.keys(rowSet).length)
      updates.push({ table: t.weapons, set: rowSet, where: sql`id = ${id}` });
    noteVersion(rowSet.releasedIn);
    const byWeapon = sql`weapon_id = ${id} and locale = ${LOCALE}`;
    const [i18n] = await rows(sql`select * from weapon_i18n where ${byWeapon}`);
    const i18nSet = fillColumns("i18n", normalizeRow(i18n!, false), built.i18n, log);
    if (Object.keys(i18nSet).length)
      updates.push({ table: t.weaponI18n, set: i18nSet, where: byWeapon });
    const costs = new Map(
      (await rows(sql`select * from weapon_costs where weapon_id = ${id}`)).map((r) => [
        key(r.stage, r.material_id),
        r,
      ]),
    );
    const missingCosts = built.costs.filter((m) => {
      const row = costs.get(key(m.stage, m.materialId));
      if (row && row.count !== m.count)
        log.differs.push(`costs[${m.stage}].${m.materialId}：數量 ${row.count}／${m.count}`);
      return !row;
    });
    if (missingCosts.length) {
      inserts.push({
        table: t.weaponCosts,
        values: missingCosts.map((m) => ({ ...m, weaponId: id })),
      });
      for (const m of missingCosts) {
        materialIds.add(m.materialId);
        log.filled.push(`costs[${m.stage}]：新增 ${m.materialId} ×${m.count}`);
      }
    }
    plans.push({ slug, ...log, updates, inserts });
  }

  for (const s of targets.artifacts) {
    const slug = s.slug as string;
    progress(slug);
    const id = s.id as number;
    const built = await build.artifact(slug, id);
    const log = { filled: [] as string[], differs: [] as string[] };
    const updates: Update[] = [];
    const inserts: Insert[] = [];
    const rowSet = fillColumns("row", normalizeRow(s, true), built.row, log);
    if (Object.keys(rowSet).length)
      updates.push({ table: t.artifactSets, set: rowSet, where: sql`id = ${id}` });
    noteVersion(rowSet.releasedIn);
    const bySet = sql`set_id = ${id} and locale = ${LOCALE}`;
    const [i18n] = await rows(sql`select * from artifact_set_i18n where ${bySet}`);
    const i18nSet = fillColumns("i18n", normalizeRow(i18n!, false), built.i18n, log);
    if (Object.keys(i18nSet).length)
      updates.push({ table: t.artifactSetI18n, set: i18nSet, where: bySet });
    const pieces = new Map(
      (
        await rows(sql`
          select p.slot, p.icon, i.name, i.description, i.story from artifact_pieces p
          left join artifact_piece_i18n i on i.set_id = p.set_id and i.slot = p.slot and i.locale = ${LOCALE}
          where p.set_id = ${id}`)
      ).map((p) => [p.slot, p]),
    );
    for (const p of built.pieces) {
      const row = pieces.get(p.slot);
      const bySlot = sql`set_id = ${id} and slot = ${p.slot}`;
      if (!row) {
        inserts.push(
          { table: t.artifactPieces, values: [{ setId: id, slot: p.slot, icon: p.icon }] },
          { table: t.artifactPieceI18n, values: [{ ...p.i18n, setId: id, slot: p.slot }] },
        );
        log.filled.push(`pieces.${p.slot}：新增「${p.i18n.name}」`);
        continue;
      }
      const pieceSet = fillColumns(`pieces.${p.slot}`, { icon: row.icon }, { icon: p.icon }, log);
      if (Object.keys(pieceSet).length)
        updates.push({ table: t.artifactPieces, set: pieceSet, where: bySlot });
      if (row.name === null) {
        inserts.push({
          table: t.artifactPieceI18n,
          values: [{ ...p.i18n, setId: id, slot: p.slot }],
        });
        log.filled.push(`pieces.${p.slot}.i18n：新增「${p.i18n.name}」`);
        continue;
      }
      const { locale: _, ...pieceI18n } = p.i18n;
      const pieceI18nSet = fillColumns(
        `pieces.${p.slot}`,
        { name: row.name, description: row.description, story: row.story },
        pieceI18n,
        log,
      );
      if (Object.keys(pieceI18nSet).length)
        updates.push({
          table: t.artifactPieceI18n,
          set: pieceI18nSet,
          where: sql`${bySlot} and locale = ${LOCALE}`,
        });
    }
    plans.push({ slug, ...log, updates, inserts });
  }
  if (total) process.stdout.write("\n");

  // 新增的素材用到、但資料庫還沒有的素材
  const knownMaterials = materialIds.size
    ? new Set(
        (
          await db
            .select({ id: t.materials.id })
            .from(t.materials)
            .where(inArray(t.materials.id, [...materialIds]))
        ).map((m) => m.id),
      )
    : new Set<number>();
  const material = buildMaterial();
  const materials: Awaited<ReturnType<typeof material>>[] = [];
  // 依序產生：Yatta 的請求之間有間隔
  for (const id of [...materialIds].filter((id) => !knownMaterials.has(id)))
    materials.push(await material(id));

  const changed = plans.filter((p) => p.updates.length || p.inserts.length);
  console.log(`檢查 ${total} 筆，需要補的 ${changed.length} 筆：`);
  for (const p of changed) {
    console.log(`\n== ${p.slug}`);
    for (const line of p.filled) console.log(`  ${line}`);
  }
  if (materials.length)
    console.log(
      `\n新增素材 ${materials.length} 種：${materials.map((m) => m.i18n[0]!.name).join("、")}`,
    );
  const differs = plans.filter((p) => p.differs.length);
  if (differs.length) {
    console.log(`\n有值但與產生的不同（不更新，詳細內容請用 --compare）：`);
    for (const p of differs) {
      console.log(`  ${p.slug}`);
      for (const line of p.differs) console.log(`    ${line}`);
    }
  }

  try {
    await db.transaction(async (tx) => {
      if (versions.size)
        await tx
          .insert(t.gameVersions)
          .values([...versions].map(versionRow))
          .onConflictDoNothing();
      if (materials.length) {
        await tx.insert(t.materials).values(materials.map((m) => m.row));
        await tx.insert(t.materialI18n).values(materials.flatMap((m) => m.i18n));
      }
      for (const p of changed) {
        for (const i of p.inserts) await tx.insert(i.table).values(i.values);
        for (const u of p.updates) await tx.update(u.table).set(u.set).where(u.where);
      }
      if (dryRun) tx.rollback();
    });
    console.log(`\n已更新 ${endpoint}`);
    if (materials.length) {
      console.log("\n下載新素材的圖示：");
      await downloadAssets(materials.map((m) => itemAsset(m.row.icon)));
    }
  } catch (error) {
    if (!(dryRun && error instanceof TransactionRollbackError)) throw error;
    console.log("\n--dry-run：已 ROLLBACK，資料庫沒有任何變動");
  }
}

// ---------- 下載圖片（--download-images，匯入或同步新內容時也會自動下載） ----------

/** 一張圖片：R2 上的路徑與 lunaris 上的路徑（皆不含 .webp）；R2 的檔名可能與遊戲內部名稱不同 */
type ImageAsset = { target: string; source: string };

/** 角色或衣裝的頭像與立繪（衣裝立繪是 UI_Costume_*，放在 lunaris 的 costume/） */
function portraitAssets(raw: CharacterImages): ImageAsset[] {
  const r2 = r2Images(raw);
  return [
    { target: `avatar-icon/${r2.icon}`, source: `avataricon/${raw.icon}` },
    {
      target: `avatar-img/${r2.gacha}`,
      source: `${raw.gacha.startsWith("UI_Costume_") ? "costume" : "gachaimg"}/${raw.gacha}`,
    },
  ];
}
const skillAsset = (icon: string): ImageAsset => ({
  target: `skill-icon/${icon}`,
  source: `skills/${icon}`,
});
const itemAsset = (icon: string): ImageAsset => ({
  target: `item-icon/${icon}`,
  source: `items/${icon}`,
});
/** 武器的圖示與立繪在 R2 都放在 weapon-icon/ */
const weaponAssets = (images: CharacterImages): ImageAsset[] => [
  { target: `weapon-icon/${images.icon}`, source: `weaponicon/${images.icon}` },
  { target: `weapon-icon/${images.gacha}`, source: `weapongacha/${images.gacha}` },
];
const relicAsset = (icon: string): ImageAsset => ({
  target: `relic-icon/${icon}`,
  source: `artifacts/${icon}`,
});

/** R2 還沒有、本機也還沒有的圖片，從 lunaris 下載到 ASSET_DIR/<R2 路徑>.webp（不寫入資料庫） */
async function downloadAssets(assets: ImageAsset[]) {
  const unique = [...new Map(assets.map((a) => [a.target, a])).values()];
  const missing: ImageAsset[] = [];
  // 每次 8 個平行確認 R2 上是否已有
  for (let i = 0; i < unique.length; i += 8) {
    process.stdout.write(`\r  檢查 R2 ${Math.min(i + 8, unique.length)}/${unique.length}`);
    const batch = unique.slice(i, i + 8);
    const res = await Promise.all(
      batch.map((a) => fetch(`${R2_URL}/${a.target}.webp`, { method: "HEAD" })),
    );
    missing.push(...batch.filter((_, j) => !res[j]!.ok));
  }
  if (unique.length) process.stdout.write("\n");
  const file = (a: ImageAsset) => path.join(ASSET_DIR, `${a.target}.webp`);
  const todo = missing.filter((a) => !fs.existsSync(file(a)));
  console.log(
    `圖片 ${unique.length} 張，R2 還沒有 ${missing.length} 張（本機已有 ${missing.length - todo.length} 張，下載 ${todo.length} 張）`,
  );
  const failed: string[] = [];
  for (const [i, a] of todo.entries()) {
    process.stdout.write(`\r  ${i + 1}/${todo.length} ${a.target.padEnd(60)}`);
    const res = await fetch(`${LUNARIS_URL}/${a.source}.webp`);
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
      fs.mkdirSync(path.dirname(file(a)), { recursive: true });
      fs.writeFileSync(file(a), Buffer.from(await res.arrayBuffer()));
    } else failed.push(`${a.target} ← ${a.source}（HTTP ${res.status}）`);
    // 間隔 0.3 秒，避免造成對方負擔
    await new Promise((r) => setTimeout(r, 300));
  }
  if (todo.length) process.stdout.write("\n");
  if (missing.length) {
    const dirs = [...new Set(missing.map((a) => a.target.split("/")[0]))];
    console.log(`要上傳到 R2 的圖片在 ${ASSET_DIR} 的 ${dirs.join("、")}`);
  }
  if (failed.length) console.log(`下載失敗 ${failed.length} 張：\n  ${failed.join("\n  ")}`);
}

/**
 * 檢查資料庫中既有項目的圖片，R2 還沒有的下載下來
 * characters 包含衣裝與技能圖示；指定 --slugs 時不檢查素材（素材沒有 slug）
 */
async function downloadImages(only: Set<string>, slugs: string[] | undefined, build: Builders) {
  const pick = (list: Record<string, unknown>[]) =>
    list.filter((r) => !slugs || slugs.includes(r.slug as string));
  const assets: ImageAsset[] = [];
  if (only.has("characters")) {
    // 角色要重新產生，才能取得遊戲內部的原始檔名（lunaris 用的名稱）
    const characters = pick(await rows(sql`select slug, game_id from characters order by game_id`));
    for (const [i, ch] of characters.entries()) {
      process.stdout.write(`\r  ${i + 1}/${characters.length} ${(ch.slug as string).padEnd(40)}`);
      assets.push(...(await build.character(ch.slug as string, ch.game_id as number)).assets);
    }
    if (characters.length) process.stdout.write("\n");
  }
  if (only.has("weapons"))
    for (const w of pick(await rows(sql`select slug, images from weapons`)))
      assets.push(...weaponAssets(w.images as CharacterImages));
  if (only.has("artifacts"))
    for (const p of pick(
      await rows(
        sql`select s.slug, p.icon from artifact_pieces p join artifact_sets s on s.id = p.set_id`,
      ),
    ))
      assets.push(relicAsset(p.icon as string));
  if (only.has("materials") && !slugs)
    for (const m of await rows(sql`select icon from materials`))
      assets.push(itemAsset(m.icon as string));
  await downloadAssets(assets);
}

// ---------- 主流程 ----------

type Builders = {
  character: ReturnType<typeof buildCharacterFactory>;
  weapon: ReturnType<typeof buildWeaponFactory>;
  artifact: ReturnType<typeof buildArtifactFactory>;
};

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) return console.log(HELP);
  const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const list = (name: string) => arg(name)?.split(",").filter(Boolean);
  refreshYatta = args.includes("--refresh");

  const build: Builders = {
    character: buildCharacterFactory(),
    weapon: buildWeaponFactory(),
    artifact: buildArtifactFactory(),
  };

  const compareSlugs = list("compare");
  if (compareSlugs?.includes("all"))
    return compareAll(new Set(list("only") ?? ["characters", "weapons", "artifacts"]), build);
  if (compareSlugs) return compare(compareSlugs, build);
  if (args.includes("--download-images"))
    return downloadImages(
      new Set(list("only") ?? ["characters", "weapons", "artifacts", "materials"]),
      list("slugs"),
      build,
    );

  const dryRun = args.includes("--dry-run");
  const confirm = arg("confirm");
  const endpoint = new URL(process.env.DATABASE_URL!).hostname.split(".")[0]!;
  const confirmError = new Error(
    `目標是 ${endpoint}。確認無誤後加上 --confirm=${endpoint} 再執行（--help 查看所有指令）`,
  );

  // 同步指令沒有 --confirm 時只檢查、不寫入
  const sync = {
    voicelines: syncVoicelines,
    stories: syncStories,
    lore: syncLore,
    abilities: syncAbilities,
    outfits: syncOutfits,
  };
  const syncMode = (Object.keys(sync) as (keyof typeof sync)[]).find((m) =>
    args.includes(`--sync-${m}`),
  );
  if (syncMode) {
    if (confirm !== undefined && confirm !== endpoint) throw confirmError;
    return sync[syncMode](
      { slugs: list("slugs"), pick: arg("pick"), write: confirm === endpoint, dryRun, endpoint },
      build,
    );
  }

  if (confirm !== endpoint) throw confirmError;
  const only = new Set(list("only") ?? ["characters", "weapons", "artifacts"]);
  const slugFilter = list("slugs");
  if (args.includes("--fill-missing"))
    return fillMissing(only, slugFilter, build, dryRun, endpoint);

  // ---------- 1. 找出缺少的項目 ----------

  const existing = async (table: "characters" | "weapons" | "artifact_sets") =>
    new Set(
      (await rows(sql`select slug from ${sql.identifier(table)}`)).map((r) => r.slug as string),
    );
  const pick = <T extends { slug: string }>(items: T[], have: Set<string>) =>
    items.filter((x) => !have.has(x.slug) && (!slugFilter || slugFilter.includes(x.slug)));

  const all = gdbTargets();
  const targets = {
    characters: only.has("characters") ? pick(all.characters, await existing("characters")) : [],
    weapons: only.has("weapons") ? pick(all.weapons, await existing("weapons")) : [],
    artifacts: only.has("artifacts") ? pick(all.artifacts, await existing("artifact_sets")) : [],
  };
  console.log(
    `目標：角色 ${targets.characters.length}、武器 ${targets.weapons.length}、聖遺物 ${targets.artifacts.length}`,
  );
  for (const [name, items] of Object.entries(targets))
    if (items.length) console.log(`  ${name.padEnd(10)} ${items.map((x) => x.slug).join(", ")}`);
  // 指定了但沒有成為目標的 slug（已在資料庫、拼錯或被 --only 排除）
  const ignored = slugFilter?.filter(
    (s) => !Object.values(targets).some((items) => items.some((x) => x.slug === s)),
  );
  if (ignored?.length)
    console.log(`  已忽略：${ignored.join(", ")}（已在資料庫、拼錯或被 --only 排除）`);

  // ---------- 2. 產生與驗證（還沒有任何寫入） ----------

  const skipped: string[] = [];
  async function buildAll<T>(
    items: { slug: string; id: number }[],
    fn: (slug: string, id: number) => Promise<T>,
  ) {
    const out: T[] = [];
    for (const [i, item] of items.entries()) {
      process.stdout.write(`\r  ${i + 1}/${items.length} ${item.slug}`.padEnd(60));
      try {
        out.push(await fn(item.slug, item.id));
      } catch (error) {
        if (!(error instanceof SkipError))
          throw new Error(`${item.slug}：${(error as Error).message}`, { cause: error });
        skipped.push(`${item.slug}：${error.message}`);
      }
    }
    if (items.length) process.stdout.write("\n");
    return out;
  }
  const characters: BuiltCharacter[] = await buildAll(targets.characters, build.character);
  const weapons: BuiltWeapon[] = await buildAll(targets.weapons, build.weapon);
  const artifacts: BuiltArtifact[] = await buildAll(targets.artifacts, build.artifact);
  if (skipped.length) console.log(`略過 ${skipped.length} 筆：\n  ${skipped.join("\n  ")}`);

  // 素材：資料庫沒有的，從 genshin-db 補上
  const materialIds = [
    ...new Set(
      [...characters.flatMap((c) => c.costs), ...weapons.flatMap((w) => w.costs)].map(
        (m) => m.materialId,
      ),
    ),
  ];
  const knownMaterials = materialIds.length
    ? new Set(
        (
          await db
            .select({ id: t.materials.id })
            .from(t.materials)
            .where(inArray(t.materials.id, materialIds))
        ).map((m) => m.id),
      )
    : new Set<number>();
  const material = buildMaterial();
  const materials: Awaited<ReturnType<typeof material>>[] = [];
  // 依序產生：Yatta 的請求之間有間隔
  for (const id of materialIds.filter((id) => !knownMaterials.has(id)))
    materials.push(await material(id));

  // glossary 的 linkTo* 別名：補上前端對不到的 {LINK} 關鍵字
  const aliasLines: string[] = [];
  for (const c of characters) {
    const r = inferLinkAliases(c.i18n.glossary, c.abilities);
    c.i18n.glossary = GlossarySchema.parse(r.glossary);
    for (const a of r.added) aliasLines.push(`${c.row.slug} ${a.key}: ${a.keyword} → ${a.target}`);
    for (const s of r.skipped) aliasLines.push(`${c.row.slug} 不處理：${s}（請手動補）`);
  }
  if (aliasLines.length) console.log(`\nlinkTo* 別名：\n  ${aliasLines.join("\n  ")}`);

  // 版本：缺少的才新增
  const versions = new Set<string>();
  for (const c of characters) {
    versions.add(c.row.releasedIn);
    if (c.row.enhancedIn) versions.add(c.row.enhancedIn);
    for (const o of c.outfits) if (o.releasedIn) versions.add(o.releasedIn);
  }
  for (const w of weapons) versions.add(w.row.releasedIn);
  for (const a of artifacts) versions.add(a.row.releasedIn);
  const versionRows = [...versions].map(versionRow);

  // 衣裝依 (id, variant) 去重複；已存在的不覆寫，但內容不同時提出警告
  const outfitMap = new Map<string, BuiltCharacter["outfits"][number]>();
  for (const c of characters) {
    for (const o of c.outfits) {
      const key = `${o.outfitId}|${o.variant}`;
      const prev = outfitMap.get(key);
      const { isDefault: _a, ...content } = o;
      if (prev) {
        const { isDefault: _b, ...prevContent } = prev;
        if (JSON.stringify(prevContent) !== JSON.stringify(content))
          throw new Error(`衣裝 ${key} 在不同角色的內容不一致（${c.row.slug}）`);
      }
      outfitMap.set(key, o);
    }
  }
  const outfitList = [...outfitMap.values()];
  if (outfitList.length) {
    const current = await rows(sql`
      select o.id, o.variant, o.images, o.released_in, oi.name, oi.description from outfits o
      join outfit_i18n oi on oi.outfit_id = o.id and oi.variant = o.variant and oi.locale = ${LOCALE}`);
    for (const r of current) {
      const o = outfitMap.get(`${r.id}|${r.variant}`);
      if (!o) continue;
      const db_ = {
        images: r.images,
        releasedIn: r.released_in,
        name: r.name,
        description: r.description,
      };
      const gen = {
        images: o.images,
        releasedIn: o.releasedIn,
        name: o.name,
        description: o.description,
      };
      if (JSON.stringify(db_) !== JSON.stringify(gen))
        console.warn(`警告：衣裝 ${r.id}|${r.variant} 已存在但內容不同，保留資料庫的版本`);
    }
  }

  // ---------- 3. 寫入（單一交易） ----------

  const counts: Record<string, number> = {};
  const count = (table: Parameters<typeof getTableName>[0], n: number) => {
    const name = getTableName(table);
    counts[name] = (counts[name] ?? 0) + n;
  };

  try {
    await db.transaction(async (tx) => {
      if (versionRows.length) {
        const inserted = await tx
          .insert(t.gameVersions)
          .values(versionRows)
          .onConflictDoNothing()
          .returning();
        count(t.gameVersions, inserted.length);
      }

      if (materials.length) {
        await tx.insert(t.materials).values(materials.map((m) => m.row));
        await tx.insert(t.materialI18n).values(materials.flatMap((m) => m.i18n));
        count(t.materials, materials.length);
        count(t.materialI18n, materials.length * 2);
      }

      if (outfitList.length) {
        const inserted = await tx
          .insert(t.outfits)
          .values(
            outfitList.map((o) => ({
              id: o.outfitId,
              variant: o.variant,
              images: o.images,
              releasedIn: o.releasedIn,
            })),
          )
          .onConflictDoNothing()
          .returning();
        count(t.outfits, inserted.length);
        const insertedI18n = await tx
          .insert(t.outfitI18n)
          .values(
            outfitList.map((o) => ({
              outfitId: o.outfitId,
              variant: o.variant,
              locale: LOCALE,
              name: o.name,
              description: o.description,
            })),
          )
          .onConflictDoNothing()
          .returning();
        count(t.outfitI18n, insertedI18n.length);
      }

      for (const c of characters) {
        const [inserted] = await tx
          .insert(t.characters)
          .values(c.row)
          .returning({ id: t.characters.id });
        const characterId = inserted!.id;
        await tx.insert(t.characterI18n).values({ ...c.i18n, characterId });
        await tx.insert(t.characterLore).values({ ...c.lore, characterId });
        // 多筆 VALUES 的 RETURNING 依插入順序回傳
        const abilityIds = await tx
          .insert(t.characterAbilities)
          .values(
            c.abilities.map((a) => ({
              characterId,
              kind: a.kind,
              sortOrder: a.sortOrder,
              isEnhanced: a.isEnhanced,
              icon: a.icon,
              parameters: a.parameters,
            })),
          )
          .returning({ id: t.characterAbilities.id });
        await tx
          .insert(t.characterAbilityI18n)
          .values(c.abilities.map((a, i) => ({ ...a.i18n, abilityId: abilityIds[i]!.id })));
        await tx.insert(t.characterCosts).values(c.costs.map((m) => ({ ...m, characterId })));
        await tx.insert(t.characterOutfits).values(
          c.outfits.map((o) => ({
            characterId,
            outfitId: o.outfitId,
            variant: o.variant,
            isDefault: o.isDefault,
          })),
        );
        count(t.characters, 1);
        count(t.characterI18n, 1);
        count(t.characterLore, 1);
        count(t.characterAbilities, c.abilities.length);
        count(t.characterAbilityI18n, c.abilities.length);
        count(t.characterCosts, c.costs.length);
        count(t.characterOutfits, c.outfits.length);
      }

      if (weapons.length) {
        await tx.insert(t.weapons).values(weapons.map((w) => w.row));
        await tx
          .insert(t.weaponI18n)
          .values(weapons.map((w) => ({ ...w.i18n, weaponId: w.row.id })));
        const costRows = weapons.flatMap((w) => w.costs.map((m) => ({ ...m, weaponId: w.row.id })));
        await tx.insert(t.weaponCosts).values(costRows);
        count(t.weapons, weapons.length);
        count(t.weaponI18n, weapons.length);
        count(t.weaponCosts, costRows.length);
      }

      if (artifacts.length) {
        await tx.insert(t.artifactSets).values(artifacts.map((a) => a.row));
        await tx
          .insert(t.artifactSetI18n)
          .values(artifacts.map((a) => ({ ...a.i18n, setId: a.row.id })));
        const pieces = artifacts.flatMap((a) => a.pieces.map((p) => ({ ...p, setId: a.row.id })));
        await tx
          .insert(t.artifactPieces)
          .values(pieces.map((p) => ({ setId: p.setId, slot: p.slot, icon: p.icon })));
        await tx
          .insert(t.artifactPieceI18n)
          .values(pieces.map((p) => ({ ...p.i18n, setId: p.setId, slot: p.slot })));
        count(t.artifactSets, artifacts.length);
        count(t.artifactSetI18n, artifacts.length);
        count(t.artifactPieces, pieces.length);
        count(t.artifactPieceI18n, pieces.length);
      }

      console.log("\n新增筆數：");
      for (const [name, n] of Object.entries(counts)) console.log(`  ${name.padEnd(24)} ${n}`);

      if (dryRun) tx.rollback();
    });
    console.log(`\n已寫入 ${endpoint}`);
    const assets = [
      ...characters.flatMap((c) => c.assets),
      ...weapons.flatMap((w) => w.assets),
      ...artifacts.flatMap((a) => a.assets),
      ...materials.map((m) => itemAsset(m.row.icon)),
    ];
    if (assets.length) {
      console.log("\n下載新項目的圖片：");
      await downloadAssets(assets);
    }
  } catch (error) {
    if (!(dryRun && error instanceof TransactionRollbackError)) throw error;
    console.log("\n--dry-run：已 ROLLBACK，資料庫沒有任何變動");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
