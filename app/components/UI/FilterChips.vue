<script setup lang="ts">
const { label, options } = defineProps<{ label: string; options: string[] }>();
const selected = defineModel<string[]>({ default: [] });

function toggle(option: string) {
  selected.value = selected.value.includes(option)
    ? selected.value.filter((item) => item !== option)
    : [...selected.value, option];
}
</script>

<template>
  <div class="flex flex-col justify-center items-center gap-2">
    <p class="gi-diamond text-lg font-semibold text-highlighted">{{ label }}</p>
    <div class="flex flex-wrap justify-center gap-2">
      <UButton
        v-for="option in options"
        :key="option"
        :label="option"
        :color="selected.includes(option) ? 'primary' : 'neutral'"
        :variant="selected.includes(option) ? 'solid' : 'soft'"
        class="rounded-full"
        :aria-pressed="selected.includes(option)"
        @click="toggle(option)"
      />
    </div>
  </div>
</template>

<style scoped></style>
