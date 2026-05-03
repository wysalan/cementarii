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

const currentTime = ref("載入中");
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

function setCustomTime(targetTime: string) {
  const [hour = "0", minute = "0"] = targetTime.split(" : ");
  if (resetResin.value) {
    currentResin.value = 0;
  }
  customTime.value.setHours(parseInt(hour));
  customTime.value.setMinutes(parseInt(minute));
  customTime.value = new Date(customTime.value);
}
</script>

<template>
  <main class="container mx-auto pt-5 pb-10">
    <div class="flex flex-col justify-center items-center mx-5 gap-5 text-lg text-black">
      <h2 class="text-2xl font-semibold text-black dark:text-white">樹脂計算器</h2>
      <div class="flex flex-col justify-center items-center gap-5">
        <div
          class="flex flex-col justify-center items-center gap-3 bg-zinc-100 p-5 rounded-lg shadow-sm w-full"
        >
          <p class="text-xl font-semibold opacity-80">輸入目前的樹脂</p>
          <InputNumber
            v-model="currentResin"
            :min="0"
            :max="200"
            showButtons
            buttonLayout="horizontal"
            size="large"
            placeholder="在此處輸入樹脂"
            fluid
            :pt="{ pcInputText: { root: { class: 'text-center!' } } }"
          >
            <template #incrementicon>
              <span class="pi pi-plus" />
            </template>
            <template #decrementicon>
              <span class="pi pi-minus" />
            </template>
          </InputNumber>
        </div>
        <div
          class="flex flex-col justify-center items-center gap-3 bg-zinc-100 p-5 rounded-lg shadow-sm w-full"
        >
          <p class="text-xl font-semibold opacity-80">設定起始時間</p>
          <div class="flex flex-row justify-center items-center gap-3">
            <p>目前時間</p>
            <ToggleSwitch v-model="useCustomTime" :pt="{ root: { class: 'scale-110!' } }" />
            <p>自訂時間</p>
          </div>
          <div class="flex flex-col" v-if="!useCustomTime" data-allow-mismatch>
            現在時間：{{ currentTime }}
          </div>
          <div class="flex flex-col" v-else>
            <DatePicker
              v-model="customTime"
              timeOnly
              fluid
              :pt="{ pcInputText: { root: { class: 'text-center!' } } }"
            />
          </div>
        </div>
      </div>
      <div class="flex flex-col justify-center items-center w-full">
        <p class="text-xl font-semibold opacity-80 mb-5 text-black dark:text-white">計算結果</p>
        <div
          class="flex flex-col w-full sm:w-50vw"
          v-for="(resin, index) in getFullResinResult(
            currentResin,
            { hour: customTime.getHours(), minute: customTime.getMinutes() },
            useCustomTime,
          )"
          :key="index"
        >
          <div
            class="flex flex-row justify-between items-center px-5 py-3 bg-zinc-200 rounded-xl shadow-md w-full group"
            :class="{ 'mb-5': index >= 1 }"
          >
            <p>{{ resin.resin }}</p>
            <div class="flex flex-row gap-3 justify-center items-center h-5">
              <Checkbox
                v-model="resetResin"
                binary
                v-tooltip.left="'將樹脂設為 0'"
                class="hidden! sm:group-hover:inline-block!"
              />
              <Button
                label="將此時間設為起點"
                severity="secondary"
                class="hidden! sm:group-hover:inline-block!"
                @click="
                  setCustomTime(resin.time);
                  useCustomTime = true;
                "
                :pt="{ root: { class: 'py-0!' } }"
              />
              <p>{{ resin.prefix }} {{ resin.time }}</p>
            </div>
          </div>
          <Divider v-if="!index" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
