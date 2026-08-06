<script setup lang="ts">
import { siteConfig } from "@/site.config";
import characterList from "@/data/characterList.json";
import { useUserStore } from "@/stores/User";
const store = useUserStore();

useSeoMeta({
  title: `角色 | ${siteConfig.title}`,
});

const loadLimit = ref(100);
const loadMoreTrigger = useTemplateRef("loadMoreTrigger");
const characterSearchKeyword = ref("");

const characterFilter = ref<Record<string, string[]>>({
  rarity: ["4", "5"],
  raritySelected: [],
  element: ["火", "水", "雷", "冰", "風", "岩", "草"],
  elementSelected: [],
  weapon: ["單手劍", "雙手劍", "法器", "長柄武器", "弓"],
  weaponSelected: [],
  region: ["蒙德", "璃月", "稻妻", "須彌", "楓丹", "納塔", "挪德卡萊", "至冬"],
  regionSelected: [],
  identity: ["降臨者", "奇偶", "遊俠"],
  identitySelected: [],
  body: ["女孩", "少女", "成女", "少年", "成男"],
  bodySelected: [],
  birthMonth: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  birthMonthSelected: [],
});

function getBodyText(bodyType: string) {
  if (bodyType) {
    switch (bodyType) {
      case "BODY_LOLI":
        return "女孩";
      case "BODY_GIRL":
        return "少女";
      case "BODY_LADY":
        return "成女";
      case "BODY_BOY":
        return "少年";
      case "BODY_MALE":
        return "成男";
      default:
        return "unknown";
    }
  }
  return "unknown";
}

const filteredCharacterList = computed(() => {
  return characterList
    .filter((character) => {
      return (
        (!characterFilter.value.raritySelected?.length ||
          characterFilter.value.raritySelected.includes(character.rarity.toString())) &&
        (!characterFilter.value.elementSelected?.length ||
          characterFilter.value.elementSelected.includes(character.elementText)) &&
        (!characterFilter.value.weaponSelected?.length ||
          characterFilter.value.weaponSelected.includes(character.weaponText)) &&
        (!characterFilter.value.regionSelected?.length ||
          characterFilter.value.regionSelected.includes(character.region)) &&
        (!characterFilter.value.identitySelected?.length ||
          characterFilter.value.identitySelected?.includes(character.region)) &&
        (!characterSearchKeyword.value ||
          character.name["CHT"]
            .toLowerCase()
            .replace(" ", "")
            .includes(characterSearchKeyword.value.toLowerCase()) ||
          character.name["EN"]
            .toLowerCase()
            .replace(" ", "")
            .includes(characterSearchKeyword.value.toLowerCase().replace(" ", ""))) &&
        (!characterFilter.value.bodySelected?.length ||
          characterFilter.value.bodySelected.includes(getBodyText(character.bodyType))) &&
        (!characterFilter.value.birthMonthSelected?.length ||
          characterFilter.value.birthMonthSelected.includes(
            character.birthday.split("/")[0] || "0",
          ))
      );
    })
    .toReversed()
    .slice(0, loadLimit.value);
});

const isFiltered = computed(() => {
  return (
    characterFilter.value.raritySelected?.length ||
    characterFilter.value.elementSelected?.length ||
    characterFilter.value.weaponSelected?.length ||
    characterFilter.value.regionSelected?.length ||
    characterFilter.value.bodySelected?.length ||
    characterFilter.value.identitySelected?.length ||
    characterFilter.value.birthMonthSelected?.length
  );
});

const removeAllFilter = () => {
  characterFilter.value.raritySelected = [];
  characterFilter.value.elementSelected = [];
  characterFilter.value.weaponSelected = [];
  characterFilter.value.regionSelected = [];
  characterFilter.value.bodySelected = [];
  characterFilter.value.identitySelected = [];
  characterFilter.value.birthMonthSelected = [];
};

watch([isFiltered, characterSearchKeyword], () => {
  if (!isFiltered.value || !characterSearchKeyword.value.length) {
    loadLimit.value = 100;
  }
});

onMounted(() => {
  if (loadMoreTrigger.value) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (loadLimit.value < characterList.length) {
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
        <UIFilterChips
          label="星級"
          :options="characterFilter.rarity!"
          v-model="characterFilter.raritySelected"
        />
        <UIFilterChips
          label="元素"
          :options="characterFilter.element!"
          v-model="characterFilter.elementSelected"
        />
        <UIFilterChips
          label="武器"
          :options="characterFilter.weapon!"
          v-model="characterFilter.weaponSelected"
        />
        <UIFilterChips
          label="地區"
          :options="characterFilter.region!"
          v-model="characterFilter.regionSelected"
        />
        <USeparator label="進階篩選" />
        <UIFilterChips
          label="體型"
          :options="characterFilter.body!"
          v-model="characterFilter.bodySelected"
        />
        <UIFilterChips
          label="特殊身分"
          :options="characterFilter.identity!"
          v-model="characterFilter.identitySelected"
        />
        <UIFilterChips
          label="生日月份"
          :options="characterFilter.birthMonth!"
          v-model="characterFilter.birthMonthSelected"
        />
        <USeparator label="其他設定" />
        <div class="flex flex-col md:flex-row justify-center items-center gap-2">
          <p class="text-center">將大頭照切換為衣裝版本</p>
          <USwitch v-model="store.useCostumeIcon" />
        </div>
      </UIFilterPanel>
      <UISearchBar v-model="characterSearchKeyword" placeholder="搜尋角色" />
    </div>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <CharacterBlock v-for="(char, index) in filteredCharacterList" :key="index" :data="char" />
    </div>
    <div ref="loadMoreTrigger"></div>
  </main>
</template>

<style scoped></style>
