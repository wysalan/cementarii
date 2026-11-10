<script setup lang="ts">
import { useRoute } from "vue-router";
import { siteConfig, storageConfig } from "@/site.config";
import Overview from "@/components/Character/Overview.vue";
import Talent from "@/components/Character/Talent.vue";
import Constellation from "@/components/Character/Constellation.vue";
import Story from "@/components/Character/Story.vue";
import VoiceOver from "@/components/Character/VoiceOver.vue";
import { useUserStore } from "@/stores/User";

definePageMeta({
  layout: "detail",
});

const { locale, t } = useI18n();
const { slug } = useRoute().params;
const event = useRequestEvent();
const {
  data: characterData,
  status,
  error,
} = await useFetch(`/api/character/${slug}`, {
  query: { locale },
});

if (event && error.value?.status === 404) {
  setResponseStatus(event, 404);
}

// 技能名稱、技能說明、衣裝說明在各分頁有多處顯示，性別標記在這裡一次處理
const store = useUserStore();
const displayData = computed(() => {
  const data = characterData.value;
  if (!data) return data;
  const gender = (text: string | null) => applyGender(text, store.playerGender);
  return {
    ...data,
    abilities: data.abilities.map((a) => ({
      ...a,
      name: gender(a.name),
      description: gender(a.description),
    })),
    outfits: data.outfits.map((o) => ({ ...o, description: gender(o.description) })),
  };
});

// SEO
const title = computed(
  () => `${characterData.value?.name || t("character.notFoundTitle")} | ${siteConfig.title}`,
);

useSeoMeta({ title });

// 分頁
const allTabs: Record<string, { component: Component; icon: string }> = {
  overview: { component: Overview, icon: "i-lucide-user-round" },
  talent: { component: Talent, icon: "i-lucide-sparkles" },
  constellation: { component: Constellation, icon: "i-lucide-star" },
  story: { component: Story, icon: "i-lucide-book-open" },
  voiceline: { component: VoiceOver, icon: "i-lucide-mic" },
};

const tabs = computed(() => {
  const data = characterData.value;
  const hasData: Record<string, boolean> = {
    constellation: !!data?.abilities.some((a) => a.kind === "constellation"),
    story: !!data?.stories.length,
    voiceline: !!(data?.voicelines.friendship.length || data?.voicelines.battle.length),
  };
  return Object.fromEntries(Object.entries(allTabs).filter(([name]) => hasData[name] ?? true));
});

const currentTab = ref("overview");

// 擷取立繪色彩
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
  img.src = `${storageConfig.baseUrl}/avatar-img/${characterData.value?.images?.gacha}.webp`;
  img.onload = () => {
    imageColors.value.color = getColorSync(img);
    imageColors.value.palette = getPaletteSync(img, { colorCount: 5 });
    extractingImgColor.value = false;
  };
});

// 角色衣裝
const outfits = characterData.value?.outfits ?? [];
const outfitList = computed(() => outfits.map((outfit) => outfit.name));
const selectedOutfit = ref<string | undefined>(outfitList.value?.[0]);

const currentOutfit = computed(() =>
  outfits.find((outfit) => outfit.name === selectedOutfit.value),
);

const outfitImgs = computed(() => ({
  AvatarIcon: currentOutfit.value?.images.icon,
  AvatarImg: currentOutfit.value?.images.gacha,
}));
</script>

<template>
  <Body :style="'background: ' + imageColors.color" v-if="!extractingImgColor" />
  <main class="dark" v-if="status === 'success' && displayData">
    <!-- 立繪背景（排除 header 列） -->
    <div
      class="fixed -z-1 inset-x-0 top-17 bottom-0 bg-cover bg-center"
      :style="`background-image: url(${storageConfig.baseUrl}/avatar-img/${outfitImgs?.AvatarImg}.webp)`"
    ></div>
    <div
      class="fixed -z-1 inset-0 bg-linear-to-t from-black/10 via-transparent to-black/10 pointer-events-none"
    ></div>

    <div class="container mx-auto">
      <KeepAlive>
        <component
          :is="tabs[currentTab]?.component"
          :data="displayData"
          v-model:outfitList="outfitList"
          v-model:selectedOutfit="selectedOutfit"
          v-model:outfitImgs="outfitImgs"
        />
      </KeepAlive>
    </div>

    <!-- 桌面版：左側菱形導覽軌 -->
    <nav
      class="hidden xl:flex fixed left-12 top-1/2 -translate-y-1/2 z-20 flex-col gap-5"
      :aria-label="t('character.tabNav')"
    >
      <!-- 標籤以絕對定位放在按鈕右側，按鈕（hover 與點擊範圍）只有菱形本身 -->
      <button
        v-for="(tab, name) in tabs"
        :key="name"
        type="button"
        class="group relative flex w-fit cursor-pointer"
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
          class="absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap pointer-events-none text-sm font-semibold px-2 py-0.5 rounded-md bg-navy-900/70 backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          :class="currentTab === name ? 'text-gold-300' : 'text-white/80'"
        >
          {{ t(`character.tabs.${name}`) }}
        </span>
      </button>
    </nav>

    <!-- 手機／平板版：底部膠囊導覽列 -->
    <nav
      class="xl:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[94vw]"
      :aria-label="t('character.tabNav')"
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
          <span class="text-xs font-semibold whitespace-nowrap">
            {{ t(`character.tabs.${name}`) }}
          </span>
        </button>
      </div>
    </nav>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10 px-4">
      <div class="flex flex-col items-center" v-if="error?.status == 404">
        <p>{{ t("character.notFound") }}</p>
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
