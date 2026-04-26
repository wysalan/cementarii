<script setup lang="ts">
import materialList from "@/data/materialList.json";

interface Item {
  id: number;
  name: string;
  count: number;
}

interface MaterialData {
  id: number;
  name: {
    CHT: string;
    EN: string;
  };
  category: string;
  rarity: number;
  typeText: string;
  description: string;
  sources: string[];
  icon: string;
}

const { data } = defineProps<{ data: Item }>();
const materialData: MaterialData | undefined = materialList.find(
  (material) => material.id === data.id,
);
const { parseVoiceOverContent } = useDataParser();
import { useUserStore } from "@/stores/User";
const store = useUserStore();
const dialogVisible = ref(false);

function getBgColor(rarity: number | undefined) {
  if (rarity) {
    switch (rarity) {
      case 1:
        return "bg-linear-to-br from-#6a6d74 to-#868586";
      case 2:
        return "bg-linear-to-br from-#4b6c67 to-#519072";
      case 3:
        return "bg-linear-to-br from-#567496 to-#5392b8";
      case 4:
        return "bg-linear-to-br from-#5e5789 to-#9c75b7";
      case 5:
        return "bg-linear-to-br from-#945c2c to-#b27330";
    }
  }
}

function getNameBarColor(rarity: number | undefined) {
  if (rarity) {
    switch (rarity) {
      case 1:
        return "bg-#72778b";
      case 2:
        return "bg-#2a9072";
      case 3:
        return "bg-#5180cb";
      case 4:
        return "bg-#a156e0";
      case 5:
        return "bg-#bc6832";
    }
  }
}
</script>

<template>
  <NuxtLink
    class="flex flex-col justify-center items-center bg-zinc-100/80 ring-2 ring-zinc-300 backdrop-blur-md rounded-md min-w-20 h-full m-1 cursor-pointer"
    v-tooltip.top="data.name"
    @click="dialogVisible = !dialogVisible"
  >
    <NuxtImg
      :src="'https://assets.wysalan.com/cementarii/item-icon/UI_ItemIcon_' + data.id + '.webp'"
      :alt="data.name"
      class="w-15 h-15"
      placeholder
    />
    <div class="flex flex-col justify-center items-center h-10 w-full">
      <p class="text-black">{{ data.count }}</p>
    </div>
  </NuxtLink>
  <Dialog v-model:visible="dialogVisible" modal :header="data.name" class="w-90vw lg:w-35vw">
    <template #container="{ closeCallback }">
      <div class="flex flex-col h-fit rounded-md">
        <div
          class="flex flex-row justify-between items-center px-5 py-2 rounded-t-lg"
          :class="getNameBarColor(materialData?.rarity)"
        >
          <p class="text-xl font-semibold text-white">
            {{ materialData?.name.CHT }}
          </p>
          <Button
            icon="pi pi-times"
            severity="secondary"
            @click="closeCallback"
            aria-label="關閉視窗"
            class="rounded-xl!"
          ></Button>
        </div>
        <div
          class="flex justify-center items-center h-60 md:h-50 relative"
          :class="getBgColor(materialData?.rarity)"
        >
          <NuxtImg
            :src="'https://assets.wysalan.com/cementarii/item-icon/' + materialData?.icon + '.webp'"
            class="w-45 h-45 max-md:py-5 object-contain"
          />
          <div class="absolute top-3 left-5 flex">
            <p class="select-none text-white font-semibold opacity-90 text-lg">
              {{ materialData?.typeText }}
            </p>
          </div>
          <div class="absolute bottom-3 left-5 flex flex-row gap-1">
            <p
              class="select-none text-yellow font-semibold text-lg"
              v-for="n in materialData?.rarity"
            >
              ★
            </p>
          </div>
        </div>
        <div class="flex flex-col gap-5 bg-#ece5d8 p-5 rounded-b-lg h-full dark:text-black">
          <div class="flex flex-col gap-3">
            <p
              v-html="
                parseVoiceOverContent(materialData?.description, store.name, store.playerGender)
              "
              class="text-lg opacity-80"
            ></p>
          </div>
          <div class="flex flex-col gap-3" v-if="materialData?.sources.length">
            <p class="font-semibold">來源</p>
            <div
              class="rounded-md border-2 border-#d2ccc1 p-3"
              v-for="source in materialData?.sources"
            >
              <p>{{ source }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped></style>
