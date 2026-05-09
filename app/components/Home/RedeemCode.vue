<script setup lang="ts">
interface CodesData {
  active: {
    code: string;
    rewards: string[];
  }[];
  inactive: {
    code: string;
    rewards: string[];
  }[];
}

const { data, status, error } = await useLazyFetch<CodesData>(
  "https://api.ennead.cc/mihoyo/genshin/codes",
);

const availableCodes = data.value?.active?.toReversed();
</script>

<template>
  <div class="relative">
    <h2 class="text-2xl pb-2">最新兌換碼</h2>
    <div class="bg-zinc-200 rounded-md p-5 dark:text-black">
      <div class="flex bg-zinc-50 rounded-md p-3" v-if="status === 'pending'">
        <p>載入中</p>
      </div>
      <div v-else class="flex flex-col gap-2 max-h-50 overflow-y-auto">
        <div class="flex bg-zinc-50 rounded-md p-3" v-for="code in availableCodes">
          <NuxtLink
            :to="'https://genshin.hoyoverse.com/gift?code=' + code.code"
            target="_blank"
            rel="noopener"
            class="flex flex-row items-center gap-2 group"
            aria-label="前往兌換頁面"
          >
            {{ code.code }}
            <i class="pi pi-external-link hidden group-hover:inline"></i>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
