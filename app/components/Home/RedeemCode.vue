<script setup lang="ts">
interface CodeData {
  active: {
    code: string;
    rewards: string[];
  }[];
  inactive: {
    code: string;
    rewards: string[];
  }[];
}

// 第三方 API：只在瀏覽器端抓、不擋住畫面，對方變慢或掛掉時首頁仍能正常輸出
const { data, status } = useAsyncData(
  "codes",
  () => $fetch<CodeData>("https://api.ennead.cc/mihoyo/genshin/codes"),
  {
    server: false,
    lazy: true,
    transform: (res) => res.active.toReversed(),
  },
);
</script>

<template>
  <div class="relative">
    <div class="gi-panel p-5">
      <h2 class="text-2xl text-highlighted pb-4">兌換碼一覽</h2>
      <p v-if="status === 'error'" role="alert">兌換碼暫時無法取得，請稍後再試。</p>
      <div v-else-if="!data" class="flex flex-col gap-2" role="status" aria-label="兌換碼載入中">
        <USkeleton
          v-for="i in 4"
          :key="i"
          class="h-11 rounded-md bg-parchment-200 dark:bg-navy-950"
        />
      </div>
      <div v-else class="flex flex-col gap-2 max-h-50 overflow-y-auto">
        <div
          class="flex bg-parchment-200 dark:bg-navy-950 rounded-md p-3 hover:ring-1 ring-inset ring-gold-500 transition-shadow"
          v-for="code in data"
          :key="code.code"
        >
          <a
            :href="'https://genshin.hoyoverse.com/gift?code=' + code.code"
            target="_blank"
            rel="noopener"
            class="flex flex-row items-center gap-2 group h-5"
            :aria-label="`前往官網兌換 ${code.code}`"
          >
            {{ code.code }}
            <UIcon
              name="i-lucide-external-link"
              class="opacity-0 group-hover:opacity-100 transition-opacity select-none"
            />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
