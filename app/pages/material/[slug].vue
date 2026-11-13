<script setup lang="ts">
import { siteConfig, storageConfig } from "@/site.config";
import { useUserStore } from "@/stores/User";
definePageMeta({
  layout: "detail",
});

const { locale, t } = useI18n();
const { slug } = useRoute().params;
const event = useRequestEvent();
const { data, status, error } = await useFetch(`/api/material/${slug}`, {
  query: { locale },
});

if (event && error.value?.status === 404) {
  setResponseStatus(event, 404);
}

const store = useUserStore();

useSeoMeta({
  title: () => `${data.value?.name || "找不到素材"} | ${siteConfig.title}`,
});
</script>

<template>
  <main class="container mx-auto max-lg:mb-5 mt-3" v-if="status === 'success' && data">
    <div class="flex flex-col h-fit mx-4 sm:mx-5 max-w-3xl lg:mx-auto">
      <div class="flex px-5 py-2 rounded-t-lg" :class="rarityBar(data.rarity)">
        <p class="text-xl font-semibold text-white">
          {{ data.name }}
        </p>
      </div>
      <div
        class="flex justify-center items-center h-60 md:h-50 relative shadow-md bg-linear-to-br"
        :class="rarityGradient(data.rarity)"
      >
        <NuxtImg
          :src="`${storageConfig.baseUrl}/item-icon/${data.icon}.webp`"
          class="w-45 h-45 max-md:py-5 object-contain"
        />
        <div class="absolute top-3 left-5 flex">
          <p class="select-none text-white font-semibold opacity-90 text-lg">
            {{ data.typeText }}
          </p>
        </div>
        <div class="absolute bottom-3 left-5 flex flex-row gap-1">
          <p class="select-none text-yellow-400 font-semibold text-lg" v-for="n in data.rarity">
            ★
          </p>
        </div>
      </div>
      <div
        class="flex flex-col gap-5 bg-parchment-200 p-5 rounded-b-lg h-full text-navy-800 shadow-md"
      >
        <div class="flex flex-col gap-3">
          <p
            v-html="parseStoryContent(data.description, store.name, store.playerGender)"
            class="text-lg opacity-80"
          ></p>
        </div>
        <div class="flex flex-col gap-3" v-if="data.sources?.length">
          <div class="flex flex-row justify-start items-center gap-1">
            <UIcon name="i-lucide-map-pin" />
            <p class="font-semibold">來源</p>
          </div>
          <div class="rounded-md border-2 border-parchment-300 p-3" v-for="source in data.sources">
            <p>{{ source }}</p>
          </div>
        </div>
      </div>
    </div>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10">
      <p v-if="error?.status === 404" class="text-lg">目前無此素材資料</p>
      <template v-else>
        <p>{{ t("common.error.server") }}</p>
        <p>{{ t("common.error.statusCode", { code: error?.status }) }}</p>
        <p>{{ t("common.error.statusText", { message: error?.statusText }) }}</p>
      </template>
    </div>
  </main>
</template>

<style scoped></style>
