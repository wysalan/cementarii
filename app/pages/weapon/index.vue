<script setup lang="ts">
import { siteConfig } from "@/site.config";
import weaponList from "@/data/weaponList.json";

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

function getStatText(mainStatType: string) {
  if (mainStatType) {
    switch (mainStatType) {
      case "FIGHT_PROP_ATTACK_PERCENT":
        return "攻擊力";
      case "FIGHT_PROP_DEFENSE_PERCENT":
        return "防禦力";
      case "FIGHT_PROP_HP_PERCENT":
        return "生命值";
      case "FIGHT_PROP_PHYSICAL_ADD_HURT":
        return "物理傷害加成";
      case "FIGHT_PROP_ELEMENT_MASTERY":
        return "元素精通";
      case "FIGHT_PROP_CHARGE_EFFICIENCY":
        return "元素充能效率";
      case "FIGHT_PROP_CRITICAL":
        return "暴擊率";
      case "FIGHT_PROP_CRITICAL_HURT":
        return "暴擊傷害";
      default:
        return "unknown";
    }
  }
  return "unknown";
}

const filteredWeaponList = computed(() => {
  return weaponList
    .filter((weapon) => {
      return (
        (!filter.value.raritySelected?.length ||
          filter.value.raritySelected.includes(weapon.rarity.toString())) &&
        (!filter.value.weaponSelected?.length ||
          filter.value.weaponSelected.includes(weapon.weaponText)) &&
        (!filter.value.statSelected?.length ||
          filter.value.statSelected?.includes(getStatText(weapon.mainStatType))) &&
        (!weaponSearchKeyword.value ||
          weapon.name
            .toLowerCase()
            .replace(" ", "")
            .includes(weaponSearchKeyword.value.toLowerCase()) ||
          weapon.slug
            .replace("-", "")
            .includes(weaponSearchKeyword.value.toLowerCase().replace(" ", "")))
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
          if (loadLimit.value < weaponList.length) {
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
        <UIFilterChips label="類型" :options="filter.weapon!" v-model="filter.weaponSelected" />
        <UIFilterChips label="副詞條" :options="filter.stat!" v-model="filter.statSelected" />
      </UIFilterPanel>
      <UISearchBar v-model="weaponSearchKeyword" placeholder="搜尋武器" />
    </div>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <WeaponBlock v-for="(weapon, index) in filteredWeaponList" :key="index" :data="weapon" />
    </div>
    <div ref="loadMoreTrigger"></div>
  </main>
</template>

<style scoped></style>
