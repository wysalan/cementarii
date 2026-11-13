<script setup lang="ts">
import { storageConfig } from "@/site.config";
import type { CharacterData } from "@/types/api";
const { data } = defineProps<{ data: CharacterData }>();
const { t } = useI18n();

import { useUserStore } from "@/stores/User";
import { useAbilityPopover } from "~/composables/useAbilityPopover";
const store = useUserStore();

const abilities = computed(() => data.abilities.filter((a) => !a.isEnhanced));

// 天賦清單：戰鬥天賦＋固有天賦
const abilityList = computed(() =>
  abilities.value
    .filter((a) => a.kind !== "constellation")
    .map((ability) => ({
      ability,
      hasStats: ability.parameters !== null,
    })),
);

const selected = ref<number | null>(null);

const showEnhanced = ref(false);
watch(selected, () => (showEnhanced.value = false));

const selectedItem = computed(() => {
  if (selected.value === null) return null;
  const item = abilityList.value[selected.value];
  if (!item || !showEnhanced.value) return item ?? null;
  const other = counterpartOf(data.abilities, item.ability);
  return other ? { ...item, ability: other } : item;
});
const hasVersions = computed(
  () => !!selectedItem.value && !!counterpartOf(data.abilities, selectedItem.value.ability),
);
const toggleVersion = () => (showEnhanced.value = !showEnhanced.value);

// 點擊空白區域時關閉天賦資訊
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

const talentsLevel = ref<Record<string, number>>({
  normal_attack: store.defaultTalentLevel,
  elemental_skill: store.defaultTalentLevel,
  elemental_burst: store.defaultTalentLevel,
});

// 資訊卡分頁（模仿遊戲內 天賦介紹／詳細屬性 切換）
const detailTabs: ComputedRef<{ key: "intro" | "stats"; label: string }[]> = computed(() => [
  { key: "intro", label: t("character.talent.tabs.intro") },
  { key: "stats", label: t("character.talent.tabs.stats") },
]);
const activeTab = ref<"intro" | "stats">("intro");
watch(selected, () => (activeTab.value = "intro"));

const showDiff = ref(false);
const introEl = ref<HTMLElement | null>(null);
useDiffOverlay(introEl, showDiff);

const attributeRows = computed(() => {
  const item = selectedItem.value;
  if (!item) return [];
  const level = talentsLevel.value[item.ability.kind] || 1;
  const rows = parseTalentAttributes(item.ability, level);
  const base = item.ability.isEnhanced ? counterpartOf(data.abilities, item.ability) : undefined;
  const diffs = diffAttributes(rows, base && parseTalentAttributes(base, level));
  return rows.map((row, i) => ({ ...row, diff: diffs[i] }));
});

// 切換分頁時卡片高度的過渡動畫（FLIP：記錄前後高度再補間）
const cardEl = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const switchTab = async (key: "intro" | "stats") => {
  if (key === activeTab.value) return;
  const el = cardEl.value;
  const from = el?.offsetHeight;
  activeTab.value = key;
  await nextTick();
  if (!el || from == null) return;
  const to = el.offsetHeight;
  if (from === to) return;
  el.style.height = `${from}px`;
  el.style.overflow = "hidden";
  // 動畫期間內容高度受限，暫時隱藏捲動軸避免閃現
  if (scrollEl.value) scrollEl.value.style.overflowY = "hidden";
  void el.offsetHeight;
  el.style.transition = "height 0.25s ease";
  el.style.height = `${to}px`;
  setTimeout(() => {
    el.style.height = "";
    el.style.transition = "";
    el.style.overflow = "";
    if (scrollEl.value) scrollEl.value.style.overflowY = "";
  }, 260);
};

// 相關效果 popover 資料
const resolvePopover = useAbilityPopover(data, abilities);

const needMaterials = (end: number) => sumMaterials(data.costs.talent.filter((s) => s.stage < end));
</script>

