import { z } from "zod";

const param = z
  .string()
  .regex(/^[\w-]{1,32}$/)
  .optional();
const bodySchema = z.object({
  authkey: z.string().min(1).max(4096),
  gachaType: z.enum(["100", "200", "301", "302", "500"]),
  endId: z
    .string()
    .regex(/^\d{1,19}$/)
    .default("0"),
  region: param,
  gameBiz: param,
});

// 官方的 retcode → 給前端顯示訊息用的代號
const RETCODES: Record<number, { statusCode: number; code: string }> = {
  [-101]: { statusCode: 401, code: "expired" },
  [-100]: { statusCode: 401, code: "invalidAuthkey" },
  [-110]: { statusCode: 429, code: "rateLimited" },
};

type GachaLog = {
  retcode: number;
  message: string;
  data: {
    region_time_zone?: number;
    list: Record<"id" | "uid" | "gacha_type" | "item_id" | "name" | "rank_type" | "time", string>[];
  } | null;
};

/** 代替瀏覽器向官方查詢一頁祈願紀錄；authkey 只用在這次請求，不保留也不記錄 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");

  const body = await readValidatedBody(event, (data) => bodySchema.safeParse(data));
  if (!body.success) throw createError({ statusCode: 400, data: { code: "invalidInput" } });
  const { authkey, gachaType, endId, region, gameBiz } = body.data;

  // 網址固定寫在這裡，不使用使用者貼上的網址
  const log = await $fetch<GachaLog>(
    "https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog",
    {
      query: {
        authkey_ver: 1,
        sign_type: 2,
        auth_appid: "webview_gacha",
        init_type: 301,
        lang: "zh-tw",
        authkey,
        region,
        game_biz: gameBiz,
        gacha_type: gachaType,
        page: 1,
        size: 20,
        end_id: endId,
      },
      timeout: 10_000,
    },
  ).catch(() => {
    throw createError({ statusCode: 502, data: { code: "upstream" } });
  });

  if (log.retcode !== 0 || !log.data) {
    const known = RETCODES[log.retcode] ?? { statusCode: 502, code: "upstream" };
    throw createError({ ...known, data: { code: known.code, retcode: log.retcode } });
  }
  return {
    timezone: log.data.region_time_zone ?? null,
    list: log.data.list.map((r) => ({
      id: r.id,
      uid: r.uid,
      gacha_type: r.gacha_type,
      item_id: r.item_id,
      name: r.name,
      rank_type: r.rank_type,
      time: r.time,
    })),
  };
});
