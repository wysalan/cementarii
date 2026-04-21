<script setup lang="ts">
import weaponList from "@/data/weaponList.json";

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
    });
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
</script>

<template>
  <main class="container mx-auto pt-5 pb-10">
    <div class="flex flex-col items-center pb-5">
      <Panel toggleable collapsed class="mx-3 w-75vw md:w-full rounded-xl">
        <template #header>
          <div class="flex flex-row items-center gap-2">
            <p class="font-semibold">篩選</p>
            <Button
              label="清除所有篩選條件"
              rounded
              class="h-7"
              v-if="isFiltered"
              @click="removeAllFilter"
            />
          </div>
        </template>
        <div class="flex flex-col gap-5">
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">星級</p>
            <div class="flex flex-row gap-2">
              <SelectButton
                v-model="filter.raritySelected"
                :options="filter.rarity"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">類型</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="filter.weaponSelected"
                :options="filter.weapon"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">副詞條</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="filter.statSelected"
                :options="filter.stat"
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
          <InputText v-model="weaponSearchKeyword" placeholder="搜尋武器" />
          <InputIcon
            class="pi pi-times"
            @click="weaponSearchKeyword = ''"
            v-if="weaponSearchKeyword"
          />
        </IconField>
      </div>
    </div>
    <div class="flex flex-wrap justify-center gap-5">
      <WeaponBlock v-for="(weapon, index) in filteredWeaponList" :key="index" :data="weapon" />
    </div>
  </main>
</template>

<style scoped></style>