<template>
  <div class="max-xl:mx-4 max-xl:mt-[36vh] max-xl:mb-30 max-xl:flex max-xl:flex-col max-xl:gap-4">
    <!-- 右側：天賦清單 -->
    <nav
      ref="listEl"
      class="flex flex-col gap-2 xl:gap-6 xl:absolute xl:right-10 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10"
      :aria-label="t('character.talent.list')"
    >
      <button
        v-for="(item, i) in abilityList"
        :key="i"
        type="button"
        class="group relative flex items-center justify-between xl:justify-end gap-3 cursor-pointer max-xl:p-3 max-xl:rounded-lg max-xl:bg-navy-900/70 max-xl:backdrop-blur-sm max-xl:border max-xl:border-gold-500/30"
        :aria-current="selected === i ? 'true' : undefined"
        @click="selected = selected === i ? null : i"
      >
        <!-- hover／選中時的柔光橫帶 -->
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
            {{ item.ability.name }}
          </span>
          <span
            v-if="item.hasStats && item.ability.kind !== 'alternate_sprint'"
            class="block text-xs md:text-sm text-white/90"
          >
            Lv.{{ talentsLevel[item.ability.kind] }}
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
            v-if="item.ability.icon"
            :src="`${storageConfig.baseUrl}/skill-icon/${item.ability.icon}.webp`"
            :alt="item.ability.name"
            class="size-10"
          />
          <span
            v-else
            class="w-3.5 h-3.5 rounded-xs"
            :class="selected === i ? 'bg-navy-900' : 'bg-white/70'"
          ></span>
        </span>
      </button>
    </nav>

    <!-- 左側：天賦資訊（單卡＋分頁切換） -->
    <Transition name="talent-detail" mode="out-in" :duration="200" @after-enter="scrollToDetail">
      <div
        v-if="selectedItem"
        :key="selected ?? -1"
        ref="detailEl"
        class="scroll-mt-24 xl:absolute xl:left-40 xl:top-[calc(50%+34px)] xl:-translate-y-1/2 xl:z-10 xl:w-110"
      >
        <section
          ref="cardEl"
          class="flex flex-col bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-5 text-parchment-100 xl:max-h-[85vh]"
        >
          <div class="flex items-center justify-between gap-2 pb-4">
            <h2
              class="flex flex-row justify-center items-center text-lg md:text-xl font-semibold text-white"
            >
              <NuxtImg
                v-if="selectedItem.ability.icon"
                :src="`${storageConfig.baseUrl}/skill-icon/${selectedItem.ability.icon}.webp`"
                :alt="selectedItem.ability.name"
                class="size-10 mr-2"
              />
              <span v-else class="gi-diamond"></span>
              {{ selectedItem.ability.name }}
              <CharacterEnhancedBadge
                v-if="hasVersions"
                v-model:active="showDiff"
                :enhanced="selectedItem.ability.isEnhanced"
                class="ml-2"
                @toggle="toggleVersion"
              />
            </h2>
            <button
              type="button"
              class="flex shrink-0 rounded-full p-1 text-parchment-100/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              :aria-label="t('character.talent.close')"
              @click="selected = null"
            >
              <UIcon name="i-lucide-x" class="size-5" />
            </button>
          </div>
          <!-- 分頁切換（模仿遊戲內樣式） -->
          <div
            v-if="selectedItem.hasStats"
            role="tablist"
            class="relative flex rounded-md bg-black/30 p-1 mb-4"
          >
            <!-- 滑動的 active 背景指示器 -->
            <span
              class="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-sm bg-parchment-100 transition-transform duration-200 ease-out"
              :class="activeTab === 'stats' ? 'translate-x-full' : ''"
            ></span>
            <button
              v-for="tab in detailTabs"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.key"
              class="relative flex-1 py-1 rounded-sm text-xs md:text-sm font-semibold transition-colors cursor-pointer"
              :class="
                activeTab === tab.key ? 'text-navy-900' : 'text-parchment-100/80 hover:text-white'
              "
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
          <!-- overflow 會連左右一起裁切：留 8px 給差異強調的左右延伸與外框 -->
          <div ref="scrollEl" class="overflow-y-auto min-h-0 -mx-2 px-2">
            <div
              :key="`${selectedItem.hasStats ? activeTab : 'intro'}-${selectedItem.ability.isEnhanced}`"
              class="tab-pane"
            >
              <!-- 天賦介紹 -->
              <UIHoverPopover
                v-if="!selectedItem.hasStats || activeTab === 'intro'"
                :resolve="resolvePopover"
              >
                <p
                  v-html="
                    parseDescriptionText(
                      describeAbility(data.abilities, selectedItem.ability),
                      abilities,
                      data.glossary,
                    )
                  "
                  ref="introEl"
                  class="relative isolate text-sm md:text-base"
                  :class="{ 'show-diff': showDiff }"
                ></p>
              </UIHoverPopover>
              <!-- 詳細屬性 -->
              <div v-else class="flex flex-col gap-3" :class="{ 'show-diff': showDiff }">
                <div
                  class="flex flex-row items-center gap-5 pr-2.5"
                  v-if="selectedItem.ability.kind !== 'alternate_sprint'"
                >
                  <div
                    class="bg-gold-400 rounded-sm p-1 w-20 text-center select-none font-semibold text-navy-900 text-sm md:text-base"
                  >
                    Lv.
                    <span class="font-bold">{{ talentsLevel[selectedItem.ability.kind] }}</span>
                  </div>
                  <USlider
                    v-model="talentsLevel[selectedItem.ability.kind]"
                    :min="1"
                    :max="15"
                    :step="1"
                    class="w-full"
                  />
                </div>
                <!-- 內距讓強調底色不貼字，負邊距抵銷內距 -->
                <div
                  class="flex flex-row justify-between text-sm md:text-base gap-15 -mx-0.5 px-0.5"
                  :class="{ 'ability-diff-new': prop.diff === 'new' }"
                  v-for="(prop, i) in attributeRows"
                  :key="i"
                >
                  <p class="font-semibold text-parchment-100/80">{{ prop.text }}</p>
                  <p
                    class="text-white text-right"
                    :class="{ 'ability-diff-changed': prop.diff === 'changed' }"
                  >
                    {{ prop.value }}
                  </p>
                </div>
                <div
                  class="flex flex-col w-full gap-3"
                  v-if="selectedItem.ability.kind !== 'alternate_sprint'"
                >
                  <USeparator />
                  <p class="text-base font-semibold text-white">
                    {{ t("character.talent.materials") }}
                  </p>
                  <UniversalItemStrip
                    v-if="needMaterials(talentsLevel[selectedItem.ability.kind] || 1).length"
                    :items="needMaterials(talentsLevel[selectedItem.ability.kind] || 1)"
                  />
                  <div v-else>
                    <p>{{ t("common.noMaterials") }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.talent-detail-enter-active > section,
.talent-detail-leave-active > section {
  transition: opacity 0.2s ease;
}
.talent-detail-enter-from > section,
.talent-detail-leave-to > section {
  opacity: 0;
}

/* 分頁內容切換：keyed div 重新掛載時淡入並微微上移（舊內容即刻移除，高度量測才不會疊加） */
.tab-pane {
  animation: tab-pane-in 0.2s ease;
}
/* 由上方滑入：向下偏移會撐出可捲動溢位導致捲動軸閃現，上方溢位只會被裁切 */
@keyframes tab-pane-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}
</style>
