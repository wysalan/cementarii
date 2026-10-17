<script setup lang="ts">
import { siteConfig } from "@/site.config";

import useResinCalculator from "@/composables/useResinCalculator";
const { getFullResinResult } = useResinCalculator();

useSeoMeta({
  title: `樹脂計算器 | ${siteConfig.title}`,
});

const currentResin = ref(0);
const useCustomTime = ref(false);
const resetResin = ref(true);

const customTimeString = computed({
  get: () => customTime.value.toTimeString().slice(0, 5),
  set: (value: string) => {
    const [hour = "0", minute = "0"] = value.split(":");
    customTime.value.setHours(parseInt(hour));
    customTime.value.setMinutes(parseInt(minute));
    customTime.value = new Date(customTime.value);
  },
});

const currentTime = ref(
  new Date().toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }),
);
const customTime = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString("zh-TW", {
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

/**
 * 設定變數 customTime 的時間
 * @param { boolean } autoSet 自動套用目前時間
 * @param { string } [targetTime] 手動指定時間（格式為 hh:mm）
 */
function setCustomTime(autoSet: boolean, targetTime?: string): void {
  if (autoSet && useCustomTime.value) {
    const nowTime = new Date();
    customTime.value.setHours(nowTime.getHours());
    customTime.value.setMinutes(nowTime.getMinutes());
  } else if (!autoSet && targetTime) {
    const [hour = "0", minute = "0"] = targetTime.split(" : ");
    if (resetResin.value) {
      currentResin.value = 0;
    }
    customTime.value.setHours(parseInt(hour));
    customTime.value.setMinutes(parseInt(minute));
    customTime.value = new Date(customTime.value);
  }
}
</script>

<template>
  <main class="container mx-auto pt-5 pb-10 px-4">
    <div class="flex flex-col justify-center items-center gap-5 text-lg">
      <h2 class="gi-diamond text-2xl font-semibold text-highlighted">樹脂計算器</h2>
      <UAlert
        color="neutral"
        variant="soft"
        icon="i-lucide-info"
        title="一般模式的誤差值為 ± 16 分鐘"
        class="w-fit"
      />
      <div class="flex flex-col justify-center items-center gap-5 w-full max-w-md">
        <div class="flex flex-col justify-center items-center gap-3 gi-panel p-5 w-full">
          <p class="text-xl font-semibold text-highlighted">輸入目前的樹脂</p>
          <UInputNumber
            v-model="currentResin"
            :min="0"
            :max="200"
            size="xl"
            placeholder="在此處輸入樹脂"
            class="w-full"
          />
        </div>
        <div class="flex flex-col justify-center items-center gap-3 gi-panel p-5 w-full">
          <p class="text-xl font-semibold text-highlighted">設定起始時間</p>
          <div class="flex flex-row justify-center items-center gap-3">
            <p>目前時間</p>
            <USwitch v-model="useCustomTime" @change="setCustomTime(true)" />
            <p>自訂時間</p>
          </div>
          <div class="flex flex-col" v-if="!useCustomTime" data-allow-mismatch>
            現在時間：{{ currentTime }}
          </div>
          <div class="flex flex-col" v-else>
            <UInput v-model="customTimeString" type="time" class="w-40 text-center" />
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center items-center w-full">
        <p class="gi-diamond text-xl font-semibold mb-5 text-highlighted">計算結果</p>
        <div
          class="flex flex-col w-full md:w-[75vw] lg:w-[50vw]"
          v-for="(resin, index) in getFullResinResult(
            currentResin,
            { hour: customTime.getHours(), minute: customTime.getMinutes() },
            useCustomTime,
          )"
          :key="index"
        >
          <div
            class="flex flex-row justify-between items-center px-5 py-3 gi-panel w-full group"
            :class="{ 'mb-5': index >= 1 }"
          >
            <p>{{ resin.resin }}</p>
            <div class="flex flex-row gap-3 justify-center items-center h-5">
              <div class="hidden md:group-hover:flex flex-row items-center gap-2" v-if="index">
                <UCheckbox v-model="resetResin" label="將樹脂設為零" />
                <UButton
                  label="將此時間設為起點"
                  color="primary"
                  variant="soft"
                  size="xs"
                  class="rounded-full"
                  @click="
                    setCustomTime(false, resin.time);
                    useCustomTime = true;
                  "
                />
              </div>
              <p>{{ resin.prefix }} {{ resin.time }}</p>
            </div>
          </div>
          <USeparator v-if="!index" class="my-4" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
