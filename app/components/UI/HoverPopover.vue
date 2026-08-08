<script setup lang="ts">
// 滑過 [data-name] 連結時顯示的浮動說明卡（事件委派＋手動定位）
interface PopoverData {
  title: string;
  name: string;
  html: string;
}

const { resolve } = defineProps<{
  resolve: (type: string, name: string) => PopoverData | null;
}>();

const popover = ref<{
  data: PopoverData;
  x: number;
  y: number;
  above: boolean;
} | null>(null);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

const handleHover = (event: MouseEvent) => {
  const target = (event.target as Element)?.closest("[data-name]") as HTMLElement | null;
  if (!target) return;
  const type = target.dataset.type;
  const name = target.dataset.name;
  if (!type || !name) return;
  const data = resolve(type, name);
  if (!data) return;
  clearTimeout(hideTimer);
  const rect = target.getBoundingClientRect();
  const above = rect.bottom + 240 > window.innerHeight;
  const rawX = rect.left + rect.width / 2;
  const x = Math.min(Math.max(rawX, 176), window.innerWidth - 176);
  popover.value = {
    data,
    x,
    y: above ? rect.top - 8 : rect.bottom + 8,
    above,
  };
};

const scheduleHide = () => {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => (popover.value = null), 150);
};

const cancelHide = () => clearTimeout(hideTimer);
</script>

<template>
  <div @mouseover="handleHover" @mouseout="scheduleHide">
    <slot />
  </div>
  <!-- 容器有 transform 時 fixed 會失效，因此傳送至 body -->
  <Teleport to="body">
    <Transition name="hover-popover">
      <div
        v-if="popover"
        class="fixed z-50 w-100 max-w-[90vw] rounded-lg bg-navy-900/90 backdrop-blur-lg border border-gold-500/30 shadow-lg p-4 text-parchment-100"
        :style="{
          left: popover.x + 'px',
          top: popover.y + 'px',
          transform: popover.above ? 'translate(-50%, -100%)' : 'translateX(-50%)',
        }"
        @mouseenter="cancelHide"
        @mouseleave="scheduleHide"
      >
        <p class="text-xs font-semibold text-gold-300">{{ popover.data.title }}</p>
        <h3 class="text-sm md:text-base font-semibold text-white pb-2">
          {{ popover.data.name }}
        </h3>
        <p v-html="popover.data.html" class="text-sm max-h-60 overflow-y-auto"></p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.hover-popover-enter-active,
.hover-popover-leave-active {
  transition: opacity 0.2s ease;
}
.hover-popover-enter-from,
.hover-popover-leave-to {
  opacity: 0;
}
</style>
