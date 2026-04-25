<script setup lang="ts">
import materialList from "@/data/materialList.json";

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
  return materialList.filter((material) => {
    return (
      (!filter.value.raritySelected?.length ||
        filter.value.raritySelected.includes(material.rarity.toString())) &&
      (!filter.value.characterWeaponSelected?.length ||
        filter.value.characterWeaponSelected.includes(material.typeText)) &&
      (!filter.value.localSpecialtySelected?.length ||
        filter.value.localSpecialtySelected.includes(material.typeText.replace("區域特產", ""))) &&
      (!filter.value.otherSelected?.length ||
        filter.value.otherSelected.includes(material.typeText)) &&
      (!materialSearchKeyword.value ||
        material.name.CHT.includes(materialSearchKeyword.value.toLowerCase()) ||
        material.name.EN.toLowerCase()
          .replace(" ", "")
          .includes(materialSearchKeyword.value.toLowerCase().replace(" ", "")))
    );
  });
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
                v-model="filter.raritySelected"
                :options="filter.rarity"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">角色與武器</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="filter.characterWeaponSelected"
                :options="filter.characterWeapon"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">區域特產</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="filter.localSpecialtySelected"
                :options="filter.localSpecialty"
                class="flex flex-wrap justify-center items-center"
                multiple
              />
            </div>
          </div>
          <div class="flex flex-col justify-center items-center gap-2">
            <p class="text-lg font-semibold">其他</p>
            <div class="flex flex-col md:flex-row gap-2">
              <SelectButton
                v-model="filter.otherSelected"
                :options="filter.other"
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
          <InputText v-model="materialSearchKeyword" placeholder="搜尋素材" />
          <InputIcon
            class="pi pi-times"
            @click="materialSearchKeyword = ''"
            v-if="materialSearchKeyword"
          />
        </IconField>
      </div>
    </div>
    <div class="flex flex-wrap justify-center gap-5">
      <LazyMaterialBlock
        v-for="(material, index) in filteredMaterialList"
        :key="index"
        :data="material"
      />
    </div>
  </main>
</template>

<style scoped></style>
