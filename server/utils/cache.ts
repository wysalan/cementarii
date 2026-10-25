import type { CachedEventHandlerOptions } from "nitropack/types";

export const API_CACHE = {
  maxAge: 60 * 60,
  swr: true,
} satisfies CachedEventHandlerOptions;
