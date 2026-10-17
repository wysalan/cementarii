<script setup lang="ts">
const { label, options } = defineProps<{ label: string; options: string[] }>();
const selected = defineModel<string[]>({ default: [] });
</script>

<template>
  <USelect v-model="selected" :items="options" multiple :aria-label="label" class="w-full">
    <template #default>
      <span :class="selected.length ? 'text-highlighted' : 'text-dimmed'">
        {{ selected.length ? `${label} (${selected.length})` : label }}
      </span>
    </template>
  </USelect>
</template>

<style scoped></style>
