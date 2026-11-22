<script setup lang="ts">
const route = useRoute("tool-wish-history-uid-pool");
const { stored, loaded, items } = useWishData();

const pool = computed(() => WISH_POOLS.find((p) => p.slug === route.params.pool));
const entry = computed(() => stored.value.find((s) => s.account.uid === route.params.uid));

// 由新到舊顯示
const records = computed(() =>
  annotateWishRecords(
    (entry.value?.records ?? []).filter((r) => wishPoolOf(r.gachaType) === pool.value?.key),
  ).toReversed(),
);

const RANKS = ["5", "4", "3"];
const ranks = ref([...RANKS]);
const filtered = computed(() => records.value.filter((r) => ranks.value.includes(String(r.rank))));

const PAGE_SIZE = 100;
const limit = ref(PAGE_SIZE);
watch([ranks, () => route.fullPath], () => (limit.value = PAGE_SIZE));

const RANK_CLASS: Record<number, string> = {
  5: "text-gold-600 dark:text-gold-400 font-semibold",
  4: "text-purple-600 dark:text-purple-400 font-semibold",
};
</script>

<template>
  <section class="gi-panel p-5 flex flex-col gap-3">
    <template v-if="pool">
      <div class="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 class="text-xl font-semibold text-highlighted">{{ pool.name }}</h3>
        <p class="text-sm text-muted">UID {{ route.params.uid }}</p>
      </div>
      <div v-if="!loaded" class="flex flex-col gap-2" aria-busy="true" aria-label="載入中">
        <USkeleton class="h-6 w-56 bg-accented" />
        <USkeleton v-for="n in 10" :key="n" class="h-6 bg-accented" />
      </div>
      <ClientOnly>
        <p v-if="loaded && !entry" class="text-muted">找不到這個帳號的紀錄。</p>
        <p v-else-if="loaded && !records.length" class="text-muted">這個卡池沒有紀錄。</p>
        <template v-else-if="loaded">
          <div class="flex flex-wrap items-center gap-4">
            <UCheckboxGroup
              v-model="ranks"
              :items="RANKS.map((rank) => ({ label: `${rank} 星`, value: rank }))"
              orientation="horizontal"
              legend="顯示的星級"
              :ui="{ legend: 'sr-only' }"
            />
            <p class="text-sm text-muted tabular-nums">
              {{ filtered.length }} 筆<template v-if="filtered.length !== records.length"
                >（共 {{ records.length }} 筆）</template
              >
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="py-1 pr-3 font-normal text-right w-16">抽數</th>
                  <th class="py-1 pr-3 font-normal">物品</th>
                  <th class="py-1 pr-3 font-normal text-right">星級</th>
                  <th class="py-1 pr-3 font-normal text-right">第幾抽出</th>
                  <th class="py-1 font-normal">時間</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="record in filtered.slice(0, limit)"
                  :key="record.id"
                  class="border-t border-default"
                >
                  <td class="py-1 pr-3 text-right tabular-nums text-muted">{{ record.no }}</td>
                  <td class="py-1 pr-3" :class="RANK_CLASS[record.rank]">
                    {{ items.get(record.itemId)?.name ?? `#${record.itemId}` }}
                  </td>
                  <td class="py-1 pr-3 text-right tabular-nums">{{ record.rank }}</td>
                  <td class="py-1 pr-3 text-right tabular-nums">{{ record.pity ?? "" }}</td>
                  <td class="py-1 tabular-nums whitespace-nowrap">{{ record.time }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <UButton
            v-if="filtered.length > limit"
            :label="`顯示更多（還有 ${filtered.length - limit} 筆）`"
            color="neutral"
            variant="soft"
            class="self-center"
            @click="limit += PAGE_SIZE"
          />
        </template>
      </ClientOnly>
    </template>
    <p v-else class="text-muted">沒有這個卡池。</p>
  </section>
</template>
