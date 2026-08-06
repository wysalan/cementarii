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

const { data, status } = await useAsyncData(
  "codes",
  () => $fetch<CodeData>("https://api.ennead.cc/mihoyo/genshin/codes"),
  {
    transform: (res) => res.active.toReversed(),
  },
);
</script>

<template>
  <div class="relative">
    <h2 class="gi-diamond text-2xl pb-2 text-highlighted">兌換碼一覽</h2>
    <div class="gi-panel p-5">
      <div class="flex rounded-md" v-if="status === 'pending'">
        <USkeleton class="w-full h-50" />
      </div>
      <div v-else class="flex flex-col gap-2 max-h-50 overflow-y-auto">
        <div class="flex bg-parchment-100 dark:bg-navy-950 rounded-md p-3" v-for="code in data">
          <NuxtLink
            :to="'https://genshin.hoyoverse.com/gift?code=' + code.code"
            target="_blank"
            rel="noopener"
            class="flex flex-row items-center gap-2 group"
            aria-label="前往官網兌換頁面"
          >
            {{ code.code }}
            <UIcon
              name="i-lucide-external-link"
              class="opacity-0 group-hover:opacity-100 transition-opacity select-none"
            />
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
