<script setup lang="ts">
import { siteConfig } from "@/site.config";

const { stored, loaded, storageError, items, removeAccount } = useWishData();

const UP_POOLS = ["character", "weapon"];
const { data: banners } = useLazyFetch("/api/wish/banners", { key: "wish-banners", server: false });

const percent = (count: number, total: number) => `${((count / total) * 100).toFixed(2)}%`;
const rate = (value: number | null) => (value === null ? "－" : `${(value * 100).toFixed(2)}%`);
const rounded = (value: number | null) => (value === null ? "－" : value.toFixed(2));

type StatGroup = {
  title: string;
  items: { label: string; value: string | number; note?: string }[];
};

function statGroups(
  pool: (typeof WISH_POOLS)[number],
  summary: ReturnType<typeof summarizeWishPool>,
): StatGroup[] {
  const hasUp = UP_POOLS.includes(pool.slug);
  const groups: StatGroup[] = [
    {
      title: "已墊抽數",
      items: pool.hardPity
        ? [
            { label: "5 星", value: summary.pity5, note: ` / ${pool.hardPity}` },
            { label: "4 星", value: summary.pity4, note: ` / ${WISH_RARE_PITY}` },
          ]
        : [],
    },
    {
      title: "平均抽數",
      items: [
        { label: "5 星", value: rounded(summary.average5) },
        { label: "4 星", value: rounded(summary.average4) },
        ...(hasUp
          ? [
              { label: "UP 5 星", value: rounded(summary.upAverage5) },
              { label: "UP 4 星", value: rounded(summary.upAverage4) },
            ]
          : []),
      ],
    },
    {
      title: "不歪率",
      items: hasUp
        ? [
            { label: "5 星", value: rate(summary.upRate5) },
            { label: "4 星", value: rate(summary.upRate4) },
          ]
        : [],
    },
    {
      title: "總獲得數量",
      items: ([5, 4, 3] as const).map((rank) => ({
        label: `${rank} 星`,
        value: summary[`rank${rank}`],
        note: `（${percent(summary[`rank${rank}`], summary.total)}）`,
      })),
    },
  ];
  return groups.filter((group) => group.items.length);
}

// 群組佔的欄數等於它的項目數，內外的欄寬與間距一致，各群組的項目才會對齊
const GROUP_SPAN: Record<number, string> = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
};
const GROUP_COLUMNS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const accounts = computed(() =>
  stored.value.map((entry) => {
    const { timezone } = entry.account;
    const versions = wishVersionStarts(banners.value ?? [], timezone);
    return {
      ...entry,
      pools: WISH_POOLS.map((pool) => {
        const records = annotateWishRecords(
          entry.records.filter((r) => wishPoolOf(r.gachaType) === pool.key),
          banners.value && UP_POOLS.includes(pool.slug)
            ? localizeWishBanners(banners.value, pool.slug, timezone)
            : undefined,
        );
        const summary = summarizeWishPool(records);
        return {
          ...pool,
          ...summary,
          groups: statGroups(pool, summary),
          hasUp: summary.fives.some((five) => five.up !== undefined),
          versions: summarizeWishVersions(records, versions),
        };
      }).filter((pool) => pool.total),
    };
  }),
);

