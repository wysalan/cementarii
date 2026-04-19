<script setup lang="ts">
interface Item {
  id: number;
  name: string;
  count: number;
}
const { data } = defineProps<{ data: Item }>();
</script>

<template>
  <NuxtLink
    :to="`/material/${data.id}`"
    class="flex flex-col justify-center items-center bg-zinc-100/80 ring-2 ring-zinc-300 backdrop-blur-md rounded-md min-w-20 h-full m-1"
    v-tooltip.top="data.name"
  >
    <NuxtImg
      :src="'https://assets.wysalan.com/cementarii/item-icon/UI_ItemIcon_' + data.id + '.webp'"
      :alt="data.name"
      class="w-15 h-15"
      placeholder
    />
    <div class="flex flex-col justify-center items-center h-10 w-full">
      <p class="text-black">{{ data.count }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped></style>
