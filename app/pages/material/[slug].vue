<script setup lang="ts">
import { siteConfig, storageConfig } from "@/site.config";
import materialList from "@/data/materialList.json";

interface MaterialData {
  id: number;
  name: {
    CHT: string;
    EN: string;
  };
  category: string;
  rarity: number;
  typeText: string;
  description: string;
  sources: string[];
  icon: string;
}

definePageMeta({
  layout: "detail",
});

const { slug } = useRoute().params;
const data: MaterialData | undefined = materialList.find(
  (material) => material.id.toString() === slug,
);
import { useUserStore } from "@/stores/User";
const store = useUserStore();

useSeoMeta({
  title: `${data?.name.CHT || "找不到素材"} | ${siteConfig.title}`,
});

// Functions
</script>

<template>
  <main class="container mx-auto max-lg:mb-5 mt-3" v-if="data">
    <div class="flex flex-col h-fit mx-4 sm:mx-5 max-w-3xl lg:mx-auto">
      <div class="flex px-5 py-2 rounded-t-lg" :class="rarityBar(data?.rarity)">
        <p class="text-xl font-semibold text-white">
          {{ data?.name.CHT }}
        </p>
      </div>
      <div
        class="flex justify-center items-center h-60 md:h-50 relative shadow-md bg-linear-to-br"
        :class="rarityGradient(data?.rarity)"
      >
        <NuxtImg
          :src="`${storageConfig.baseUrl}/item-icon/${data?.icon}.webp`"
          class="w-45 h-45 max-md:py-5 object-contain"
        />
        <div class="absolute top-3 left-5 flex">
          <p class="select-none text-white font-semibold opacity-90 text-lg">
            {{ data?.typeText }}
          </p>
        </div>
        <div class="absolute bottom-3 left-5 flex flex-row gap-1">
          <p class="select-none text-yellow-400 font-semibold text-lg" v-for="n in data?.rarity">
            ★
          </p>
        </div>
      </div>
      <div
        class="flex flex-col gap-5 bg-parchment-200 p-5 rounded-b-lg h-full text-navy-800 shadow-md"
      >
        <div class="flex flex-col gap-3">
          <p
            v-html="parseStoryContent(data?.description, store.name, store.playerGender)"
            class="text-lg opacity-80"
          ></p>
        </div>
        <div class="flex flex-col gap-3" v-if="data?.sources.length">
          <div class="flex flex-row justify-start items-center gap-1">
            <UIcon name="i-lucide-map-pin" />
            <p class="font-semibold">來源</p>
          </div>
          <div class="rounded-md border-2 border-parchment-300 p-3" v-for="source in data?.sources">
            <p>{{ source }}</p>
          </div>
        </div>
      </div>
    </div>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10">
      <p class="text-lg">目前無此素材資料</p>
    </div>
  </main>
</template>

<style scoped></style>
