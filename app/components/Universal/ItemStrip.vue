<script setup lang="ts">
// 素材卡橫向清單：內容溢出時顯示左右切換按鈕
interface Item {
  id: number;
  name: string;
  count: number;
}

const { items } = defineProps<{ items: Item[] }>();

const scrollEl = ref<HTMLElement | null>(null);
const canLeft = ref(false);
const canRight = ref(false);

const update = () => {
  const el = scrollEl.value;
  if (!el) return;
  canLeft.value = el.scrollLeft > 1;
  canRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
};

const scrollByDir = (dir: number) => {
  const el = scrollEl.value;
  el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
};

let ro: ResizeObserver | undefined;
onMounted(() => {
  update();
  ro = new ResizeObserver(update);
  if (scrollEl.value) ro.observe(scrollEl.value);
});
onBeforeUnmount(() => ro?.disconnect());
// 素材數量隨等級／計算方式變動時重新判斷
watch(
  () => items,
  () => nextTick(update),
);
</script>

<template>
  <div class="relative w-full min-w-0">
    <div
      ref="scrollEl"
      class="flex flex-row justify-start max-w-full overflow-x-auto gap-1"
      @scroll.passive="update"
    >
      <UniversalItem v-for="(item, key) in items" :key="key" :data="item" />
    </div>
    <Transition name="strip-btn">
      <button
        v-if="canLeft"
        type="button"
        class="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center size-7 rounded-full bg-navy-900/70 text-white backdrop-blur-sm border border-white/20 hover:bg-navy-800/85 hover:border-gold-300/60 transition-colors cursor-pointer"
        aria-label="向左捲動素材列"
        @click="scrollByDir(-1)"
      >
        <UIcon name="i-lucide-chevron-left" class="size-5" />
      </button>
    </Transition>
    <Transition name="strip-btn">
      <button
        v-if="canRight"
        type="button"
        class="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center size-7 rounded-full bg-navy-900/70 text-white backdrop-blur-sm border border-white/20 hover:bg-navy-800/85 hover:border-gold-300/60 transition-colors cursor-pointer"
        aria-label="向右捲動素材列"
        @click="scrollByDir(1)"
      >
        <UIcon name="i-lucide-chevron-right" class="size-5" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.strip-btn-enter-active,
.strip-btn-leave-active {
  transition: opacity 0.2s ease;
}
.strip-btn-enter-from,
.strip-btn-leave-to {
  opacity: 0;
}
</style>
