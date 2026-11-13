<script setup lang="ts">
import { useRoute } from "vue-router";
import { siteConfig, storageConfig } from "@/site.config";
import type { ArtifactData } from "@/types/api";
type ArtifactSlot = ArtifactData["pieces"][number]["slot"];

import { useUserStore } from "@/stores/User";
const store = useUserStore();

definePageMeta({
  layout: "detail",
});

// 取得資料
const { locale, t } = useI18n();
const { slug } = useRoute().params;
const event = useRequestEvent();
const {
  data: artifactData,
  status,
  error,
} = await useFetch(`/api/artifact/${slug}`, {
  query: { locale },
});

if (event && error.value?.status === 404) {
  setResponseStatus(event, 404);
}

// SEO
const title = computed(
  () => `${artifactData.value?.name || t("artifact.notFoundTitle")} | ${siteConfig.title}`,
);
useSeoMeta({ title });

// 部件圖示
const SLOT_ICON: Record<ArtifactSlot, string> = {
  flower: "UI_Icon_Equip_Bracer",
  plume: "UI_Icon_Equip_Necklace",
  sands: "UI_Icon_Equip_Shoes",
  goblet: "UI_Icon_Equip_Ring",
  circlet: "UI_Icon_Equip_Dress",
};

// 部件切換
const pieces = artifactData.value?.pieces ?? [];
const currentSlot = ref<ArtifactSlot | undefined>(pieces[0]?.slot);
const currentPiece = computed(() => pieces.find((p) => p.slot === currentSlot.value));

// 套裝效果
const bonuses = computed(() => {
  const artifact = artifactData.value;
  if (!artifact) return [];
  return [
    { count: 1, text: artifact.bonus1pc },
    { count: 2, text: artifact.bonus2pc },
    { count: 4, text: artifact.bonus4pc },
  ].filter((b) => b.text);
});

// Functions
</script>

<template>
  <main class="container mx-auto mb-6 mt-3" v-if="status === 'success' && artifactData">
    <div class="grid grid-cols-1 lg:grid-cols-10 gap-5 mx-4 sm:mx-5">
      <div class="flex flex-col lg:col-span-4 lg:h-[calc(100dvh-6.5rem)]">
        <div class="flex shrink-0 px-5 py-2 bg-[#bc6832] rounded-t-lg">
          <p class="text-lg md:text-xl font-semibold text-white">{{ currentPiece?.name }}</p>
        </div>
        <div
          class="flex shrink-0 justify-center items-center relative bg-linear-to-br"
          :class="rarityGradient(artifactData.maxRarity)"
        >
          <NuxtImg
            :src="`${storageConfig.baseUrl}/relic-icon/${currentPiece?.icon}.webp`"
            :alt="currentPiece?.name"
            width="128"
            height="128"
            class="h-50 w-50"
          />
        </div>
        <div
          class="flex flex-col gap-5 bg-parchment-200 p-5 rounded-b-lg grow lg:min-h-0 lg:overflow-y-auto text-navy-800"
        >
          <div class="flex flex-row items-center">
            <h2 class="text-xl md:text-2xl font-semibold">
              {{ artifactData.name }}
            </h2>
            <p class="text-xl md:text-2xl font-bold select-none">．</p>
            <p class="text-xl md:text-2xl font-semibold opacity-50">
              {{ currentSlot && t(`artifactSlot.${currentSlot}`) }}
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <button
                v-for="piece in pieces"
                :key="piece.slot"
                type="button"
                class="flex items-center justify-center min-w-fit p-2 rounded-lg border-2 transition-colors cursor-pointer"
                :class="
                  currentSlot === piece.slot
                    ? 'bg-navy-800 border-gold-400'
                    : 'bg-navy-800/10 border-transparent hover:border-navy-800/40'
                "
                :aria-pressed="currentSlot === piece.slot"
                @click="currentSlot = piece.slot"
              >
                <NuxtImg
                  :src="`${storageConfig.baseUrl}/ui-icon/${SLOT_ICON[piece.slot]}.png`"
                  :alt="t(`artifactSlot.${piece.slot}`)"
                  width="24"
                  height="24"
                />
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-5">
              <div
                class="flex flex-col justify-center gap-1"
                v-for="bonus in bonuses"
                :key="bonus.count"
              >
                <p class="text-base md:text-lg font-semibold">
                  {{ t("artifact.bonus", { count: bonus.count }) }}
                </p>
                <p class="text-sm md:text-base whitespace-pre-line">{{ bonus.text }}</p>
              </div>
            </div>
          </div>
          <div>
            <p class="text-sm md:text-base font-semibold opacity-50">
              {{ currentPiece?.description }}
            </p>
          </div>
        </div>
      </div>
      <!-- 右側故事 -->
      <div class="flex flex-col lg:col-span-6 gi-panel lg:h-[calc(100dvh-6.5rem)]">
        <div class="flex flex-col gap-5 p-5 lg:min-h-0">
          <p class="gi-diamond text-base md:text-lg font-semibold text-highlighted shrink-0">
            {{ t("artifact.story") }}
          </p>
          <div
            class="text-sm md:text-base lg:min-h-0 lg:overflow-y-auto"
            v-html="parseStoryContent(currentPiece?.story, store.name, store.playerGender)"
          ></div>
        </div>
      </div>
    </div>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10 px-4">
      <div class="flex flex-col items-center" v-if="error?.status == 404">
        <p>{{ t("artifact.notFound") }}</p>
      </div>
      <div class="flex flex-col items-center" v-else>
        <p>{{ t("common.error.server") }}</p>
        <p>{{ t("common.error.statusCode", { code: error?.status }) }}</p>
        <p>{{ t("common.error.statusText", { message: error?.statusText }) }}</p>
      </div>
    </div>
  </main>
</template>

<style scoped></style>
