<script setup lang="ts">
import { siteConfig } from "@/site.config";

useSeoMeta({
  title: `工具 | ${siteConfig.title}`,
});
</script>

<template>
  <main class="container mx-auto pt-5 pb-10">
    <div class="flex flex-wrap justify-center gap-5">
      <NuxtLink
        to="tool/resin-calculator"
        class="flex flex-col justify-center items-center w-40 h-45 bg-zinc-200 hover:bg-zinc-400 rounded-xl transition-colors"
      >
        <div>
          <NuxtImg src="https://assets.wysalan.com/cementarii/item-icon/UI_ItemIcon_211.webp" />
        </div>
        <p class="text-black">樹脂計算器</p>
      </NuxtLink>
    </div>
  </main>
</template>

<style scoped></style>
