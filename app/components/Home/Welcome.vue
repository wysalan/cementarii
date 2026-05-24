<script setup lang="ts">
import { useUserStore } from "@/stores/User";
const store = useUserStore();
</script>

<template>
  <div
    class="flex flex-col gap-2 bg-zinc-200 dark:bg-zinc-700 rounded-md p-5 items-center text-center"
  >
    <p class="text-2xl dark:text-white">
      <span>{{ store.name }}</span
      >，歡迎使用 Cementarii
    </p>
    <p class="dark:text-white opacity-70">仍在開發中，不代表最終呈現效果</p>
  </div>
</template>

<style scoped></style>
