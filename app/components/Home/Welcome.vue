<script setup lang="ts">
import { useUserStore } from "@/stores/User";
const store = useUserStore();
</script>

<template>
  <div class="flex flex-col gap-2 gi-panel p-5 items-center text-center">
    <p class="text-2xl text-highlighted">
      <span class="text-gold-600 dark:text-gold-300 font-semibold">{{ store.name }}</span
      >，歡迎使用 Cementarii
    </p>
    <p class="text-muted">仍在開發中，不代表最終呈現效果</p>
  </div>
</template>

<style scoped></style>
