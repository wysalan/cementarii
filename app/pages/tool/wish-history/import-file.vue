<script setup lang="ts">
const { itemList, itemStatus, items, storageError, importError, importResult, requestImport } =
  useWishData();

onMounted(() => {
  importError.value = "";
  importResult.value = "";
});

const fileInput = useTemplateRef("fileInput");

const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // 清空後才能再次選擇同一個檔案
  input.value = "";
  if (!file) return;
  importError.value = "";
  importResult.value = "";

  try {
    if (file.size > MAX_FILE_SIZE) throw new Error("檔案太大，請確認選擇的是祈願紀錄檔。");
    const data: unknown = JSON.parse(await file.text());
    const list = itemList.value ?? [];
    let source: string;
    let accounts: ParsedWishAccount[];
    if (isUigf(data)) {
      source = "UIGF";
      accounts = parseUigf(data, items.value, new Map(list.map((i) => [i.name, i])));
    } else if (isPaimonBackup(data)) {
      source = "paimon.moe";
      accounts = parsePaimonBackup(data, new Map(list.map((i) => [paimonItemKey(i.slug), i])));
    } else {
      throw new Error("無法辨識檔案格式，目前支援 UIGF 與 paimon.moe 的備份檔。");
    }
    accounts = accounts.filter((a) => a.records.length || a.skipped);
    if (!accounts.some((a) => a.records.length)) throw new Error("檔案裡沒有可匯入的祈願紀錄。");
    requestImport(source, accounts);
  } catch (e) {
    importError.value =
      e instanceof SyntaxError ? "檔案不是有效的 JSON。" : (e as Error).message || "匯入失敗。";
  }
}
</script>

<template>
  <section class="gi-panel p-5 flex flex-col gap-3">
    <h3 class="text-xl font-semibold text-highlighted">從檔案匯入</h3>
    <p>支援的檔案格式：</p>
    <ul class="list-disc pl-5 space-y-1">
      <li>UIGF JSON 檔（v2.2 ～ v4.2）</li>
      <li>Paimon.moe 備份檔（設定 → 匯出及匯入資料 → 下載資料）</li>
    </ul>
    <p class="text-sm text-muted">
      檔案只在瀏覽器裡讀取，不會上傳。讀取後會先顯示每個卡池新增與已存在的筆數，確認後才會匯入。
    </p>
    <ClientOnly>
      <div>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="onFile"
        />
        <UButton
          label="選擇檔案"
          icon="i-lucide-upload"
          color="primary"
          :loading="itemStatus === 'pending'"
          :disabled="itemStatus !== 'success' || !!storageError"
          @click="fileInput?.click()"
        />
      </div>
      <p v-if="itemStatus === 'error'" class="text-sm text-error" role="alert">
        無法載入物品清單，請重新整理頁面後再試。
      </p>
      <p v-if="storageError" class="text-sm text-error" role="alert">{{ storageError }}</p>
      <p v-if="importError" class="text-sm text-error" role="alert">{{ importError }}</p>
      <p v-if="importResult" class="text-sm text-success" role="status">{{ importResult }}</p>
    </ClientOnly>
  </section>
</template>
