<script setup lang="ts">
import { storageConfig } from "@/site.config";

interface WeaponData {
  id: number;
  name: string;
  slug: string;
  rarity: number;
  weaponType: string;
  weaponText: string;
  mainStatType: string;
  mainStatText: string;
  icon: string;
}
const { data } = defineProps<{ data: WeaponData }>();
</script>

<template>
  <NuxtLink
    :to="`/weapon/${data.slug}`"
    class="flex flex-col justify-center items-center bg-parchment-200 rounded-lg hover:scale-105 hover:ring-2 transition ease-in-out"
    :class="rarityRing(data.rarity)"
  >
    <div class="relative">
      <NuxtImg
        :src="`${storageConfig.baseUrl}/weapon-icon/${data.icon}.webp`"
        :alt="data.name"
        width="96"
        height="96"
        class="w-25 h-25 lg:w-35 lg:h-35 mask-[linear-gradient(to_bottom,black_85%,transparent_100%)] rounded-t-lg bg-linear-to-b"
        :class="rarityGradient(data.rarity)"
        placeholder
      />
    </div>
    <div class="flex flex-col justify-center items-center h-10 w-full my-1">
      <p class="break-all w-20 xl:w-30 text-center text-navy-800">{{ data.name }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped></style>
