<script setup lang="ts">
import { useRoute } from "vue-router";
import { siteConfig, storageConfig } from "@/site.config";
import Overview from "@/components/Character/Overview.vue";
import Talent from "@/components/Character/Talent.vue";
import Constellation from "@/components/Character/Constellation.vue";
import Story from "@/components/Character/Story.vue";
import VoiceOver from "@/components/Character/VoiceOver.vue";

definePageMeta({
  layout: "detail",
});

const { slug } = useRoute().params;
const { data: characterData, status, error } = await useFetch(`/api/character/${slug}`);

useSeoMeta({
  title: `${characterData.value?.name || "找不到角色"} | ${siteConfig.title}`,
});

// Tabs
const tabs: Record<string, { component: Component; icon: string }> = {
  總覽: { component: Overview, icon: "i-lucide-user-round" },
  天賦: { component: Talent, icon: "i-lucide-sparkles" },
  命之座: { component: Constellation, icon: "i-lucide-star" },
  故事: { component: Story, icon: "i-lucide-book-open" },
  語音: { component: VoiceOver, icon: "i-lucide-mic" },
};

const currentTab = ref("總覽");

// Extract Image Color
import { getColorSync, getPaletteSync } from "colorthief";
import type { Color } from "colorthief";
const imageColors = ref<Record<string, Color | Color[] | null>>({
  color: null,
  palette: null,
});
const extractingImgColor = ref(true);

onMounted(() => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = `${storageConfig.baseUrl}/avatar-img/${characterData.value?.images?.AvatarImg}.webp`;
  img.onload = () => {
    imageColors.value.color = getColorSync(img);
    imageColors.value.palette = getPaletteSync(img, { colorCount: 5 });
    extractingImgColor.value = false;
  };
});

const outfits = characterData.value?.outfits;
const outfitsObject = outfits
  ? Object.fromEntries(outfits.map((outfit) => [outfit.name, outfit]))
  : {};

const outfitList = computed(() => {
  if (outfits) {
    const list: string[] = [];
    outfits.map((outfit) => {
      list.push(outfit.name);
    });
    return list;
  }
  return [];
});

const selectedOutfit = ref<string | undefined>(outfitList.value?.[0]);

const outfitImgs = computed(() => {
  if (selectedOutfit.value) {
    return {
      AvatarIcon: outfitsObject[selectedOutfit.value]?.images.AvatarIcon,
      AvatarImg: outfitsObject[selectedOutfit.value]?.images.AvatarImg,
    };
  }
});
</script>

<template>
  <Body :style="'background: ' + imageColors.color" v-if="!extractingImgColor" />
  <!-- 固定深色：不論站台主題，角色頁元件與面板一律使用深色變數 -->
  <main class="dark" v-if="status === 'success' && characterData">
    <!-- 立繪背景（排除 header 列，從 68px 起算） -->
    <div
      class="fixed -z-1 inset-x-0 top-17 bottom-0 bg-cover bg-center"
      :style="`background-image: url(${storageConfig.baseUrl}/avatar-img/${outfitImgs?.AvatarImg}.webp)`"
    ></div>
    <!-- 漸層壓暗，確保面板可讀性 -->
    <div
      class="fixed -z-1 inset-0 bg-linear-to-t from-black/10 via-transparent to-black/10 pointer-events-none"
    ></div>

    <div class="container mx-auto">
      <KeepAlive>
        <component
          :is="tabs[currentTab]?.component"
          :data="characterData"
          v-model:outfitList="outfitList"
          v-model:selectedOutfit="selectedOutfit"
          v-model:outfitImgs="outfitImgs"
        />
      </KeepAlive>
    </div>

    <!-- 桌面版：左側菱形導覽軌（模仿遊戲內角色介面） -->
    <nav
      class="hidden xl:flex fixed left-12 top-1/2 -translate-y-1/2 z-20 flex-col gap-5"
      aria-label="角色頁面分頁"
    >
      <button
        v-for="(tab, name) in tabs"
        :key="name"
        type="button"
        class="group flex items-center justify-start gap-3 cursor-pointer"
        :aria-current="currentTab === name ? 'page' : undefined"
        @click="currentTab = name"
      >
        <span
          class="flex items-center justify-center w-10 h-10 rotate-45 rounded-xs border-2 backdrop-blur-sm transition-colors"
          :class="
            currentTab === name
              ? 'bg-gold-400 border-gold-200 shadow-[0_0_12px_rgba(211,188,142,0.7)]'
              : 'bg-navy-900/70 border-white/40 group-hover:border-gold-300'
          "
        >
          <UIcon
            :name="tab.icon"
            class="-rotate-45 size-5"
            :class="currentTab === name ? 'text-navy-900' : 'text-white/90'"
          />
        </span>
        <span
          class="text-sm font-semibold px-2 py-0.5 rounded-md bg-navy-900/70 backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100"
          :class="currentTab === name ? 'text-gold-300' : 'text-white/80'"
        >
          {{ name }}
        </span>
      </button>
    </nav>

    <!-- 手機／平板版：底部膠囊導覽列 -->
    <nav
      class="xl:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[94vw]"
      aria-label="角色頁面分頁"
    >
      <div
        class="flex items-center gap-1 px-2 py-1.5 rounded-full bg-navy-900/85 backdrop-blur-md border border-gold-500/50 shadow-lg overflow-x-auto"
      >
        <button
          v-for="(tab, name) in tabs"
          :key="name"
          type="button"
          class="flex flex-col items-center min-w-fit px-3.5 py-1 rounded-full transition-colors cursor-pointer"
          :class="currentTab === name ? 'bg-gold-400 text-navy-900' : 'text-white/85'"
          :aria-current="currentTab === name ? 'page' : undefined"
          @click="currentTab = name"
        >
          <UIcon :name="tab.icon" class="size-5" />
          <span class="text-xs font-semibold whitespace-nowrap">{{ name }}</span>
        </button>
      </div>
    </nav>
  </main>
  <main v-else>
    <div class="container mx-auto flex flex-col items-center pt-5 pb-10 px-4">
      <div v-if="error">
        <p>連接資料庫時發生錯誤</p>
        <p>{{ error?.statusMessage }}（狀態碼：{{ error?.statusCode }}）</p>
      </div>
      <p v-else>目前尚無此角色資料</p>
    </div>
  </main>
</template>

<style scoped></style>
