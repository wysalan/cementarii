<script setup lang="ts">
defineProps<{ placeholder?: string }>();
const keyword = defineModel<string>({ default: "" });
</script>

<template>
  <UInput
    v-model="keyword"
    icon="i-lucide-search"
    :placeholder="placeholder"
    size="lg"
    class="w-64"
    :ui="{ base: 'rounded-full' }"
  >
    <template #trailing v-if="keyword">
      <UButton
        icon="i-lucide-x"
        variant="link"
        color="neutral"
        size="xs"
        aria-label="清除搜尋"
        @click="keyword = ''"
      />
    </template>
  </UInput>
</template>

<style scoped></style>
