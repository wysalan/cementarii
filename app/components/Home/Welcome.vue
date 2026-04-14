<script setup lang="ts">
import { useUserStore } from "@/stores/User";
const store = useUserStore();

const date = ref("Loading");
const time = ref();
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    date.value = new Date().toLocaleDateString("zh-TW");
    time.value = new Date().toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="flex flex-col gap-2 bg-zinc-200 rounded-md p-5 justify-center items-center">
    <p class="text-2xl">
      <span>{{ store.name }}</span
      >，歡迎使用 Cementarii
    </p>
    <div
      class="bg-zinc-300 rounded-sm w-160px h-28px animate-pulse"
      v-if="date === 'Loading'"
    ></div>
    <p class="text-lg" v-else>{{ date }} {{ time }}</p>
  </div>
</template>

<style scoped></style>
