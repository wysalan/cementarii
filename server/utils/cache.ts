import type { H3Event } from "h3";
import type { CachedEventHandlerOptions } from "nitropack/types";

/** Nitro 會刪掉 key 裡英數與底線以外的字元，`hu-tao` 與 `hutao` 會變成同一個 key；交給 Nitro 之前把這些字元換成 `_字碼_` */
export const escapeCacheKey = (key: string) =>
  key.replace(/[^a-zA-Z0-9]/g, (c) => `_${c.codePointAt(0)}_`);

export const API_CACHE = {
  maxAge: 60 * 60,
  swr: true,
  // 預設的 key 是完整網址的 hash，任意 query 都會多一筆快取；只用路徑與語系
  getKey: async (event: H3Event) =>
    escapeCacheKey(`${event.path.split("?")[0]}:${await getLocale(event)}`),
} satisfies CachedEventHandlerOptions;
