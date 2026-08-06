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
  <main class="container mx-auto pt-5 pb-10 px-4">
    <div class="flex flex-col items-center pb-5 gap-5">
      <UIFilterPanel :is-filtered="!!isFiltered" @clear="removeAllFilter" class="max-w-3xl">
        <UIFilterChips label="最大星級" :options="filter.rarity!" v-model="filter.raritySelected" />
      </UIFilterPanel>
      <UISearchBar v-model="artifactSearchKeyword" placeholder="搜尋聖遺物" />
    </div>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <ArtifactBlock
        v-for="(artifact, index) in filteredArtifactList"
        :key="index"
        :data="artifact"
      />
    </div>
  </main>
</template>

<style scoped></style>
