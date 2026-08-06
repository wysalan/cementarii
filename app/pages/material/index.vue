<script setup lang="ts">
import { siteConfig } from "@/site.config";
import materialList from "@/data/materialList.json";

useSeoMeta({
  title: `素材 | ${siteConfig.title}`,
});

const loadLimit = ref(50);
const loadMoreTrigger = useTemplateRef("loadMoreTrigger");
const materialSearchKeyword = ref("");

const filter = ref<Record<string, string[]>>({
  rarity: ["1", "2", "3", "4", "5"],
  raritySelected: [],
  characterWeapon: [
    "角色經驗素材",
    "角色與武器培養素材",
    "角色培養素材",
    "角色突破素材",
    "角色天賦素材",
    "武器突破素材",
  ],
  characterWeaponSelected: [],
  localSpecialty: ["蒙德", "璃月", "稻妻", "須彌", "楓丹", "納塔", "挪德卡萊"],
  localSpecialtySelected: [],
  other: [
    "素材",
    "消耗品",
    "普通兌換券",
    "高級兌換券",
    "祈願道具",
    "限定祈願道具",
    "功能開啟憑證",
    "通用貨幣",
    "稀有貨幣",
  ],
  otherSelected: [],
});

const filteredMaterialList = computed(() => {
  return materialList
    .filter((material) => {
      return (
        (!filter.value.raritySelected?.length ||
          filter.value.raritySelected.includes(material.rarity.toString())) &&
        (!filter.value.characterWeaponSelected?.length ||
          filter.value.characterWeaponSelected.includes(material.typeText)) &&
        (!filter.value.localSpecialtySelected?.length ||
          filter.value.localSpecialtySelected.includes(
            material.typeText.replace("區域特產", ""),
          )) &&
        (!filter.value.otherSelected?.length ||
          filter.value.otherSelected.includes(material.typeText)) &&
        (!materialSearchKeyword.value ||
          material.name.CHT.includes(materialSearchKeyword.value.toLowerCase()) ||
          material.name.EN.toLowerCase()
            .replace(" ", "")
            .includes(materialSearchKeyword.value.toLowerCase().replace(" ", "")))
      );
    })
    .slice(0, loadLimit.value);
});

const isFiltered = computed(() => {
  return (
    filter.value.raritySelected?.length ||
    filter.value.characterWeaponSelected?.length ||
    filter.value.localSpecialtySelected?.length ||
    filter.value.otherSelected?.length
  );
});

const removeAllFilter = () => {
  filter.value.raritySelected = [];
  filter.value.characterWeaponSelected = [];
  filter.value.localSpecialtySelected = [];
  filter.value.otherSelected = [];
};

watch([isFiltered, materialSearchKeyword], () => {
  if (!isFiltered.value || !materialSearchKeyword.value.length) {
    loadLimit.value = 50;
  }
});

onMounted(() => {
  if (loadMoreTrigger.value) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (loadLimit.value < materialList.length) {
            loadLimit.value += 50;
          }
        }
      });
    });
    observer.observe(loadMoreTrigger.value);
  }
});
</script>

<template>
  <main class="container mx-auto pt-5 pb-10 px-4">
    <div class="flex flex-col items-center pb-5 gap-5">
      <UIFilterPanel :is-filtered="!!isFiltered" @clear="removeAllFilter" class="max-w-3xl">
        <UIFilterChips label="星級" :options="filter.rarity!" v-model="filter.raritySelected" />
        <UIFilterChips
          label="角色與武器"
          :options="filter.characterWeapon!"
          v-model="filter.characterWeaponSelected"
        />
        <UIFilterChips
          label="區域特產"
          :options="filter.localSpecialty!"
          v-model="filter.localSpecialtySelected"
        />
        <UIFilterChips label="其他" :options="filter.other!" v-model="filter.otherSelected" />
      </UIFilterPanel>
      <UISearchBar v-model="materialSearchKeyword" placeholder="搜尋素材" />
    </div>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <MaterialBlock
        v-for="(material, index) in filteredMaterialList"
        :key="index"
        :data="material"
      />
    </div>
    <div ref="loadMoreTrigger"></div>
  </main>
</template>

<style scoped></style>
