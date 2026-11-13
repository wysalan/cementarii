<script setup lang="ts">
import { storageConfig } from "@/site.config";
import type { CharacterData } from "@/types/api";
const { data } = defineProps<{ data: CharacterData }>();
const { t } = useI18n();

const abilities = computed(() => data.abilities.filter((a) => !a.isEnhanced));
const constellations = computed(() => abilities.value.filter((a) => a.kind === "constellation"));

// 弧形排列：中段項目向右凸出（模仿遊戲內命之座弧線）
const arcOffsets = ["xl:pr-14", "xl:pr-5", "xl:pr-0", "xl:pr-0", "xl:pr-5", "xl:pr-14"];

const selected = ref<number | null>(null);

const showEnhanced = ref(false);
watch(selected, () => (showEnhanced.value = false));

const selectedItem = computed(() => {
  if (selected.value === null) return null;
  const item = constellations.value[selected.value];
  if (!item || !showEnhanced.value) return item ?? null;
  return counterpartOf(data.abilities, item) ?? item;
});
const hasVersions = computed(
  () => !!selectedItem.value && !!counterpartOf(data.abilities, selectedItem.value),
);
const toggleVersion = () => (showEnhanced.value = !showEnhanced.value);

// 點擊空白區域時關閉命之座資訊
const listEl = ref<HTMLElement | null>(null);

const onPointerDownOutside = (event: PointerEvent) => {
  if (selected.value === null) return;
  const target = event.target as Element | null;
  // 忽略 teleport 到 body 的彈窗／popover，只處理頁面本體的點擊
  if (!target?.closest("#site-content")) return;
  if (detailEl.value?.contains(target) || listEl.value?.contains(target)) return;
  selected.value = null;
};

onMounted(() => document.addEventListener("pointerdown", onPointerDownOutside));
onBeforeUnmount(() => document.removeEventListener("pointerdown", onPointerDownOutside));

// 手機／平板：資訊卡在清單下方，開啟後自動捲動至卡片
const detailEl = ref<HTMLElement | null>(null);
const scrollToDetail = () => {
  if (window.innerWidth < 1280) {
    detailEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const showDiff = ref(false);
const descEl = ref<HTMLElement | null>(null);
useDiffOverlay(descEl, showDiff);

// 相關效果 popover 資料
const resolvePopover = useAbilityPopover(data, abilities);
</script>

<template>
  <div class="max-xl:mx-4 max-xl:mt-[36vh] max-xl:mb-30 max-xl:flex max-xl:flex-col max-xl:gap-4">
    <!-- 右側：命之座清單 -->
    <nav
      ref="listEl"
      class="flex flex-col gap-2 xl:gap-9 xl:absolute xl:right-10 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10"
      :aria-label="t('character.constellation.list')"
    >
      <button
        v-for="(constellation, i) in constellations"
        :key="i"
        type="button"
        class="group relative flex items-center justify-between xl:justify-end gap-3 cursor-pointer max-xl:p-3 max-xl:rounded-lg max-xl:bg-navy-900/70 max-xl:backdrop-blur-sm max-xl:border max-xl:border-gold-500/30"
        :class="arcOffsets[i]"
        :aria-current="selected === i ? 'true' : undefined"
        @click="selected = selected === i ? null : i"
      >
        <span
          class="absolute inset-0 xl:-left-16 xl:-right-10 xl:-inset-y-1 -z-10 rounded-lg xl:rounded-none bg-linear-to-r from-transparent to-transparent pointer-events-none transition-opacity duration-200"
          :class="
            selected === i
              ? 'opacity-100 via-white/25'
              : 'opacity-0 via-white/15 group-hover:opacity-100 group-active:opacity-100'
          "
        ></span>
        <span
          class="max-xl:text-left xl:text-right [text-shadow:0_1px_3px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.45)]"
        >
          <span
            class="block text-sm md:text-base font-semibold transition-colors"
            :class="selected === i ? 'text-gold-300' : 'text-white/90 group-hover:text-gold-200'"
          >
            {{ constellation.name }}
          </span>
        </span>
        <span
          class="flex shrink-0 items-center justify-center w-12 h-12 m-1.5 rounded-full border-2 backdrop-blur-sm transition-colors"
          :class="
            selected === i
              ? 'bg-gold-600/70 border-gold-200 shadow-[0_0_12px_rgba(211,188,142,0.7)]'
              : 'bg-navy-900/70 border-white/40 group-hover:border-gold-300'
          "
        >
          <NuxtImg
            v-if="constellation.icon"
            :src="`${storageConfig.baseUrl}/skill-icon/${constellation.icon}.webp`"
            :alt="constellation?.name"
            class="size-10"
          />
          <span
            v-else
            class="text-sm font-bold select-none"
            :class="selected === i ? 'text-navy-900' : 'text-white/80'"
          >
            {{ i + 1 }}
          </span>
        </span>
      </button>
    </nav>

    <!-- 左側：命之座資訊卡 -->
    <Transition name="cons-detail" mode="out-in" :duration="200" @after-enter="scrollToDetail">
      <div
        v-if="selectedItem"
        :key="selected ?? -1"
        ref="detailEl"
        class="scroll-mt-24 xl:absolute xl:left-40 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10 xl:w-110"
      >
        <section
          class="flex flex-col bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-5 text-parchment-100 xl:max-h-[85vh]"
        >
          <div class="flex items-center justify-between gap-3">
            <h2
              class="flex flex-row justify-center items-center text-lg md:text-xl font-semibold text-white"
            >
              <NuxtImg
                v-if="selectedItem.icon"
                :src="`${storageConfig.baseUrl}/skill-icon/${selectedItem.icon}.webp`"
                :alt="selectedItem.name"
                class="size-10 mr-2"
              />
              <span v-else class="gi-diamond"></span>
              {{ selectedItem.name }}
              <CharacterEnhancedBadge
                v-if="hasVersions"
                v-model:active="showDiff"
                :enhanced="selectedItem.isEnhanced"
                class="ml-2"
                @toggle="toggleVersion"
              />
            </h2>
            <button
              type="button"
              class="flex shrink-0 rounded-full p-1 text-parchment-100/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              :aria-label="t('character.constellation.close')"
              @click="selected = null"
            >
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
          <p class="text-xs md:text-sm text-gold-300 font-semibold py-2">
            {{ t("character.constellation.level", { n: (selected ?? 0) + 1 }) }}
          </p>
          <!-- overflow 會連左右一起裁切：留 8px 給差異強調的左右延伸與外框 -->
          <div class="overflow-y-auto min-h-0 -mx-2 px-2">
            <div :key="`${selected ?? -1}-${selectedItem.isEnhanced}`" class="tab-pane">
              <UIHoverPopover :resolve="resolvePopover">
                <p
                  v-html="
                    parseDescriptionText(
                      describeAbility(data.abilities, selectedItem),
                      abilities,
                      data.glossary,
                    )
                  "
                  ref="descEl"
                  class="relative isolate text-sm md:text-base"
                  :class="{ 'show-diff': showDiff }"
                ></p>
              </UIHoverPopover>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cons-detail-enter-active > section,
.cons-detail-leave-active > section {
  transition: opacity 0.2s ease;
}
.cons-detail-enter-from > section,
.cons-detail-leave-to > section {
  opacity: 0;
}

/* 由上方滑入：向下偏移會撐出可捲動溢位導致捲動軸閃現，上方溢位只會被裁切 */
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
