<script setup lang="ts">
import { useUserStore } from "@/stores/User";
const store = useUserStore();

const dialogVisible = ref(false);
const newUserName = ref(store.name);

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
      <span
        class="hover:bg-zinc-100 rounded-sm p-1 cursor-pointer"
        @click="dialogVisible = !dialogVisible"
        >{{ store.name }}</span
      >，歡迎使用 Cementarii
    </p>
    <div
      class="bg-zinc-300 rounded-sm w-160px h-28px animate-pulse"
      v-if="date === 'Loading'"
    ></div>
    <p class="text-lg" v-else>{{ date }} {{ time }}</p>
  </div>

  <Dialog v-model:visible="dialogVisible" modal header="修改使用者名稱" :style="{ width: '25rem' }">
    <span class="text-surface-500 dark:text-surface-400 block mb-5"
      >在此處修改首頁顯示的使用者名稱</span
    >
    <div class="flex items-center gap-4 mb-4">
      <InputText
        id="username"
        class="flex-auto"
        autocomplete="off"
        v-model="newUserName"
        :invalid="!newUserName"
      />
    </div>
    <div class="flex justify-end gap-2">
      <Button
        type="button"
        label="取消"
        severity="secondary"
        @click="dialogVisible = false"
      ></Button>
      <Button
        type="button"
        label="儲存"
        @click="
          newUserName && (dialogVisible = false);
          newUserName && store.changeUserName(newUserName);
        "
      ></Button>
    </div>
  </Dialog>
</template>

<style scoped></style>
