import { useUserStore } from "@/stores/User";

const MESSAGES: Record<string, string> = {
  invalidInput: "連動設定的內容不正確，請重新設定。",
  invalidCookie: "Cookie 已失效，請重新登入 HoYoLAB 後更新連動設定。",
  notPublic: "請先到 HoYoLAB 的戰績設定開啟「即時便箋」。",
  uidMismatch: "這個 UID 不屬於目前的 HoYoLAB 帳號。",
  captcha: "HoYoLAB 要求驗證，請先到 HoYoLAB 開啟即時便箋完成驗證後再試。",
  rateLimited: "查詢次數過多，請稍後再試。",
  upstream: "暫時無法從 HoYoLAB 取得資料，請稍後再試。",
};

/** 需要時才向 HoYoLAB 查詢目前的樹脂；連動資料只存在瀏覽器，查詢時才送到伺服器轉發 */
export function useHoyolabResin() {
  const store = useUserStore();
  const loading = ref(false);
  const error = ref("");

  async function fetchResin() {
    if (!store.hoyolab || loading.value) return null;
    loading.value = true;
    error.value = "";
    try {
      const note = await $fetch("/api/hoyolab/resin", { method: "POST", body: store.hoyolab });
      return { ...note, start: resinStartTime(note.recoverySeconds) };
    } catch (e) {
      const code = (e as { data?: { data?: { code?: string } } }).data?.data?.code;
      error.value = MESSAGES[code ?? ""] ?? MESSAGES.upstream!;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { linked: computed(() => !!store.hoyolab), loading, error, fetchResin };
}
