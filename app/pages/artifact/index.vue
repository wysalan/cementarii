<script setup lang="ts">
import { siteConfig } from "@/site.config";

const { locale } = useI18n();
const { data, error } = await useFetch("/api/artifact", { query: { locale } });
const artifactList = computed(() => data.value ?? []);

useSeoMeta({
  title: `聖遺物 | ${siteConfig.title}`,
});

const artifactSearchKeyword = ref("");

const filter = ref<Record<string, string[]>>({
  rarity: ["3", "4", "5"],
  raritySelected: [],
});

const filteredArtifactList = computed(() => {
  const keyword = artifactSearchKeyword.value.toLowerCase().replaceAll(" ", "");
  return artifactList.value
    .filter((artifact) => {
      return (
        (!filter.value.raritySelected?.length ||
          filter.value.raritySelected.includes(artifact.maxRarity.toString())) &&
        (!keyword ||
          artifact.name.toLowerCase().replaceAll(" ", "").includes(keyword) ||
          artifact.slug.replaceAll("-", "").includes(keyword))
      );
    })
    .sort((a, b) => b.maxRarity - a.maxRarity || b.id - a.id);
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
      <div class="gi-panel w-full max-w-3xl p-4 flex items-center gap-2">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
          <UIFilterSelect
            label="最大星級"
            :options="filter.rarity!"
            v-model="filter.raritySelected"
          />
        </div>
        <UTooltip text="清除篩選條件" v-if="isFiltered">
          <UButton
            icon="i-lucide-filter-x"
            variant="ghost"
            class="hover:bg-gold-400/15 hover:text-gold-700 dark:hover:text-gold-300 transition-colors"
            aria-label="清除篩選條件"
            @click="removeAllFilter"
          />
        </UTooltip>
      </div>
      <UISearchBar v-model="artifactSearchKeyword" placeholder="搜尋聖遺物" />
    </div>
    <p v-if="error" role="alert" class="text-center">資料暫時無法取得，請稍後再試。</p>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <ArtifactBlock v-for="artifact in filteredArtifactList" :key="artifact.id" :data="artifact" />
    </div>
  </main>
</template>

<style scoped></style>
