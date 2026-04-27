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
  <div class="flex flex-col w-full h-85vh justify-start items-center overflow-y-auto mt-5">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-20 md:mb-15">
      <Card
        v-for="(constellation, key) in data.constellation?.list"
        :key="key"
        :pt="{ root: { class: 'bg-zinc-600/70! backdrop-blur-lg shadow-md' } }"
        class="w-full"
      >
        <template #title>
          <h2 class="text-white text-2xl py-2">{{ key + 1 }}. {{ constellation.name }}</h2>
        </template>
        <template #content>
          <div class="flex text-white">
            <p
              v-html="parseDescriptionText(constellation.description, skills, dictionary)"
              @click="handleInsideClick"
              class="text-lg"
            ></p>
          </div>
        </template>
      </Card>
    </div>
    <Dialog
      v-model:visible="dialogVisible"
      modal
      :header="popupData.title"
      class="w-75vw lg:w-50vw text-white!"
      :pt="{
        root: { class: 'bg-zinc-600/70! backdrop-blur-lg' },
        header: { class: 'border-b-2 opacity-80 mb-5 py-2' },
      }"
    >
      <div class="flex flex-col gap-5">
        <h2 class="text-2xl font-semibold">{{ popupData.name }}</h2>
        <p
          v-html="parseDescriptionText(popupData.description, skills, dictionary)"
          class="text-lg"
        ></p>
      </div>
    </Dialog>
  </div>
</template>

<style scoped></style>
