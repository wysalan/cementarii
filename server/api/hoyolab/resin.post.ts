import { z } from "zod";

const token = z
  .string()
  .max(1024)
  .regex(/^[\w\-+/=.]+$/);
const bodySchema = z.object({
  ltuid: z.string().regex(/^\d{1,20}$/),
  ltoken: token,
  ltmid: token,
  uid: z.string().regex(/^\d{9,10}$/),
});

// HoYoLAB 的 retcode → 給前端顯示訊息用的代號
const RETCODES: Record<number, { statusCode: number; code: string }> = {
  [-100]: { statusCode: 401, code: "invalidCookie" },
  10001: { statusCode: 401, code: "invalidCookie" },
  10102: { statusCode: 403, code: "notPublic" },
  10104: { statusCode: 403, code: "uidMismatch" },
  1009: { statusCode: 403, code: "uidMismatch" },
  1034: { statusCode: 429, code: "captcha" },
  10035: { statusCode: 429, code: "captcha" },
  10101: { statusCode: 429, code: "rateLimited" },
};

type DailyNote = {
  retcode: number;
  message: string;
  data: { current_resin: number; max_resin: number; resin_recovery_time: string } | null;
};

/** 代替瀏覽器向 HoYoLAB 查詢即時便箋的樹脂；cookie 只用在這次請求，不保留也不記錄 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");

  const body = await readValidatedBody(event, (data) => bodySchema.safeParse(data));
  const server = body.success ? genshinServerOf(body.data.uid) : undefined;
  if (!body.success || !server)
    throw createError({ statusCode: 400, data: { code: "invalidInput" } });
  const { ltuid, ltoken, ltmid, uid } = body.data;

  const note = await $fetch<DailyNote>(
    "https://sg-public-api.hoyolab.com/event/game_record/genshin/api/dailyNote",
    {
      query: { server, role_id: uid },
      headers: {
        cookie: `ltuid_v2=${ltuid}; ltoken_v2=${ltoken}; ltmid_v2=${ltmid}`,
        ds: generateDs(),
        "x-rpc-app_version": "1.5.0",
        "x-rpc-client_type": "5",
        "x-rpc-language": "zh-tw",
      },
      timeout: 10_000,
    },
  ).catch(() => {
    throw createError({ statusCode: 502, data: { code: "upstream" } });
  });

  if (note.retcode !== 0 || !note.data) {
    const known = RETCODES[note.retcode] ?? { statusCode: 502, code: "upstream" };
    throw createError({ ...known, data: { code: known.code, retcode: note.retcode } });
  }
  return {
    currentResin: note.data.current_resin,
    maxResin: note.data.max_resin,
    recoverySeconds: Number(note.data.resin_recovery_time),
  };
});
