<script setup lang="ts">
import { useRoute } from "vue-router";

import Overview from "@/components/Character/Overview.vue";
import Talent from "@/components/Character/Talent.vue";
import Constellation from "@/components/Character/Constellation.vue";
import Story from "@/components/Character/Story.vue";
import VoiceOver from "@/components/Character/VoiceOver.vue";

// Set layout
definePageMeta({
  layout: "detail",
});

const { slug } = useRoute().params;

// Tabs
const tabs: Record<string, Component> = {
  總覽: Overview,
  天賦: Talent,
  命之座: Constellation,
  故事: Story,
  語音: VoiceOver,
};

const currentTab = ref("總覽");

function tabSwitcher(tabName: string) {
  currentTab.value = tabName;
}

// Get Data from database
const { data: characterData, pending, error } = await useFetch(`/api/character/${slug}`);

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
  img.src = `https://assets.wysalan.com/cementarii/avatar-img/${characterData.value?.images?.AvatarImg}.webp`;
  img.onload = () => {
    imageColors.value.color = getColorSync(img);
    imageColors.value.palette = getPaletteSync(img, { colorCount: 5 });
    extractingImgColor.value = false;
    console.log("Image color extracted.");
    console.log("color: " + imageColors.value.color);
    console.log("palette: " + imageColors.value.palette);
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
  <main v-if="characterData">
    <div
      class="fixed -z-1 inset-0 bg-fixed"
      :style="
        'background: url(https://assets.wysalan.com/cementarii/avatar-img/' +
        outfitImgs?.AvatarImg +
        '.webp) center center no-repeat'
      "
    ></div>
    <div class="container mx-auto">
      <KeepAlive>
        <component
          :is="tabs[currentTab]"
          :data="characterData"
          v-model:outfitList="outfitList"
          v-model:selectedOutfit="selectedOutfit"
          v-model:outfitImgs="outfitImgs"
        />
      </KeepAlive>
    </div>
    <nav class="fixed bottom-5 left-1/2 -translate-x-1/2 flex justify-center items-center">
      <Toolbar class="rounded-xl bg-white/80 backdrop-blur-sm">
        <template #center>
          <div
            class="flex flex-row md:justify-center items-center gap-5 w-80vw md:w-full overflow-x-auto"
          >
            <Button
              label="總覽"
              @click="tabSwitcher('總覽')"
              :severity="currentTab === '總覽' ? 'contrast' : 'secondary'"
              class="min-w-fit"
            />
            <Button
              label="天賦"
              @click="tabSwitcher('天賦')"
              :severity="currentTab === '天賦' ? 'contrast' : 'secondary'"
              class="min-w-fit"
            />
            <Button
              label="命之座"
              @click="tabSwitcher('命之座')"
              :severity="currentTab === '命之座' ? 'contrast' : 'secondary'"
              class="min-w-fit"
            />
            <Button
              label="故事"
              @click="tabSwitcher('故事')"
              :severity="currentTab === '故事' ? 'contrast' : 'secondary'"
              class="min-w-fit"
            />
            <Button
              label="語音"
              @click="tabSwitcher('語音')"
              :severity="currentTab === '語音' ? 'contrast' : 'secondary'"
              class="min-w-fit"
            />
          </div>
        </template>
      </Toolbar>
    </nav>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10">
      <p>Not character data available right now.</p>
    </div>
  </main>
</template>

<style scoped></style>
