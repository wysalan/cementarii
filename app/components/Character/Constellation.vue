<script setup lang="ts">
import { objectFromEntries } from "ts-extras";
import type { character } from "@/generated/prisma/client";
const { data } = defineProps<{ data: character }>();

import useDataParser from "@/composables/useDataParser";
const { parseDescriptionText } = useDataParser();

interface Dictionary {
  relatedEffects: Record<string, string>;
  linkToEffect: Record<string, string>;
  linkToTalent: Record<string, string>;
  linkToPassive: Record<string, string>;
  linkToConstellation: Record<string, string>;
}

const dictionary: Dictionary | null = data.dictionary;

const skills = objectFromEntries([
  ["talents", Object.values(data.talents!.list)],
  ["passives", data.passives!],
  ["constellation", data.constellation?.list],
] as const);

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
</script>

<template>
  <div class="flex flex-col w-full h-[85vh] justify-start items-center overflow-y-auto mt-5 px-4">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-24 md:mb-20">
      <section
        v-for="(constellation, key) in data.constellation?.list"
        :key="key"
        class="bg-navy-900/75 backdrop-blur-md border border-gold-500/30 rounded-lg shadow-lg p-6 text-parchment-100 w-full"
      >
        <h2 class="gi-diamond text-white text-2xl font-semibold pb-4">
          {{ key + 1 }}. {{ constellation.name }}
        </h2>
        <p
          v-html="parseDescriptionText(constellation.description, skills, dictionary)"
          @click="handleInsideClick"
          class="text-lg"
        ></p>
      </section>
    </div>
    <UModal
      v-model:open="dialogVisible"
      :title="popupData.title"
      :ui="{
        content:
          'max-w-[75vw] lg:max-w-[50vw] bg-navy-900/85 backdrop-blur-lg text-parchment-100 border border-gold-500/30 divide-white/10',
        title: 'text-gold-300',
      }"
    >
      <template #body>
        <div class="flex flex-col gap-5">
          <h2 class="text-2xl font-semibold text-white">{{ popupData.name }}</h2>
          <p
            v-html="parseDescriptionText(popupData.description, skills, dictionary)"
            class="text-lg"
          ></p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped></style>
