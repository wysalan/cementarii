<script setup lang="ts">
const { versions, items, emphasizeUp } = defineProps<{
  versions: WishVersionSummary[];
  items: Map<number, WishItem>;
  emphasizeUp?: boolean;
}>();

// 把最大值進位成好讀的整數，當作縱軸的上限
function niceMax(value: number) {
  const unit = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return ([1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((step) => step * unit >= value) ?? 10) * unit;
}

// 一次顯示一個大版本（x.0 ～ x.8），預設停在最新的大版本
const pages = computed(() => {
  const groups = new Map<string, WishVersionSummary[]>();
  for (const entry of versions) {
    const major = entry.version.split(".")[0]!;
    groups.set(major, [...(groups.get(major) ?? []), entry]);
  }
  return [...groups.values()];
});
const pageIndex = ref<number>();
const page = computed(() =>
  Math.min(pageIndex.value ?? pages.value.length - 1, pages.value.length - 1),
);

const MODES = [
  { value: "major", label: "大版本" },
  { value: "all", label: "全部" },
] as const;
const mode = ref<(typeof MODES)[number]["value"]>("all");

// 換頁時直條往翻頁的方向滑動；切換顯示模式時只淡入淡出
const slide = ref("chart-fade");
// 動畫還沒結束時不接受下一次換頁，否則連點會跳過中間那一頁
const turning = ref(false);
// 換頁時按鈕只淡入淡出；切換顯示模式時（undefined）才跟著圖表邊緣滑動
const buttonMotion = ref<"fade">();
function turn(step: number) {
  if (turning.value) return;
  turning.value = true;
  buttonMotion.value = "fade";
  slide.value = step > 0 ? "chart-next" : "chart-prev";
  pageIndex.value = page.value + step;
}
function switchMode(value: typeof mode.value) {
  buttonMotion.value = undefined;
  slide.value = "chart-fade";
  mode.value = value;
}

// 全部模式只列出第一個到最後一個有紀錄的版本
const recorded = computed(() =>
  versions.slice(
    versions.findIndex((v) => v.total),
    versions.findLastIndex((v) => v.total) + 1,
  ),
);
const shown = computed(() =>
  mode.value === "all" ? recorded.value : (pages.value[page.value] ?? []),
);
// 頭尾的標籤靠邊對齊，才不會超出圖表被截掉
const labelPosition = (index: number) =>
  index === 0
    ? "left-0"
    : index === shown.value.length - 1
      ? "right-0"
      : "left-1/2 -translate-x-1/2";
const range = computed(() => `${shown.value[0]?.version} ～ ${shown.value.at(-1)?.version}`);

// 縱軸在各頁之間維持一樣，切換時才能互相比較
const max = computed(() => niceMax(Math.max(...versions.map((v) => v.total))));
const ticks = computed(() => [max.value, max.value / 2, 0]);

// 關閉時保留選到的版本，視窗淡出的過程才不會顯示空的內容
const selected = ref<WishVersionSummary | null>(null);
const open = ref(false);
function select(entry: WishVersionSummary) {
  selected.value = entry;
  open.value = true;
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted">各版本抽數</p>
      <div class="flex gap-1" role="group" aria-label="顯示模式">
        <UButton
          v-for="option in MODES"
          :key="option.value"
          :label="option.label"
          size="xs"
          :color="mode === option.value ? 'primary' : 'neutral'"
          :variant="mode === option.value ? 'soft' : 'ghost'"
          :aria-pressed="mode === option.value"
          @click="switchMode(option.value)"
        />
      </div>
    </div>
    <!-- 換頁按鈕滑動時可以進到卡池區塊的內距（p-5），但不超過區塊的邊框 -->
    <div class="-mx-5 overflow-x-clip px-5">
      <div
        class="relative flex gap-2 text-xs text-muted tabular-nums transition-[padding] duration-150 ease-in-out motion-reduce:transition-none"
        :class="{ 'px-9': mode === 'major' }"
      >
        <div class="flex h-40 flex-col justify-between text-right" aria-hidden="true">
          <span v-for="tick in ticks" :key="tick" class="-translate-y-1/2 last:translate-y-1/2">{{
            tick
          }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div
            class="-mt-6 pt-6"
            :class="mode === 'all' ? 'overflow-x-auto' : 'overflow-x-clip'"
            role="group"
            :aria-label="`${range} 版本的抽數`"
          >
            <div class="relative" :class="{ 'min-w-max': mode === 'all' }">
              <div
                class="absolute inset-x-0 top-0 flex h-40 flex-col justify-between"
                aria-hidden="true"
              >
                <div v-for="tick in ticks" :key="tick" class="border-t border-default" />
              </div>
              <Transition
                :name="slide"
                mode="out-in"
                @after-enter="turning = false"
                @enter-cancelled="turning = false"
                @leave-cancelled="turning = false"
              >
                <div :key="mode === 'all' ? 'all' : page" class="flex">
                  <button
                    v-for="(entry, index) in shown"
                    :key="entry.version"
                    type="button"
                    class="group relative flex flex-1 flex-col items-center rounded-sm hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary enabled:cursor-pointer"
                    :class="mode === 'all' ? 'min-w-6' : 'min-w-0'"
                    :disabled="!entry.total"
                    :aria-label="`${entry.version} 版本：${entry.total} 抽，共 ${entry.fives.length} 個 5 星`"
                    @click="select(entry)"
                  >
                    <span
                      class="absolute inset-y-0 left-1/2 hidden w-full -translate-x-1/2 rounded-sm bg-accented/60 group-enabled:group-hover:block"
                      :class="mode === 'all' ? 'max-w-6' : 'max-w-8'"
                      aria-hidden="true"
                    />
                    <span class="relative flex h-40 w-full items-end justify-center">
                      <span
                        class="relative w-full rounded-t-sm bg-[#a8822f]"
                        :class="[
                          mode === 'all' ? 'max-w-6' : 'max-w-8',
                          { 'min-h-0.5': entry.total },
                        ]"
                        :style="{ height: `${(entry.total / max) * 100}%`, marginInline: '1px' }"
                      >
                        <span
                          class="absolute bottom-full mb-1 hidden rounded-sm bg-inverted px-1.5 py-0.5 whitespace-nowrap text-inverted group-hover:block group-focus-visible:block"
                          :class="labelPosition(index)"
                          >{{ entry.total }} 抽</span
                        >
                      </span>
                    </span>
                    <span class="relative py-1">{{ entry.version }}</span>
                  </button>
                </div>
              </Transition>
            </div>
          </div>
          <Transition :name="`page-btn-${buttonMotion ?? 'left'}`">
            <button
              v-if="mode === 'major' && page > 0"
              type="button"
              class="absolute left-0 top-20 -translate-y-1/2 z-10 flex items-center justify-center size-7 rounded-full bg-navy-900/70 text-white backdrop-blur-sm border border-white/20 hover:bg-navy-800/85 hover:border-gold-300/60 transition-colors cursor-pointer"
              aria-label="上一個大版本"
              @click="turn(-1)"
            >
              <UIcon name="i-lucide-chevron-left" class="size-5" />
            </button>
          </Transition>
          <Transition :name="`page-btn-${buttonMotion ?? 'right'}`">
            <button
              v-if="mode === 'major' && page < pages.length - 1"
              type="button"
              class="absolute right-0 top-20 -translate-y-1/2 z-10 flex items-center justify-center size-7 rounded-full bg-navy-900/70 text-white backdrop-blur-sm border border-white/20 hover:bg-navy-800/85 hover:border-gold-300/60 transition-colors cursor-pointer"
              aria-label="下一個大版本"
              @click="turn(1)"
            >
              <UIcon name="i-lucide-chevron-right" class="size-5" />
            </button>
          </Transition>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="open"
      :title="`${selected?.version} 版本・共 ${selected?.total} 抽`"
      :ui="{ content: 'max-w-2xl' }"
    >
      <template #body>
        <ul v-if="selected?.fives.length" class="grid grid-cols-4 gap-3 sm:grid-cols-6">
          <li v-for="five in selected.fives.toReversed()" :key="five.id" :title="five.time">
            <ToolWishItemCard
              v-if="items.get(five.itemId)"
              :item="items.get(five.itemId)!"
              :pity="five.pity"
              :status="wishUpStatus(five)"
              :emphasize-up="emphasizeUp"
            />
            <p v-else class="rounded-lg bg-accented p-2 text-sm tabular-nums">
              #{{ five.itemId }}・{{ five.pity }}
            </p>
          </li>
        </ul>
        <p v-else class="text-muted">這個版本沒有抽到 5 星。</p>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.page-btn-fade-enter-active,
.page-btn-fade-leave-active,
.page-btn-left-enter-active,
.page-btn-left-leave-active,
.page-btn-right-enter-active,
.page-btn-right-leave-active {
  transition:
    opacity 0.15s ease-in-out,
    transform 0.15s ease-in-out;
}
.page-btn-fade-enter-from,
.page-btn-fade-leave-to,
.page-btn-left-enter-from,
.page-btn-left-leave-to,
.page-btn-right-enter-from,
.page-btn-right-leave-to {
  opacity: 0;
}
/* 位移與圖表兩側留白（px-9）的伸縮一致，按鈕會跟著圖表邊緣一起移動 */
.page-btn-left-enter-from,
.page-btn-left-leave-to {
  transform: translateX(-2.25rem);
}
.page-btn-right-enter-from,
.page-btn-right-leave-to {
  transform: translateX(2.25rem);
}

.chart-next-enter-active,
.chart-next-leave-active,
.chart-prev-enter-active,
.chart-prev-leave-active,
.chart-fade-enter-active,
.chart-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.chart-next-enter-from,
.chart-next-leave-to,
.chart-prev-enter-from,
.chart-prev-leave-to,
.chart-fade-enter-from,
.chart-fade-leave-to {
  opacity: 0;
}
.chart-next-enter-from,
.chart-prev-leave-to {
  transform: translateX(2rem);
}
.chart-next-leave-to,
.chart-prev-enter-from {
  transform: translateX(-2rem);
}
@media (prefers-reduced-motion: reduce) {
  .chart-next-enter-from,
  .chart-next-leave-to,
  .chart-prev-enter-from,
  .chart-prev-leave-to,
  .page-btn-left-enter-from,
  .page-btn-left-leave-to,
  .page-btn-right-enter-from,
  .page-btn-right-leave-to {
    transform: none;
  }
}
</style>
