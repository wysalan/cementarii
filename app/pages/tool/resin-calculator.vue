<script setup lang="ts">
import { siteConfig } from "@/site.config";

useSeoMeta({
  title: `樹脂計算器 | ${siteConfig.title}`,
});

const currentResin = ref(0);
const useCustomTime = ref(false);
const resetResin = ref(true);

const customTimeString = computed({
  // toISOString 是 UTC，datetime-local 要本地時間，所以先扣掉時區差
  get: () =>
    new Date(customTime.value.getTime() - customTime.value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
  set: (value: string) => {
    if (value) customTime.value = new Date(value);
  },
});

function formatNow() {
  return new Date().toLocaleString("zh-TW", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const currentTime = ref(formatNow());
const customTime = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = formatNow();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

function setCustomTime(autoSet: boolean, targetTime?: Date): void {
  if (autoSet && useCustomTime.value) {
    customTime.value = new Date();
  } else if (!autoSet && targetTime) {
    if (resetResin.value) {
      currentResin.value = 0;
    }
    customTime.value = new Date(targetTime);
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
            <UInput v-model="customTimeString" type="datetime-local" class="w-60 text-center" />
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center items-center w-full">
        <p class="gi-diamond text-xl font-semibold mb-5 text-highlighted">計算結果</p>
        <div
          class="flex flex-col w-full md:w-[75vw] lg:w-[50vw]"
          v-for="(resin, index) in getFullResinResult(
            currentResin,
            useCustomTime ? customTime : undefined,
          )"
          :key="index"
        >
          <div
            class="flex flex-row justify-between items-center px-5 py-3 gi-panel w-full group"
            :class="{ 'mb-5': index >= 1 }"
          >
            <p class="font-mono">{{ resin.resin }}</p>
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
                    setCustomTime(false, resin.date);
                    useCustomTime = true;
                  "
                />
              </div>
              <p class="font-mono">{{ resin.prefix }} {{ resin.time }}</p>
            </div>
          </div>
          <USeparator v-if="!index" class="my-4" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
