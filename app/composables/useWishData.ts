export type StoredWishAccount = { account: WishAccount; records: WishRecord[] };
export type PendingWishAccount = ParsedWishAccount & { uidInput: string; selected: boolean };

// 祈願紀錄頁的各個子頁共用同一份狀態。這些值只會在瀏覽器裡被寫入，伺服器算繪時永遠是初始值
const stored = shallowRef<StoredWishAccount[]>([]);
const loaded = ref(false);
const storageError = ref("");
const pending = ref<{
  source: string;
  accounts: PendingWishAccount[];
  onSaved?: () => void;
} | null>(null);
const importing = ref(false);
const importError = ref("");
const importResult = ref("");

async function reload() {
  const accounts = await listWishAccounts();
  accounts.sort((a, b) => a.uid.localeCompare(b.uid));
  stored.value = await Promise.all(
    accounts.map(async (account) => ({ account, records: await getWishRecords(account.uid) })),
  );
}

async function load() {
  if (loaded.value) return;
  try {
    await reload();
  } catch {
    storageError.value = "無法讀取瀏覽器的儲存空間，請確認沒有使用無痕模式或停用網站資料。";
  }
  loaded.value = true;
}

/** 讀取完成後開啟確認視窗，使用者確認後才寫入 */
function requestImport(source: string, accounts: ParsedWishAccount[], onSaved?: () => void) {
  pending.value = {
    source,
    onSaved,
    accounts: accounts.map((account) => ({
      ...account,
      // 紀錄可能有上萬筆，不需要追蹤裡面的變動
      records: markRaw(account.records),
      uidInput: account.uid,
      selected: account.records.length > 0,
    })),
  };
}

/** 匯入前的預覽：每個卡池會新增幾筆、有幾筆已經存在 */
function previewImport(account: PendingWishAccount) {
  const uid = account.uidInput.trim();
  const existing = stored.value.find((s) => s.account.uid === uid)?.records ?? [];
  return WISH_POOLS.map((pool) => {
    const records = account.records.filter((r) => wishPoolOf(r.gachaType) === pool.key);
    const { added, duplicated } = mergeWishRecords(uid, existing, records);
    return { ...pool, added, duplicated };
  }).filter((pool) => pool.added || pool.duplicated);
}

const selectedAccounts = computed(() => pending.value?.accounts.filter((a) => a.selected) ?? []);
const canImport = computed(
  () =>
    selectedAccounts.value.length > 0 &&
    selectedAccounts.value.every((a) => WISH_UID_PATTERN.test(a.uidInput.trim())),
);

async function confirmImport() {
  if (!pending.value || !canImport.value || importing.value) return;
  importing.value = true;
  importError.value = "";
  const { onSaved } = pending.value;
  try {
    let added = 0;
    let duplicated = 0;
    let skipped = 0;
    for (const account of selectedAccounts.value) {
      const uid = account.uidInput.trim();
      const result = mergeWishRecords(uid, await getWishRecords(uid), account.records);
      const timezone =
        stored.value.find((s) => s.account.uid === uid)?.account.timezone ?? account.timezone;
      await saveWishRecords({ uid, timezone, updatedAt: Date.now() }, result);
      added += result.added;
      duplicated += result.duplicated;
      skipped += account.skipped;
    }
    // 請瀏覽器不要在空間不足時自動清掉資料；不同意也不影響使用
    navigator.storage?.persist?.().catch(() => {});
    importResult.value =
      `匯入完成：新增 ${added} 筆` +
      (duplicated ? `，${duplicated} 筆已經存在` : "") +
      (skipped ? `，${skipped} 筆無法辨識而略過` : "") +
      "。";
    onSaved?.();
  } catch {
    importError.value = "寫入瀏覽器的儲存空間時發生錯誤。";
  } finally {
    // 視窗關閉後訊息才看得到，失敗時也一樣
    pending.value = null;
    importing.value = false;
    await reload().catch(() => {});
  }
}

async function removeAccount(uid: string) {
  await deleteWishAccount(uid);
  await reload();
}

export function useWishData() {
  // 物品清單只在瀏覽器裡用得到，不放進伺服器算繪的內容
  const { locale } = useI18n();
  const { data: itemList, status: itemStatus } = useLazyFetch("/api/wish/items", {
    key: "wish-items",
    query: { locale },
    server: false,
  });
  const items = computed(() => new Map((itemList.value ?? []).map((i) => [i.id, i])));

  return {
    stored,
    loaded,
    storageError,
    load,
    removeAccount,
    itemList,
    itemStatus,
    items,
    pending,
    importing,
    importError,
    importResult,
    canImport,
    requestImport,
    previewImport,
    confirmImport,
  };
}
