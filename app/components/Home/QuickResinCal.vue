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
    <h2 class="gi-diamond text-2xl pb-2 text-highlighted">快速體力試算</h2>
    <div class="flex flex-col gap-3 gi-panel p-5">
      <div class="flex items-center gap-2 text-lg">
        <span>目前樹脂：</span>
        <UInputNumber v-model="currentResin" :min="0" :max="200" class="w-32" />
      </div>
      <div data-allow-mismatch>預計回滿時間：{{ recoveryTimeResult }}</div>
    </div>
    <UTooltip text="前往完整版">
      <NuxtLink
        to="/tool/resin-calculator"
        class="bg-gold-400 text-navy-900 rounded-full w-10 h-10 flex justify-center items-center absolute right-10 top-1/2 hover:ring-3 ring-gold-500 active:ring-0 transition-shadow"
        aria-label="前往完整版樹脂計算器"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </NuxtLink>
    </UTooltip>
  </div>
</template>

<style scoped></style>
