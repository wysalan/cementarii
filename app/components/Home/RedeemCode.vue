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
    <h2 class="text-2xl pb-2">兌換碼一覽</h2>
    <div class="bg-zinc-200 dark:bg-zinc-700 rounded-md p-5 dark:text-black">
      <div class="flex rounded-md" v-if="status === 'pending'">
        <Skeleton width="100%" height="12.5rem"></Skeleton>
      </div>
      <div v-else class="flex flex-col gap-2 max-h-50 overflow-y-auto">
        <div
          class="flex bg-zinc-300 dark:bg-zinc-950 dark:text-white rounded-md p-3"
          v-for="code in data"
        >
          <NuxtLink
            :to="'https://genshin.hoyoverse.com/gift?code=' + code.code"
            target="_blank"
            rel="noopener"
            class="flex flex-row items-center gap-2 group"
            aria-label="前往官網兌換頁面"
          >
            {{ code.code }}
            <i
              class="pi pi-external-link opacity-0 group-hover:opacity-100 transition-opacity select-none"
            ></i>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
