<script setup lang="ts">
import { storageConfig } from "@/site.config";
import { useUserStore } from "@/stores/User";
const store = useUserStore();

import type { CharacterListItem } from "@/types/api";
const { data } = defineProps<{ data: CharacterListItem }>();
const { t } = useI18n();

const avatar = computed(() => (store.useCostumeIcon && data.costumeIcon) || data.icon);
</script>

<template>
  <NuxtLink
    :to="`/character/${data.slug}`"
    class="flex flex-col justify-center items-center bg-parchment-200 rounded-lg hover:scale-105 hover:ring-2 transition ease-in-out"
    :class="data.rarity === 4 ? 'ring-[#9c75b7]' : 'ring-[#b27330]'"
  >
    <div class="relative">
      <NuxtImg
        :src="`${storageConfig.baseUrl}/avatar-icon/${avatar}.webp`"
        :alt="data.name"
        width="96"
        height="96"
        class="w-25 h-25 lg:w-35 lg:h-35 mask-[linear-gradient(to_bottom,black_85%,transparent_100%)] rounded-t-lg"
        :class="
          data.rarity === 4
            ? 'bg-linear-to-b from-[#5e5789] to-[#9c75b7]'
            : 'bg-linear-to-b from-[#945c2c] to-[#b27330]'
        "
        placeholder
      />
      <div class="absolute top-1.25 left-1.25">
        <NuxtImg
          :src="`${storageConfig.baseUrl}/elements/${data.element}.png`"
          :alt="
            t('character.overview.profile.elementIcon', { element: t(`element.${data.element}`) })
          "
          width="30"
          height="30"
          placeholder
          class="w-6.25 h-6.25 md:w-7.5 md:h-7.5 bg-navy-950/60 rounded-lg"
          v-if="data.element"
        />
      </div>
    </div>
    <div class="flex flex-col justify-center items-center h-10 w-full text-navy-800">
      <p>{{ data.name }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped></style>
