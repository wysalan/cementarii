<script setup lang="ts">
import { objectFromEntries } from "ts-extras";
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import { useUserStore } from "@/stores/User";
const store = useUserStore();

interface Dictionary {
  relatedEffects: Record<string, string>;
  linkToEffect: Record<string, string>;
  linkToTalent: Record<string, string>;
  linkToPassive: Record<string, string>;
  linkToConstellation: Record<string, string>;
}

import useDataParser from "@/composables/useDataParser";
const { parseDescriptionText, parseTalentAttributes } = useDataParser();

const talentsList = Object.values(data.talents?.list || {});
const talentsNameList = Object.keys(data.talents?.list || {});
const dictionary: Dictionary | null = data.dictionary;

const skills = objectFromEntries([
  ["talents", Object.values(data.talents!.list)],
  ["passives", data.passives!],
  ["constellation", data.constellation?.list],
] as const);

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
  const talentsList = Object.fromEntries(skills.talents.map(({ name, ...rest }) => [name, rest]));
  const passivesList = Object.fromEntries(skills.passives.map(({ name, ...rest }) => [name, rest]));
  const constellationList = Object.fromEntries(
    skills.constellation?.map(({ name, ...rest }) => [name, rest]) || [],
  );
  if (type && name) {
    if (type === "talent") {
      popupData.value = {
        title: "相關突破天賦",
        name: name,
        description: talentsList[name]?.description || "",
      };
    } else if (type === "passive") {
      popupData.value = {
        title: "相關固有天賦",
        name: name,
        description: passivesList[name]?.description || "",
      };
    } else if (type === "constellation") {
      popupData.value = {
        title: "相關命之座",
        name: name,
        description: constellationList[name]?.description || "",
      };
    } else if (type === "effect") {
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
  <div class="flex flex-col w-full h-[85vh] justify-start items-center overflow-y-auto mt-5 px-4">
    <div class="flex flex-col gap-5 w-full">
      <section
        v-for="(talent, index) in talentsList"
        :key="index"
        class="bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-6 text-parchment-100"
      >
        <h2 class="gi-diamond text-white text-lg md:text-xl font-semibold pb-4">
          {{ talent.name }}
        </h2>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-10 items-center">
          <p
            v-html="parseDescriptionText(talent.description, skills, dictionary)"
            class="text-sm md:text-base"
            @click="handleInsideClick"
          ></p>
          <div class="flex flex-col gap-3">
            <div
              class="flex flex-row items-center gap-5"
              v-if="!talentsNameList[index]?.includes('Special')"
            >
              <div
                class="bg-gold-400 rounded-sm p-2 w-20 text-center select-none font-semibold text-navy-900"
              >
                Lv. <span class="font-bold">{{ talentsLevel[index] }}</span>
              </div>
              <USlider v-model="talentsLevel[index]" :min="1" :max="15" :step="1" class="w-full" />
            </div>
            <div
              class="flex flex-row justify-between text-sm md:text-base gap-10"
              v-for="prop in parseTalentAttributes(talent, talentsLevel[index] || 1)"
            >
              <p class="font-semibold text-parchment-100/80">{{ prop.text }}</p>
              <p class="text-white">{{ prop.value }}</p>
            </div>
            <div
              class="flex flex-col w-full gap-3"
              v-if="!talentsNameList[index]?.includes('Special')"
            >
              <USeparator />
              <p class="text-base font-semibold text-white">所需素材</p>
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
      </section>
    </div>
    <!-- 被動技能 -->
    <div class="flex flex-col gap-5 w-full mt-5 mb-24 md:mb-20">
      <section
        v-for="(passive, key) in data.passives"
        :key="key"
        class="bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-6 text-parchment-100 min-w-full"
      >
        <h2 class="gi-diamond text-white text-lg md:text-xl font-semibold pb-4">
          {{ passive.name }}
        </h2>
        <p
          v-html="parseDescriptionText(passive.description, skills, dictionary)"
          class="text-sm md:text-base"
          @click="handleInsideClick"
        ></p>
      </section>
    </div>
    <UModal
      v-model:open="dialogVisible"
      :title="popupData.title"
      :close="{ class: 'text-parchment-100 hover:text-white hover:bg-white/10 active:text-white active:bg-white/20' }"
      :ui="{
        content:
          'max-w-[75vw] lg:max-w-[50vw] bg-navy-900/85 backdrop-blur-lg text-parchment-100 border border-gold-500/30 divide-white/10',
        title: 'text-gold-300',
      }"
    >
      <template #body>
        <div class="flex flex-col gap-5">
          <h2 class="text-lg md:text-xl font-semibold text-white">{{ popupData.name }}</h2>
          <p
            v-html="parseDescriptionText(popupData.description, skills, dictionary)"
            class="text-sm md:text-base"
          ></p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped></style>
