<script setup lang="ts">
import { siteConfig, storageConfig } from "@/site.config";

useSeoMeta({
  title: `工具 | ${siteConfig.title}`,
});
</script>

<template>
  <main class="container mx-auto pt-5 pb-10 px-4">
    <div class="flex flex-wrap justify-center gap-5">
      <NuxtLink
        to="tool/resin-calculator"
        class="flex flex-col justify-center items-center w-40 h-45 gi-panel hover:ring-2 ring-gold-500 hover:scale-105 transition"
      >
        <div>
          <NuxtImg
            :src="`${storageConfig.baseUrl}/item-icon/UI_ItemIcon_211.webp`"
            alt="樹脂計算器圖示"
          />
        </div>
        <p class="text-highlighted font-semibold">樹脂計算器</p>
      </NuxtLink>
    </div>
  </main>
</template>

<style scoped></style>
