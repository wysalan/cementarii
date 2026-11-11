<script setup lang="ts">
import { siteConfig } from "@/site.config";

const { locale, t } = useI18n();
const { data, error } = await useFetch("/api/weapon", { query: { locale } });
const weaponList = computed(() => data.value ?? []);

useSeoMeta({
  title: `武器 | ${siteConfig.title}`,
});

const loadLimit = ref(50);
const loadMoreTrigger = useTemplateRef("loadMoreTrigger");
const weaponSearchKeyword = ref("");

const filter = ref<Record<string, string[]>>({
  rarity: ["1", "2", "3", "4", "5"],
  raritySelected: [],
  weapon: ["單手劍", "雙手劍", "法器", "長柄武器", "弓"],
  weaponSelected: [],
  stat: [
    "攻擊力",
    "防禦力",
    "生命值",
    "元素充能效率",
    "元素精通",
    "暴擊率",
    "暴擊傷害",
    "物理傷害加成",
  ],
  statSelected: [],
});

const filteredWeaponList = computed(() => {
  const keyword = weaponSearchKeyword.value.toLowerCase().replaceAll(" ", "");
  return weaponList.value
    .filter((weapon) => {
      return (
        (!filter.value.raritySelected?.length ||
          filter.value.raritySelected.includes(weapon.rarity.toString())) &&
        (!filter.value.weaponSelected?.length ||
          filter.value.weaponSelected.includes(t(`weaponType.${weapon.weaponType}`))) &&
        (!filter.value.statSelected?.length ||
          filter.value.statSelected.includes(
            weapon.substatType ? t(`fightProp.${weapon.substatType}`) : "",
          )) &&
        (!keyword ||
          weapon.name.toLowerCase().replaceAll(" ", "").includes(keyword) ||
          weapon.slug.replaceAll("-", "").includes(keyword))
      );
    })
    .sort((a, b) => {
      if (a.rarity !== b.rarity) {
        return b.rarity - a.rarity;
      } else {
        if (a.weaponType === b.weaponType) {
          return b.id - a.id;
        } else {
          return a.id - b.id;
        }
      }
    })
    .slice(0, loadLimit.value);
});

const isFiltered = computed(() => {
  return (
    filter.value.raritySelected?.length ||
    filter.value.weaponSelected?.length ||
    filter.value.statSelected?.length
  );
});

const removeAllFilter = () => {
  filter.value.raritySelected = [];
  filter.value.weaponSelected = [];
  filter.value.statSelected = [];
};

watch([isFiltered, weaponSearchKeyword], () => {
  if (!isFiltered.value || !weaponSearchKeyword.value.length) {
    loadLimit.value = 50;
  }
});

onMounted(() => {
  if (loadMoreTrigger.value) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (loadLimit.value < weaponList.value.length) {
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
      <div class="gi-panel w-full max-w-3xl p-4 flex items-center gap-2">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1">
          <UIFilterSelect label="星級" :options="filter.rarity!" v-model="filter.raritySelected" />
          <UIFilterSelect label="類型" :options="filter.weapon!" v-model="filter.weaponSelected" />
          <UIFilterSelect label="副詞條" :options="filter.stat!" v-model="filter.statSelected" />
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
      <UISearchBar v-model="weaponSearchKeyword" placeholder="搜尋武器" />
    </div>
    <p v-if="error" role="alert" class="text-center">資料暫時無法取得，請稍後再試。</p>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <WeaponBlock v-for="weapon in filteredWeaponList" :key="weapon.id" :data="weapon" />
    </div>
    <div ref="loadMoreTrigger"></div>
  </main>
</template>

<style scoped></style>
