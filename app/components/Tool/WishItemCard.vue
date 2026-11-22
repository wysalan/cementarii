<script setup lang="ts">
import { storageConfig } from "@/site.config";

const { item, pity, status, emphasizeUp } = defineProps<{
  item: WishItem;
  /** 第幾抽出的 */
  pity?: number;
  /** 有沒有歪；不知道是不是 UP 時不傳 */
  status?: WishUpStatus;
  /** 把歪掉的變成灰階，突顯 UP 的 */
  emphasizeUp?: boolean;
}>();

const folder = computed(() => (item.kind === "character" ? "avatar-icon" : "weapon-icon"));

const RING: Record<WishUpStatus, string> = {
  won: "ring-2 ring-green-500/60",
  lost: "ring-2 ring-red-500/60",
  guaranteed: "ring-2 ring-orange-400/60",
};

const faded = computed(() => emphasizeUp && status === "lost");
</script>

<template>
  <NuxtLink
    :to="`/${item.kind}/${item.slug}`"
    class="flex flex-col items-center bg-parchment-200 rounded-lg hover:scale-105 transition ease-in-out"
    :class="
      status
        ? faded
          ? 'ring-2 ring-gray-400/60'
          : RING[status]
        : ['hover:ring-2', rarityRing(item.rarity)]
    "
  >
    <div class="relative w-full">
      <NuxtImg
        :src="`${storageConfig.baseUrl}/${folder}/${item.icon}.webp`"
        :alt="item.name"
        width="96"
        height="96"
        class="w-full aspect-square mask-[linear-gradient(to_bottom,black_85%,transparent_100%)] rounded-t-lg bg-linear-to-b"
        :class="[rarityGradient(item.rarity), { 'grayscale brightness-75': faded }]"
        placeholder
      />
      <span
        v-if="pity"
        class="absolute top-1 right-1 px-1.5 rounded-md bg-navy-950/80 text-sm font-semibold text-white tabular-nums"
        >{{ pity }}</span
      >
    </div>
    <p class="flex items-center min-h-10 px-1 py-1 text-sm text-center text-navy-800 break-all">
      {{ item.name }}
    </p>
    <span v-if="status" class="sr-only">{{ WISH_UP_LABEL[status] }}</span>
  </NuxtLink>
</template>
