<script setup lang="ts">
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import useDataParser from "@/composables/useDataParser";
const { parseStoryContent } = useDataParser();

import { useUserStore } from "@/stores/User";
const store = useUserStore();

const voiceovers = data.profile?.voiceover || [];

// 語音分類分頁（資料庫 type 欄位尚未建立，目前兩個分頁都顯示全部）
const voiceTabs = [
  { key: "fetter", label: "好感" },
  { key: "general", label: "一般" },
] as const;
const activeTab = ref<"general" | "fetter">("fetter");

// ponytail: 等資料庫新增 type 欄位後改為依 activeTab 過濾
const filteredVoiceovers = computed(() => voiceovers);

const selected = ref<number | null>(null);
const selectedItem = computed(() =>
  selected.value === null ? null : filteredVoiceovers.value[selected.value],
);
watch(activeTab, () => (selected.value = null));

// 點擊空白區域時關閉語音內容
const listEl = ref<HTMLElement | null>(null);
const detailEl = ref<HTMLElement | null>(null);

const onPointerDownOutside = (event: PointerEvent) => {
  if (selected.value === null) return;
  const target = event.target as Element | null;
  if (!target?.closest("#site-content")) return;
  if (detailEl.value?.contains(target) || listEl.value?.contains(target)) return;
  selected.value = null;
};

onMounted(() => document.addEventListener("pointerdown", onPointerDownOutside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onPointerDownOutside));

// 手機／平板：內容卡在清單下方，開啟後自動捲動至卡片
const scrollToDetail = () => {
  if (window.innerWidth < 1280) {
    detailEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
</script>

<template>
  <div class="max-xl:mx-4 max-xl:mt-[36vh] max-xl:mb-30 max-xl:flex max-xl:flex-col max-xl:gap-4">
    <!-- 語音內容卡：獨立定位於清單左側（right-10 + 清單寬 72 + 間距 4），各自垂直置中 -->
    <Transition name="voice-detail" mode="out-in" :duration="200" @after-enter="scrollToDetail">
      <div
        v-if="selectedItem"
        :key="selected ?? -1"
        ref="detailEl"
        class="scroll-mt-24 max-xl:order-2 xl:absolute xl:right-86 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10 xl:w-110"
      >
        <section
          class="flex flex-col bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-5 text-parchment-100 xl:max-h-[85vh]"
        >
          <div class="flex items-start justify-between gap-3 pb-4">
            <h2 class="gi-diamond text-lg md:text-xl font-semibold text-white">
              {{ selectedItem.title }}
            </h2>
            <button
              type="button"
              class="flex shrink-0 rounded-full p-1 text-parchment-100/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              aria-label="關閉語音內容"
              @click="selected = null"
            >
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
          <div class="overflow-y-auto min-h-0">
            <div :key="selected ?? -1" class="tab-pane">
              <p
                class="text-sm md:text-base"
                v-html="parseStoryContent(selectedItem.text, store.name, store.playerGender)"
              ></p>
            </div>
          </div>
        </section>
      </div>
    </Transition>

    <!-- 語音項目清單（含分類分頁） -->
    <div
      ref="listEl"
      class="flex flex-col gap-2 max-xl:order-1 xl:absolute xl:right-10 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10 xl:w-72 xl:max-h-[85vh]"
    >
      <!-- 分類分頁 -->
      <div
        role="tablist"
        class="relative flex shrink-0 rounded-md bg-black/40 backdrop-blur-sm p-1"
      >
        <!-- 滑動的 active 背景指示器 -->
        <span
          class="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-sm bg-parchment-100 transition-transform duration-200 ease-out"
          :class="activeTab === 'general' ? 'translate-x-full' : ''"
        ></span>
        <button
          v-for="tab in voiceTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.key"
          class="relative flex-1 py-1 rounded-sm text-xs md:text-sm font-semibold transition-colors cursor-pointer"
          :class="
            activeTab === tab.key ? 'text-navy-900' : 'text-parchment-100/80 hover:text-white'
          "
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <nav class="flex flex-col gap-2 min-h-0 xl:overflow-y-auto" aria-label="語音清單">
        <button
          v-for="(voiceover, i) in filteredVoiceovers"
          :key="i"
          type="button"
          class="flex items-center p-3 rounded-lg border backdrop-blur-sm text-left transition-colors cursor-pointer"
          :class="
            selected === i
              ? 'bg-navy-800/85 border-gold-300/80 shadow-[0_0_10px_rgba(211,188,142,0.35)]'
              : 'bg-navy-900/70 border-white/20 hover:border-gold-300/60 hover:bg-navy-800/70'
          "
          :aria-current="selected === i ? 'true' : undefined"
          @click="selected = selected === i ? null : i"
        >
          <span
            class="text-sm md:text-base font-semibold transition-colors"
            :class="selected === i ? 'text-gold-300' : 'text-white/90'"
          >
            {{ voiceover.title }}
          </span>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.voice-detail-enter-active > section,
.voice-detail-leave-active > section {
  transition: opacity 0.2s ease;
}
.voice-detail-enter-from > section,
.voice-detail-leave-to > section {
  opacity: 0;
}

.tab-pane {
  animation: tab-pane-in 0.2s ease;
}
@keyframes tab-pane-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
</style>
