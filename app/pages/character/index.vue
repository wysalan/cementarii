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
          characterFilter.value.bodySelected.includes(getBodyText(character.bodyType)))
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
    characterFilter.value.identitySelected?.length
  );
});

const removeAllFilter = () => {
  characterFilter.value.raritySelected = [];
  characterFilter.value.elementSelected = [];
  characterFilter.value.weaponSelected = [];
  characterFilter.value.regionSelected = [];
  characterFilter.value.bodySelected = [];
  characterFilter.value.identitySelected = [];
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
            <p class="text-lg font-semibold">星級</p>
            <div class="flex flex-row gap-2">
              <SelectButton
                v-model="characterFilter.raritySelected"
                :options="characterFilter.rarity"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">元素</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="characterFilter.elementSelected"
                :options="characterFilter.element"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">武器</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="characterFilter.weaponSelected"
                :options="characterFilter.weapon"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">地區</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="characterFilter.regionSelected"
                :options="characterFilter.region"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <Panel header="進階篩選" toggleable collapsed class="mx-3 rounded-xl">
            <div class="flex flex-col gap-5">
              <div class="flex flex-col justify-center items-center gap-2">
                <p class="text-lg font-semibold">體型</p>
                <div class="flex flex-col md:flex-row gap-2 w-fit">
                  <SelectButton
                    v-model="characterFilter.bodySelected"
                    :options="characterFilter.body"
                    class="flex flex-wrap justify-center items-center"
                    multiple
                  />
                </div>
              </div>
              <div class="flex flex-col justify-center items-center gap-2">
                <p class="text-lg font-semibold">特殊身分</p>
                <div class="flex flex-col md:flex-row gap-2 w-fit">
                  <SelectButton
                    v-model="characterFilter.identitySelected"
                    :options="characterFilter.identity"
                    class="flex flex-wrap justify-center items-center"
                    multiple
                  />
                </div>
              </div>
            </div>
          </Panel>
          <Panel header="其他設定" toggleable collapsed class="mx-3 rounded-xl">
            <div class="flex flex-col md:flex-row justify-center items-center gap-2">
              <p class="text-center">將大頭照切換為衣裝版本</p>
              <ToggleSwitch v-model="store.useCostumeIcon" />
            </div>
          </Panel>
        </div>
      </Panel>
      <div class="flex justify-center items-center pt-5">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="characterSearchKeyword" placeholder="搜尋角色" />
          <InputIcon
            class="pi pi-times"
            @click="characterSearchKeyword = ''"
            v-if="characterSearchKeyword"
          />
        </IconField>
      </div>
    </div>
    <div class="flex flex-wrap justify-center gap-5">
      <CharacterBlock v-for="(char, index) in filteredCharacterList" :key="index" :data="char" />
    </div>
    <div ref="loadMoreTrigger"></div>
  </main>
</template>

<style scoped></style>
