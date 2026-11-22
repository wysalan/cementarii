<script setup lang="ts">
const { itemList, itemStatus, items, storageError, importError, importResult, requestImport } =
  useWishData();

const MESSAGES: Record<string, string> = {
  invalidInput: "網址的內容不正確，請重新取得祈願紀錄網址。",
  expired: "網址已經過期，請在遊戲裡重新開啟祈願紀錄後再取得一次。",
  invalidAuthkey: "網址的驗證資訊不正確，請確認貼上的是完整的網址。",
  rateLimited: "查詢次數過多，請稍後再試。",
  upstream: "暫時無法取得祈願紀錄，請稍後再試。",
};

const wishUrl = ref("");
const fetching = ref(false);
const progress = ref("");
let cancelled = false;

onMounted(() => {
  importError.value = "";
  importResult.value = "";
});
// 離開頁面就不再繼續向官方查詢
onUnmounted(() => (cancelled = true));

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const errorCode = (e: unknown) => (e as { data?: { data?: { code?: string } } }).data?.data?.code;

async function fetchFromGame() {
  if (fetching.value) return;
  importError.value = "";
  importResult.value = "";
  const params = parseWishUrl(wishUrl.value);
  if (!params) {
    importError.value = "這不是祈願紀錄的網址，網址裡要有 authkey。";
    return;
  }

  fetching.value = true;
  cancelled = false;
  progress.value = "準備中…";
  try {
    const result = await collectWishLog({
      async fetchPage(gachaType, endId) {
        // 被限流時等一下再試，最多重試兩次
        for (let attempt = 0; ; attempt++) {
          try {
            return await $fetch("/api/wish/log", {
              method: "POST",
              body: { ...params, gachaType, endId },
            });
          } catch (e) {
            if (errorCode(e) !== "rateLimited" || attempt >= 2) throw e;
            await sleep(3000);
          }
        }
      },
      knownIds: async (uid) => new Set((await getWishRecords(uid)).map((r) => r.id)),
      wait: () => sleep(400),
      onProgress(pool, count) {
        const name = WISH_POOLS.find((p) => p.key === pool)!.name;
        progress.value = `正在讀取${name}，已取得 ${count} 筆新紀錄…`;
      },
      isCancelled: () => cancelled,
    });
    if (!result) return;
    if (!result.rows.length) {
      importResult.value = "沒有新的祈願紀錄。";
      return;
    }
    const names = new Map((itemList.value ?? []).map((i) => [i.name, i]));
    const account = {
      uid: result.uid,
      timezone: result.timezone ?? wishTimezoneOf(result.uid),
      ...parseUigfList(result.rows, items.value, names),
    };
    requestImport("遊戲", [account], () => (wishUrl.value = ""));
  } catch (e) {
    // 中途失敗時整批都不匯入，避免紀錄中間缺一段
    importError.value = MESSAGES[errorCode(e) ?? ""] ?? MESSAGES.upstream!;
  } finally {
    fetching.value = false;
    progress.value = "";
  }
}
</script>

<template>
  <section class="gi-panel p-5 flex flex-col gap-3">
    <h3 class="text-xl font-semibold text-highlighted">從遊戲匯入</h3>
    <ol class="list-decimal pl-5 space-y-1">
      <li>在遊戲裡開啟祈願的「歷史紀錄」。</li>
      <li>
        使用第三方網站（例如：<a
          href="https://paimon.moe/wish/import"
          target="_blank"
          rel="noopener noreferrer"
          class="underline"
          >Paimon.moe</a
        >）提供的指令取得祈願紀錄網址。
      </li>
      <li>把網址貼到下方，開始讀取。</li>
    </ol>
    <p class="text-sm text-muted">取得網址的步驟為開發中的暫行方式，之後會改為本站自有工具。</p>
    <p class="text-sm text-muted">
      網址只用來讀取祈願紀錄，約 24
      小時後失效。讀取時會經由本站伺服器向官方查詢，伺服器不會保留網址與紀錄。
    </p>
    <p class="text-sm text-muted">
      只支援國際服（美、歐、亞、台港澳），而且只能取得遊戲仍保留的紀錄。讀取完成後會先顯示結果，確認後才會匯入。
    </p>
    <ClientOnly>
      <UFormField label="祈願紀錄網址">
        <UInput
          v-model="wishUrl"
          type="url"
          autocomplete="off"
          placeholder="https://…authkey=…"
          class="w-full"
          :disabled="fetching"
        />
      </UFormField>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="開始讀取"
          icon="i-lucide-cloud-download"
          color="primary"
          :loading="fetching"
          :disabled="!wishUrl.trim() || itemStatus !== 'success' || !!storageError"
          @click="fetchFromGame"
        />
        <UButton
          v-if="fetching"
          label="取消"
          variant="ghost"
          color="neutral"
          @click="cancelled = true"
        />
        <p v-if="progress" class="text-sm text-muted" role="status">{{ progress }}</p>
      </div>
      <p v-if="storageError" class="text-sm text-error" role="alert">{{ storageError }}</p>
      <p v-if="importError" class="text-sm text-error" role="alert">{{ importError }}</p>
      <p v-if="importResult" class="text-sm text-success" role="status">{{ importResult }}</p>
    </ClientOnly>
  </section>
</template>
