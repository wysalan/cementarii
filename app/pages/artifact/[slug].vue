<script setup lang="ts">
import { useRoute } from "vue-router";
import useDataParser from "@/composables/useDataParser";

definePageMeta({
  layout: "detail",
});

const { slug } = useRoute().params;
const { data: artifactData, status, error } = await useFetch(`/api/artifact/${slug}`);
const { parseDescriptionText } = useDataParser();

const maxRarity: number | undefined = artifactData.value
  ? artifactData.value.rarity_list?.[artifactData.value.rarity_list.length - 1]
  : 0;

const currentPart = ref("flower");
const partList = ref(["flower", "plume", "sands", "goblet", "circlet"]);

// Functions
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

function getArtifactIcon(partName: string | undefined) {
  if (partName) {
    switch (partName) {
      case "flower":
        return "UI_Icon_Equip_Bracer";
      case "plume":
        return "UI_Icon_Equip_Necklace";
      case "sands":
        return "UI_Icon_Equip_Shoes";
      case "goblet":
        return "UI_Icon_Equip_Ring";
      case "circlet":
        return "UI_Icon_Equip_Dress";
    }
  }
}
</script>

<template>
  <main class="container mx-auto max-lg:mb-5 mt-3" v-if="status === 'success' && artifactData">
    <div class="grid grid-cols-1 lg:grid-cols-10 gap-5 mx-5">
      <div class="flex flex-col lg:col-span-4 lg:h-90dvh lg:overflow-y-auto">
        <div class="flex px-5 py-2 bg-#bc6832 rounded-t-lg">
          <p class="text-xl font-semibold text-white">
            {{
              artifactData.relic_parts?.[currentPart as keyof typeof artifactData.relic_parts]?.name
            }}
          </p>
        </div>
        <div class="flex justify-center items-center relative" :class="getBgColor(maxRarity)">
          <NuxtImg
            :src="
              'https://assets.wysalan.com/cementarii/relic-icon/' +
              artifactData.imgaes?.[currentPart as keyof typeof artifactData.imgaes] +
              '.webp'
            "
            width="128"
            height="128"
            class="h-50 w-50"
          />
        </div>
        <div class="flex flex-col gap-5 bg-#ece5d8 p-5 rounded-b-lg h-full">
          <div class="flex flex-row items-center">
            <h2 class="text-2xl font-semibold">
              {{ artifactData.name }}
            </h2>
            <p class="text-2xl font-bold select-none">．</p>
            <p class="text-2xl font-semibold opacity-50">
              {{
                artifactData.relic_parts?.[currentPart as keyof typeof artifactData.relic_parts]
                  ?.relicText
              }}
            </p>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex flex-row items-center gap-2">
              <Button
                v-for="part in partList"
                @click="currentPart = part"
                :severity="currentPart === part ? 'contrast' : 'secondary'"
                class="min-w-fit"
              >
                <NuxtImg
                  :src="
                    'https://assets.wysalan.com/cementarii/ui-icon/' +
                    getArtifactIcon(part) +
                    '.png'
                  "
                  width="24"
                  height="24"
                />
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-5">
              <div class="flex flex-col justify-center gap-1" v-if="artifactData.effect_1pcs">
                <p class="text-xl font-semibold">1 件套裝</p>
                <p class="text-lg">{{ artifactData.effect_1pcs }}</p>
              </div>
              <div class="flex flex-col justify-center gap-1" v-if="artifactData.effect_2pcs">
                <p class="text-xl font-semibold">2 件套裝</p>
                <p class="text-lg">{{ artifactData.effect_2pcs }}</p>
              </div>
              <div class="flex flex-col justify-center gap-1" v-if="artifactData.effect_4pcs">
                <p class="text-xl font-semibold">4 件套裝</p>
                <p class="text-lg">{{ artifactData.effect_4pcs }}</p>
              </div>
            </div>
          </div>
          <div>
            <p class="text-lg font-semibold opacity-50">
              {{
                artifactData.relic_parts?.[currentPart as keyof typeof artifactData.relic_parts]
                  ?.description
              }}
            </p>
          </div>
        </div>
      </div>
      <!-- 右側故事 -->
      <div class="flex flex-col lg:col-span-6 rounded-lg bg-zinc-200 lg:h-90dvh lg:overflow-y-auto">
        <div class="flex flex-col gap-5 p-5">
          <p class="text-xl font-semibold opacity-80">聖遺物故事</p>
          <div
            class="text-lg"
            v-html="
              parseDescriptionText(
                artifactData.relic_parts?.[currentPart as keyof typeof artifactData.relic_parts]
                  ?.story,
              )
            "
          ></div>
        </div>
      </div>
    </div>
  </main>
  <main v-else>
    <div class="container mx-auto pt-5 pb-10">
      <p class="text-lg">目前無此聖遺物資料，或是連接資料庫時發生錯誤</p>
      <p class="text-lg" v-if="error">
        錯誤訊息：{{ error?.statusMessage }} (Status code: {{ error?.statusCode }})
      </p>
    </div>
  </main>
</template>

<style scoped></style>
