<script setup lang="ts">
import useResinCalculator from "@/composables/useResinCalculator";
const { getSimpleResinResult } = useResinCalculator();
const currentResin = ref(0);
const recoveryTimeResult = computed(() => {
  const resin = currentResin.value;
  if (resin === null || resin === undefined || resin.toString() === "") {
    return "請輸入樹脂數量";
  }
  if (resin >= 200) {
    return "已回滿";
  }
  return getSimpleResinResult(resin);
});
</script>

<template>
  <div class="relative">
    <h2 class="text-2xl pb-2">快速體力試算</h2>
    <div class="flex flex-col gap-2 bg-zinc-200 rounded-md p-5 dark:text-black">
      <div class="text-lg">
        <span>目前樹脂：</span>
        <InputNumber
          v-model="currentResin"
          inputId="current-resin"
          showButtons
          :min="0"
          :max="200"
          :pt="{
            pcInputText: { root: { class: 'w-25 h-10' } },
          }"
        />
      </div>
      <div>預計回滿時間：{{ recoveryTimeResult }}</div>
    </div>
    <NuxtLink
      to="/tool"
      class="bg-zinc-300 rounded-full w-10 h-10 flex justify-center items-center absolute right-10 top-1/2 hover:ring-3 transition-shadow"
      >▶</NuxtLink
    >
  </div>
</template>

<style scoped></style>
