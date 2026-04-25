<script setup lang="ts">
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import { useUserStore } from "@/stores/User";
const store = useUserStore();

interface Dictionary {
  talentKeywords: string[];
  constellationKeywords: string[];
  relatedEffects: Record<string, string>;
  linkToEffect: Record<string, string>;
}

import useDataParser from "@/composables/useDataParser";
const { parseDescriptionText, parseTalentAttributes } = useDataParser();

const talentsList = Object.values(data.talents?.list || {});
const talentsNameList = Object.keys(data.talents?.list || {});
const talentMap = Object.fromEntries(talentsList.map(({ name, ...rest }) => [name, rest]));
const dictionary: Dictionary | null = data.dictionary;

const talentsLevel = ref([
  store.defaultTalentLevel,
  store.defaultTalentLevel,
  store.defaultTalentLevel,
]);

const popupData = ref({
  title: "",
  name: "",
  description: "",
});

const dialogVisible = ref(false);

const handleInsideClick = (event: MouseEvent) => {
  const target = (event.target as Element)?.closest("[data-name]");
  if (!target) return;
  const type = (target as HTMLElement).dataset.type;
  const name = (target as HTMLElement).dataset.name;
  if (type && name) {
    if (type === "effect") {
      popupData.value = {
        title: "相關效果",
        name: name,
        description: dictionary?.relatedEffects[name] || "",
      };
    } else if (type === "talent") {
      popupData.value = {
        title: "相關天賦",
        name: name,
        description: talentMap[name]?.description || "",
      };
    } else if (type === "related") {
      popupData.value = {
        title: "相關效果",
        name: name,
        description: dictionary?.relatedEffects[name] || "",
      };
    } else {
      popupData.value = {
        title: "錯誤",
        name: "無法取得資料",
        description: "尚未設定此效果說明",
      };
    }
    dialogVisible.value = true;
  }
};

const needMaterials = computed(() => {
  return (end = 10) => {
    const map = new Map();
    data.talents?.costs
      .slice(0, end - 1)
      .flat()
      .forEach((item) => {
        if (map.has(item.id)) {
          map.get(item.id)!.count += item.count;
        } else {
          map.set(item.id, { ...item });
        }
      });
    return [...map.values()].sort((a, b) => a.id - b.id);
  };
});
</script>

<template>
  <div class="flex flex-col w-full h-85vh justify-start items-center overflow-y-auto mt-5">
    <div class="flex flex-col gap-5 w-full">
      <Card
        v-for="(talent, index) in talentsList"
        :key="index"
        :pt="{ root: { class: 'bg-zinc-600/70 backdrop-blur-lg shadow-md px-3' } }"
      >
        <template #title>
          <h2 class="text-white text-2xl py-2">{{ talent.name }}</h2>
        </template>
        <template #content>
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-10 items-center text-white">
            <p
              v-html="parseDescriptionText(talent.description, dictionary)"
              class="lg:text-lg"
              @click="handleInsideClick"
            ></p>
            <div class="flex flex-col gap-3">
              <div
                class="flex flex-row items-center gap-5"
                v-if="!talentsNameList[index]?.includes('Special')"
              >
                <div
                  class="bg-zinc-300 rounded-sm p-2 w-20 text-center select-none font-semibold text-black"
                >
                  Lv. <span class="font-bold">{{ talentsLevel[index] }}</span>
                </div>
                <Slider v-model="talentsLevel[index]" :min="1" :max="15" :step="1" class="w-full" />
              </div>
              <div
                class="flex flex-row justify-between text-sm lg:text-lg gap-10"
                v-for="prop in parseTalentAttributes(talent, talentsLevel[index] || 1)"
              >
                <p class="font-semibold text-white opacity-80">{{ prop.text }}</p>
                <p>{{ prop.value }}</p>
              </div>
              <div
                class="flex flex-col w-full gap-3"
                v-if="!talentsNameList[index]?.includes('Special')"
              >
                <Divider align="center" :pt="{ root: { class: 'm-0' } }" />
                <p class="text-lg font-semibold">所需素材</p>
                <div
                  class="flex flex-row justify-start min-w-full overflow-x-auto gap-3"
                  v-if="needMaterials(talentsLevel[index])?.toString().length"
                >
                  <UniversalItem
                    v-for="(item, key) in needMaterials(talentsLevel[index])"
                    :data="item"
                    :key="key"
                  />
                </div>
                <div v-else>
                  <p>無</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>
    <!-- 被動技能 -->
    <div class="flex flex-col gap-5 w-full mt-5 mb-20 md:mb-15">
      <Card
        v-for="(passive, key) in data.passives"
        :key="key"
        :pt="{ root: { class: 'bg-zinc-600/70 backdrop-blur-lg' } }"
        class="min-w-full"
      >
        <template #title>
          <h2 class="text-white text-2xl py-2">{{ passive.name }}</h2>
        </template>
        <template #content>
          <div class="flex gap-10 items-center text-white">
            <p
              v-html="parseDescriptionText(passive.description, dictionary)"
              class="text-lg"
              @click="handleInsideClick"
            ></p>
          </div>
        </template>
      </Card>
    </div>
    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="popupData.title"
      class="w-75vw lg:w-50vw text-white"
      :pt="{
        root: { class: 'bg-zinc-600/70 backdrop-blur-lg' },
        header: { class: 'border-b-2 opacity-80 mb-5 py-2' },
      }"
    >
      <div class="flex flex-col gap-5">
        <h2 class="text-2xl font-semibold">{{ popupData.name }}</h2>
        <p v-html="parseDescriptionText(popupData.description, dictionary)" class="text-lg"></p>
      </div>
    </Dialog>
  </div>
</template>

<style scoped></style>