function exportUigf(list: StoredWishAccount[]) {
  const file = buildUigf(list, items.value, { name: siteConfig.title, version: "1.0" });
  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  const name = list.length === 1 ? list[0]!.account.uid : "all";
  link.download = `cementarii-wish-${name}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const deleting = ref<StoredWishAccount | null>(null);
const deleteOpen = computed({
  get: () => !!deleting.value,
  set: (value) => {
    if (!value) deleting.value = null;
  },
});

async function confirmDelete() {
  if (!deleting.value) return;
  await removeAccount(deleting.value.account.uid);
  deleting.value = null;
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-info"
      title="紀錄只儲存在這個瀏覽器"
      description="清除瀏覽資料或更換裝置後紀錄就會消失，而且超過遊戲保留期限的紀錄無法重新取得，請定期匯出備份。"
    />
    <div v-if="!loaded" class="flex flex-col gap-5" aria-busy="true" aria-label="載入中">
      <USkeleton class="h-8 w-64" />
      <div class="gi-panel p-5 flex flex-col gap-4">
        <USkeleton class="h-6 w-40 bg-accented" />
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <USkeleton v-for="m in 7" :key="m" class="h-12 bg-accented" />
        </div>
        <USkeleton class="h-7 w-2/3 bg-accented" />
      </div>
    </div>
    <ClientOnly>
      <p v-if="storageError" class="gi-panel p-5 text-error" role="alert">{{ storageError }}</p>
      <div v-else-if="loaded && !accounts.length" class="gi-panel p-5 flex flex-col gap-3">
        <p class="text-muted">還沒有匯入任何紀錄。</p>
        <div class="flex flex-wrap gap-2">
          <UButton
            to="/tool/wish-history/import-file"
            label="從檔案匯入"
            icon="i-lucide-upload"
            color="primary"
          />
          <UButton
            to="/tool/wish-history/import-game"
            label="從遊戲匯入"
            icon="i-lucide-cloud-download"
            color="neutral"
            variant="soft"
          />
        </div>
      </div>
      <div v-if="accounts.length > 1" class="flex justify-end">
        <UButton
          label="全部匯出"
          icon="i-lucide-download"
          color="neutral"
          variant="soft"
          size="sm"
          @click="exportUigf(stored)"
        />
      </div>
      <template v-for="entry in accounts" :key="entry.account.uid">
        <div class="flex flex-wrap items-center justify-between gap-2 px-1">
          <h3 class="text-xl font-semibold text-highlighted">
            UID {{ entry.account.uid }}
            <span class="text-base font-normal text-muted"
              >（共 {{ entry.records.length }} 抽）</span
            >
          </h3>
          <div class="flex gap-2">
            <UButton
              label="匯出 UIGF"
              icon="i-lucide-download"
              color="neutral"
              variant="soft"
              size="sm"
              @click="exportUigf([entry])"
            />
            <UButton
              label="刪除"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              @click="deleting = entry"
            />
          </div>
        </div>

        <section
          v-for="pool in entry.pools"
          :key="pool.key"
          class="gi-panel p-5 flex flex-col gap-3"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <NuxtLink
              :to="`/tool/wish-history/${entry.account.uid}/${pool.slug}`"
              class="text-lg font-semibold text-highlighted hover:underline"
            >
              <h4>{{ pool.name }}</h4>
            </NuxtLink>
            <p class="text-sm text-muted tabular-nums">
              共 {{ pool.total }} 抽・{{ pool.from }} ～ {{ pool.to }}
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-x-3 gap-y-4 text-sm">
            <div
              v-for="group in pool.groups"
              :key="group.title"
              class="col-span-2 flex flex-col gap-2"
              :class="GROUP_SPAN[group.items.length]"
            >
              <h5 class="border-b border-default pb-1 font-medium text-default">
                {{ group.title }}
              </h5>
              <dl class="grid grid-cols-2 gap-3" :class="GROUP_COLUMNS[group.items.length]">
                <div v-for="item in group.items" :key="item.label">
                  <dt class="text-muted">{{ item.label }}</dt>
                  <dd class="text-lg text-highlighted tabular-nums">
                    {{ item.value }}<span class="text-sm text-muted">{{ item.note }}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <ToolWishPoolRecords
            :fives="pool.fives"
            :versions="pool.versions"
            :items="items"
            :has-up="pool.hasUp"
            :weapon="pool.slug === 'weapon'"
          />
        </section>
      </template>
    </ClientOnly>

    <UModal v-model:open="deleteOpen" title="刪除祈願紀錄" :ui="{ content: 'max-w-md' }">
      <template #body>
        <p>
          確定要刪除 UID {{ deleting?.account.uid }} 的
          {{ deleting?.records.length }} 筆紀錄嗎？刪除後無法復原，建議先匯出備份。
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton label="取消" variant="ghost" color="neutral" @click="deleting = null" />
          <UButton label="刪除" color="error" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
