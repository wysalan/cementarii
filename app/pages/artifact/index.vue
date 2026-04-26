<script setup lang="ts">
import { siteConfig } from "@/site.config";
import artifactList from "@/data/artifactList.json";

useSeoMeta({
  title: `聖遺物 | ${siteConfig.title}`,
});

const artifactSearchKeyword = ref("");

const filter = ref<Record<string, string[]>>({
  rarity: ["3", "4", "5"],
  raritySelected: [],
});

const filteredArtifactList = computed(() => {
  return artifactList
    .filter((artifact) => {
      return (
        (!filter.value.raritySelected?.length ||
          filter.value.raritySelected.includes(
            artifact.rarityList[artifact.rarityList.length - 1]!.toString(),
          )) &&
        (!artifactSearchKeyword.value ||
          artifact.name
            .toLowerCase()
            .replace(" ", "")
            .includes(artifactSearchKeyword.value.toLowerCase()) ||
          artifact.slug
            .replace("-", "")
            .includes(artifactSearchKeyword.value.toLowerCase().replace(" ", "")))
      );
    })
    .sort((a, b) => {
      const maxRarityOfA = a.rarityList[a.rarityList.length - 1] || 1;
      const maxRarityOfB = b.rarityList[b.rarityList.length - 1] || 1;
      if (maxRarityOfA !== maxRarityOfB) {
        return maxRarityOfB - maxRarityOfA;
      } else {
        return b.id - a.id;
      }
    });
});

const isFiltered = computed(() => {
  return filter.value.raritySelected?.length;
});

const removeAllFilter = () => {
  filter.value.raritySelected = [];
};
</script>

<template>
  <main class="container mx-auto pt-5 pb-10">
    <div class="flex flex-col items-center pb-5">
      <Panel toggleable collapsed class="mx-3 w-75vw md:w-full rounded-xl">
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <p class="font-semibold">篩選</p>
            <Button
              label="清除篩選條件"
              rounded
              class="h-7"
              v-if="isFiltered"
              @click="removeAllFilter"
            />
          </div>
        </template>
        <div class="flex flex-col gap-5">
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">最大星級</p>
            <div class="flex flex-row gap-2">
              <SelectButton
                v-model="filter.raritySelected"
                :options="filter.rarity"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
        </div>
      </Panel>
      <div class="flex justify-center items-center pt-5">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="artifactSearchKeyword" placeholder="搜尋聖遺物" />
          <InputIcon
            class="pi pi-times"
            @click="artifactSearchKeyword = ''"
            v-if="artifactSearchKeyword"
          />
        </IconField>
      </div>
    </div>
    <div class="flex flex-wrap justify-center gap-5">
      <ArtifactBlock
        v-for="(artifact, index) in filteredArtifactList"
        :key="index"
        :data="artifact"
      />
    </div>
  </main>
</template>

<style scoped></style>
