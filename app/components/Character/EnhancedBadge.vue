<script setup lang="ts">
// 根元素是 UTooltip，外層傳入的 class 等屬性改綁在按鈕上
defineOptions({ inheritAttrs: false });
const { enhanced } = defineProps<{ enhanced: boolean }>();
const emit = defineEmits<{ toggle: [] }>();
const active = defineModel<boolean>("active", { default: false });
const { t } = useI18n();

// 觸控裝置只用點擊切換版本，不觸發差異標示
const onEnter = (event: PointerEvent) => {
  if (enhanced && event.pointerType === "mouse") active.value = true;
};
const onLeave = () => (active.value = false);
const onClick = () => {
  active.value = false;
  emit("toggle");
};
onBeforeUnmount(() => (active.value = false));
</script>

<template>
  <!-- 提示文字：popover 的 z-index 為 50，tooltip 需要在它之上 -->
  <UTooltip
    :text="t(enhanced ? 'character.enhanced.toBase' : 'character.enhanced.toEnhanced')"
    :content="{ side: 'top' }"
    :ui="{ content: 'dark z-60' }"
  >
    <button
      v-bind="$attrs"
      type="button"
      class="inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-sm border text-xs font-semibold cursor-pointer transition-colors"
      :class="
        enhanced
          ? active
            ? 'border-gold-200 bg-gold-400/35 text-gold-100'
            : 'border-gold-300/60 bg-gold-400/15 text-gold-300 hover:bg-gold-400/25'
          : 'border-white/35 bg-white/5 text-parchment-100/75 hover:bg-white/10 hover:text-parchment-100'
      "
      @pointerenter="onEnter"
      @pointerleave="onLeave"
      @click="onClick"
    >
      <UIcon :name="enhanced ? 'i-lucide-chevrons-up' : 'i-lucide-history'" class="size-3.5" />
      {{ t(enhanced ? "character.enhanced.badge" : "character.enhanced.baseBadge") }}
    </button>
  </UTooltip>
</template>
