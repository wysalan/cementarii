<script setup lang="ts">
import { siteConfig } from "@/site.config";
import { useUserStore } from "@/stores/User";
const store = useUserStore();
const { locale, t } = useI18n();

const { data, error } = await useFetch("/api/character", { query: { locale } });
const characterList = computed(() => data.value ?? []);

useSeoMeta({
  title: `角色 | ${siteConfig.title}`,
});

const loadLimit = ref(100);
const loadMoreTrigger = useTemplateRef("loadMoreTrigger");
const characterSearchKeyword = ref("");
const advancedOpen = ref(false);
const enhancedOnly = ref(false);

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

const BODY_TEXT: Record<string, string> = {
  loli: "女孩",
  girl: "少女",
  lady: "成女",
  boy: "少年",
  male: "成男",
};

function getIdentity(character: { slug: string; association: string }) {
  if (character.slug.startsWith("manekin")) return "奇偶";
  if (character.association === "ASSOC_MAINACTOR") return "降臨者";
  if (character.association === "ASSOC_RANGER") return "遊俠";
  return "";
}

const filteredCharacterList = computed(() => {
  const keyword = characterSearchKeyword.value.toLowerCase().replaceAll(" ", "");
  return characterList.value
    .filter((character) => {
      return (
        (!enhancedOnly.value || !!character.enhancedIn) &&
        (!characterFilter.value.raritySelected?.length ||
          characterFilter.value.raritySelected.includes(character.rarity.toString())) &&
        (!characterFilter.value.elementSelected?.length ||
          characterFilter.value.elementSelected.includes(
            character.element ? t(`element.${character.element}`) : "",
          )) &&
        (!characterFilter.value.weaponSelected?.length ||
          characterFilter.value.weaponSelected.includes(t(`weaponType.${character.weaponType}`))) &&
        (!characterFilter.value.regionSelected?.length ||
          characterFilter.value.regionSelected.includes(character.region ?? "")) &&
        (!characterFilter.value.identitySelected?.length ||
          characterFilter.value.identitySelected.includes(getIdentity(character))) &&
        (!keyword ||
          character.name.toLowerCase().replaceAll(" ", "").includes(keyword) ||
          character.slug.replaceAll("-", "").includes(keyword)) &&
        (!characterFilter.value.bodySelected?.length ||
          characterFilter.value.bodySelected.includes(BODY_TEXT[character.bodyType] ?? "")) &&
        (!characterFilter.value.birthMonthSelected?.length ||
          characterFilter.value.birthMonthSelected.includes(String(character.birthMonth ?? 0)))
      );
    })
    .slice(0, loadLimit.value);
});

const isFiltered = computed(() => {
  return (
    enhancedOnly.value ||
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
  enhancedOnly.value = false;
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
          if (loadLimit.value < characterList.value.length) {
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
      <div class="gi-panel w-full max-w-3xl p-4 flex flex-col">
        <div class="flex items-center gap-2">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
            <UIFilterSelect
              label="星級"
              :options="characterFilter.rarity!"
              v-model="characterFilter.raritySelected"
            />
            <UIFilterSelect
              label="元素"
              :options="characterFilter.element!"
              v-model="characterFilter.elementSelected"
            />
            <UIFilterSelect
              label="武器"
              :options="characterFilter.weapon!"
              v-model="characterFilter.weaponSelected"
            />
            <UIFilterSelect
              label="地區"
              :options="characterFilter.region!"
              v-model="characterFilter.regionSelected"
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
          <UTooltip :text="advancedOpen ? '收合' : '顯示更多'">
            <UButton
              icon="i-lucide-chevron-down"
              variant="ghost"
              aria-label="展開進階篩選與其他設定"
              :aria-expanded="advancedOpen"
              :class="{ 'rotate-180': advancedOpen }"
              class="transition-[transform,background-color,color] hover:bg-gold-400/15 hover:text-gold-700 dark:hover:text-gold-300"
              @click="advancedOpen = !advancedOpen"
            />
          </UTooltip>
        </div>
        <div
          class="grid transition-[grid-template-rows] duration-300 ease-in-out"
          :class="advancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          :inert="!advancedOpen"
        >
          <div class="overflow-hidden">
            <div class="flex flex-col gap-4 pt-4">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <UIFilterSelect
                  label="體型"
                  :options="characterFilter.body!"
                  v-model="characterFilter.bodySelected"
                />
                <UIFilterSelect
                  label="特殊身分"
                  :options="characterFilter.identity!"
                  v-model="characterFilter.identitySelected"
                />
                <UIFilterSelect
                  label="生日月份"
                  :options="characterFilter.birthMonth!"
                  v-model="characterFilter.birthMonthSelected"
                />
              </div>
              <USeparator label="其他設定" />
              <div class="flex flex-col md:flex-row justify-center items-center gap-2">
                <p class="text-center">只顯示已強化角色</p>
                <USwitch v-model="enhancedOnly" />
              </div>
              <div class="flex flex-col md:flex-row justify-center items-center gap-2">
                <p class="text-center">將大頭照切換為衣裝版本</p>
                <USwitch v-model="store.useCostumeIcon" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <UISearchBar v-model="characterSearchKeyword" placeholder="搜尋角色" />
    </div>
    <p v-if="error" role="alert" class="text-center">資料暫時無法取得，請稍後再試。</p>
    <div class="flex flex-wrap justify-center gap-4 sm:gap-5">
      <CharacterBlock v-for="char in filteredCharacterList" :key="char.slug" :data="char" />
    </div>
    <div ref="loadMoreTrigger"></div>
  </main>
</template>

<style scoped></style>
