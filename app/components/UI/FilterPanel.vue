<script setup lang="ts">
defineProps<{ isFiltered?: boolean }>();
defineEmits<{ clear: [] }>();
</script>

<template>
  <UCollapsible class="gi-panel w-full">
    <button type="button" class="flex w-full items-center gap-3 px-5 py-3 cursor-pointer group">
      <span class="gi-diamond font-semibold text-highlighted">篩選</span>
      <span
        v-if="isFiltered"
        class="text-xs rounded-full bg-gold-400 text-navy-900 font-semibold px-2 py-0.5 select-none"
      >
        篩選中
      </span>
      <UIcon
        name="i-lucide-chevron-down"
        class="ml-auto size-5 transition-transform group-data-[state=open]:rotate-180"
      />
    </button>
    <template #content>
      <div class="flex flex-col items-center gap-5 px-5 pb-5">
        <UButton
          v-if="isFiltered"
          label="清除篩選條件"
          color="primary"
          variant="solid"
          size="sm"
          class="rounded-full"
          @click="$emit('clear')"
        />
        <slot />
      </div>
    </template>
  </UCollapsible>
</template>

<style scoped></style>
